package httpapi

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// scoped runs fn in a transaction that Postgres row-level security sees as the caller: their user
// id and what they may handle. Every query on customers' own rows goes through it.
func (s *Server) scoped(ctx context.Context, fn func(q *dbq.Queries) error) error {
	return s.scopedAs(ctx, nil, fn)
}

// scopedAs is scoped, also holding an order's link (its token digest), as a guest does.
func (s *Server) scopedAs(ctx context.Context, orderToken []byte, fn func(q *dbq.Queries) error) error {
	var user, moderator, orders string
	if p := caller(ctx); p != nil {
		if p.sessionID != uuid.Nil {
			user = p.userID.String()
		}
		if slices.Contains(p.perms, auth.CatalogWrite) {
			moderator = "on"
		}
		if slices.Contains(p.perms, auth.OrdersWrite) {
			orders = "on"
		}
	}
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT set_config('app.user_id', $1, true), set_config('app.moderator', $2, true),
			set_config('app.orders', $3, true), set_config('app.order_token', $4, true)`,
			user, moderator, orders, hex.EncodeToString(orderToken)); err != nil {
			return err
		}
		return fn(s.q.WithTx(tx))
	})
}

func (s *Server) GetWishlist(ctx context.Context, _ apigen.GetWishlistRequestObject) (apigen.GetWishlistResponseObject, error) {
	if _, err := needUser(ctx); err != nil {
		return nil, err
	}
	var ids []uuid.UUID
	if err := s.scoped(ctx, func(q *dbq.Queries) (err error) { ids, err = q.WishlistProductIDs(ctx); return err }); err != nil {
		return nil, fmt.Errorf("wishlist: %w", err)
	}
	out := apigen.GetWishlist200JSONResponse{Items: []apigen.ProductSummary{}}
	if len(ids) == 0 {
		return out, nil
	}
	// ponytail: the 100 newest products saved; page it if wishlists ever grow past that.
	page, err := s.listProducts(ctx, productFilter{statuses: []string{"active"}, ids: ids, sort: "newest", limit: 100})
	if err != nil {
		return nil, err
	}
	out.Items = page.Items
	return out, nil
}

func (s *Server) AddToWishlist(ctx context.Context, req apigen.AddToWishlistRequestObject) (apigen.AddToWishlistResponseObject, error) {
	if _, err := needUser(ctx); err != nil {
		return nil, err
	}
	err := s.scoped(ctx, func(q *dbq.Queries) error { return q.AddToWishlist(ctx, req.ProductId) })
	if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok && pgErr.Code == "23503" {
		return nil, notFound("That product")
	}
	if err != nil {
		return nil, fmt.Errorf("add to wishlist: %w", err)
	}
	return apigen.AddToWishlist204Response{}, nil
}

func (s *Server) RemoveFromWishlist(ctx context.Context, req apigen.RemoveFromWishlistRequestObject) (apigen.RemoveFromWishlistResponseObject, error) {
	if _, err := needUser(ctx); err != nil {
		return nil, err
	}
	if err := s.scoped(ctx, func(q *dbq.Queries) error { return q.RemoveFromWishlist(ctx, req.ProductId) }); err != nil {
		return nil, fmt.Errorf("remove from wishlist: %w", err)
	}
	return apigen.RemoveFromWishlist204Response{}, nil
}

const reviewsPerPage = 10

func (s *Server) ListReviews(ctx context.Context, req apigen.ListReviewsRequestObject) (apigen.ListReviewsResponseObject, error) {
	product, err := s.productForSale(ctx, req.Slug)
	if err != nil {
		return nil, err
	}
	params := dbq.ListReviewsParams{ProductID: product.ID, Lim: reviewsPerPage + 1}
	if req.Params.Cursor != nil {
		at, id, ok := decodeReviewCursor(*req.Params.Cursor)
		if !ok {
			return nil, errBadCursor
		}
		params.BeforeAt, params.BeforeID = ts(at), uuid.NullUUID{UUID: id, Valid: true}
	}
	me := callerUserID(ctx)
	out := apigen.ReviewPage{Items: []apigen.Review{}, Summary: apigen.RatingSummary{Stars: make([]int, 5)}}
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.ListReviews(ctx, params)
		if err != nil {
			return err
		}
		for i, r := range rows {
			if i == reviewsPerPage {
				next := encodeReviewCursor(rows[i-1].CreatedAt.Time, rows[i-1].ID)
				out.NextCursor = &next
				break
			}
			out.Items = append(out.Items, toReview(r.ID, r.UserID, me, r.Rating, r.Body, r.Hidden, r.CreatedAt, r.UpdatedAt, r.Author, nil))
		}
		counts, err := q.RatingCounts(ctx, product.ID)
		if err != nil {
			return err
		}
		total := 0
		for _, c := range counts {
			out.Summary.Stars[c.Rating-1] = int(c.N)
			out.Summary.Count += int(c.N)
			total += int(c.Rating) * int(c.N)
		}
		out.Summary.Average = average(int32(out.Summary.Count), int32(total))
		if me == uuid.Nil {
			return nil
		}
		mine, err := q.MyReview(ctx, product.ID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		r := toReview(mine.ID, mine.UserID, me, mine.Rating, mine.Body, mine.Hidden, mine.CreatedAt, mine.UpdatedAt, mine.Author, nil)
		out.Mine = &r
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("list reviews: %w", err)
	}
	return apigen.ListReviews200JSONResponse(out), nil
}

func (s *Server) SaveMyReview(ctx context.Context, req apigen.SaveMyReviewRequestObject) (apigen.SaveMyReviewResponseObject, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	product, err := s.productForSale(ctx, req.Slug)
	if err != nil {
		return nil, err
	}
	body := ""
	if req.Body.Body != nil {
		body = strings.TrimSpace(*req.Body.Body)
	}
	var out apigen.Review
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		r, err := q.SaveMyReview(ctx, dbq.SaveMyReviewParams{ProductID: product.ID, Rating: int16(req.Body.Rating), Body: body})
		out = toReview(r.ID, r.UserID, p.userID, r.Rating, r.Body, r.Hidden, r.CreatedAt, r.UpdatedAt, r.Author, nil)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("save review: %w", err)
	}
	return apigen.SaveMyReview200JSONResponse(out), nil
}

func (s *Server) DeleteMyReview(ctx context.Context, req apigen.DeleteMyReviewRequestObject) (apigen.DeleteMyReviewResponseObject, error) {
	if _, err := needUser(ctx); err != nil {
		return nil, err
	}
	product, err := s.productForSale(ctx, req.Slug)
	if err != nil {
		return nil, err
	}
	var n int64
	if err := s.scoped(ctx, func(q *dbq.Queries) (err error) { n, err = q.DeleteMyReview(ctx, product.ID); return err }); err != nil {
		return nil, fmt.Errorf("delete review: %w", err)
	}
	if n == 0 {
		return nil, notFound("Your review")
	}
	return apigen.DeleteMyReview204Response{}, nil
}

func (s *Server) ListQuestions(ctx context.Context, req apigen.ListQuestionsRequestObject) (apigen.ListQuestionsResponseObject, error) {
	product, err := s.productForSale(ctx, req.Slug)
	if err != nil {
		return nil, err
	}
	me := callerUserID(ctx)
	items := []apigen.Question{}
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.ListQuestions(ctx, product.ID)
		for _, r := range rows {
			items = append(items, toQuestion(r.ID, r.UserID, me, r.Body, r.Answer, r.AnsweredAt, r.Hidden, r.CreatedAt, r.Author, nil))
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("list questions: %w", err)
	}
	return apigen.ListQuestions200JSONResponse{Items: items}, nil
}

func (s *Server) AskQuestion(ctx context.Context, req apigen.AskQuestionRequestObject) (apigen.AskQuestionResponseObject, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	body := strings.TrimSpace(req.Body.Body)
	if body == "" {
		return nil, invalid(map[string]string{"body": "Write your question."})
	}
	product, err := s.productForSale(ctx, req.Slug)
	if err != nil {
		return nil, err
	}
	var out apigen.Question
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		r, err := q.AskQuestion(ctx, dbq.AskQuestionParams{ProductID: product.ID, Body: body})
		out = toQuestion(r.ID, r.UserID, p.userID, r.Body, r.Answer, r.AnsweredAt, r.Hidden, r.CreatedAt, r.Author, nil)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("ask question: %w", err)
	}
	return apigen.AskQuestion201JSONResponse(out), nil
}

func (s *Server) AdminListReviews(ctx context.Context, _ apigen.AdminListReviewsRequestObject) (apigen.AdminListReviewsResponseObject, error) {
	if _, err := need(ctx, auth.CatalogWrite); err != nil {
		return nil, err
	}
	items := []apigen.Review{}
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.AdminListReviews(ctx)
		for _, r := range rows {
			ref := apigen.ProductRef{Id: r.ProductID, Name: r.ProductName, Slug: r.ProductSlug}
			items = append(items, toReview(r.ID, r.UserID, uuid.Nil, r.Rating, r.Body, r.Hidden, r.CreatedAt, r.UpdatedAt, r.Author, &ref))
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("admin reviews: %w", err)
	}
	return apigen.AdminListReviews200JSONResponse{Items: items}, nil
}

func (s *Server) ModerateReview(ctx context.Context, req apigen.ModerateReviewRequestObject) (apigen.ModerateReviewResponseObject, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return nil, err
	}
	var out apigen.Review
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		r, err := q.SetReviewHidden(ctx, dbq.SetReviewHiddenParams{ID: req.Id, Hidden: req.Body.Hidden})
		if err != nil {
			return err
		}
		ref := apigen.ProductRef{Id: r.ProductID, Name: r.ProductName, Slug: r.ProductSlug}
		out = toReview(r.ID, r.UserID, uuid.Nil, r.Rating, r.Body, r.Hidden, r.CreatedAt, r.UpdatedAt, r.Author, &ref)
		action := "review.show"
		if r.Hidden {
			action = "review.hide"
		}
		return s.audit(ctx, q, p, action, "review", r.ID.String(), nil, out)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That review")
	}
	if err != nil {
		return nil, fmt.Errorf("moderate review: %w", err)
	}
	return apigen.ModerateReview200JSONResponse(out), nil
}

func (s *Server) AdminListQuestions(ctx context.Context, req apigen.AdminListQuestionsRequestObject) (apigen.AdminListQuestionsResponseObject, error) {
	if _, err := need(ctx, auth.CatalogWrite); err != nil {
		return nil, err
	}
	waiting := req.Params.Waiting != nil && *req.Params.Waiting
	items := []apigen.Question{}
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.AdminListQuestions(ctx, waiting)
		for _, r := range rows {
			ref := apigen.ProductRef{Id: r.ProductID, Name: r.ProductName, Slug: r.ProductSlug}
			items = append(items, toQuestion(r.ID, r.UserID, uuid.Nil, r.Body, r.Answer, r.AnsweredAt, r.Hidden, r.CreatedAt, r.Author, &ref))
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("admin questions: %w", err)
	}
	return apigen.AdminListQuestions200JSONResponse{Items: items}, nil
}

func (s *Server) AnswerQuestion(ctx context.Context, req apigen.AnswerQuestionRequestObject) (apigen.AnswerQuestionResponseObject, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return nil, err
	}
	var answer *string
	if req.Body.Answer != nil {
		if a := strings.TrimSpace(*req.Body.Answer); a != "" {
			answer = &a
		}
	}
	var out apigen.Question
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		r, err := q.AnswerQuestion(ctx, dbq.AnswerQuestionParams{ID: req.Id, Answer: answer, Hidden: req.Body.Hidden})
		if err != nil {
			return err
		}
		ref := apigen.ProductRef{Id: r.ProductID, Name: r.ProductName, Slug: r.ProductSlug}
		out = toQuestion(r.ID, r.UserID, uuid.Nil, r.Body, r.Answer, r.AnsweredAt, r.Hidden, r.CreatedAt, r.Author, &ref)
		return s.audit(ctx, q, p, "question.answer", "question", r.ID.String(), nil, out)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That question")
	}
	if err != nil {
		return nil, fmt.Errorf("answer question: %w", err)
	}
	return apigen.AnswerQuestion200JSONResponse(out), nil
}

// productForSale is the active product with this slug, or not_found.
func (s *Server) productForSale(ctx context.Context, slug string) (dbq.Product, error) {
	p, err := s.q.ProductBySlug(ctx, slug)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, notFound("That product")
	}
	if err != nil {
		return p, fmt.Errorf("product: %w", err)
	}
	return p, nil
}

func callerUserID(ctx context.Context) uuid.UUID {
	if p := caller(ctx); p != nil && p.sessionID != uuid.Nil {
		return p.userID
	}
	return uuid.Nil
}

// average is the mean of total stars over count reviews, to one decimal; nil with none.
func average(count, total int32) *float32 {
	if count == 0 {
		return nil
	}
	a := float32(int(float32(total)/float32(count)*10+0.5)) / 10
	return &a
}

// shortName is how a customer appears beside what they wrote: "Fatima Rahman" → "Fatima R.".
func shortName(name string) string {
	parts := strings.Fields(name)
	if len(parts) < 2 {
		return name
	}
	last := []rune(parts[len(parts)-1])
	return parts[0] + " " + string(last[0]) + "."
}

func toReview(id, author, me uuid.UUID, rating int16, body string, hidden bool, created, updated pgtype.Timestamptz, name string, product *apigen.ProductRef) apigen.Review {
	return apigen.Review{
		Id: id, Rating: int(rating), Body: body, Author: shortName(name), Mine: me != uuid.Nil && author == me,
		Hidden: hidden, CreatedAt: created.Time, UpdatedAt: updated.Time, Product: product,
	}
}

func toQuestion(id, author, me uuid.UUID, body string, answer *string, answeredAt pgtype.Timestamptz, hidden bool, created pgtype.Timestamptz, name string, product *apigen.ProductRef) apigen.Question {
	out := apigen.Question{
		Id: id, Body: body, Answer: answer, Author: shortName(name), Mine: me != uuid.Nil && author == me,
		Hidden: hidden, CreatedAt: created.Time, Product: product,
	}
	if answeredAt.Valid {
		out.AnsweredAt = &answeredAt.Time
	}
	return out
}

func encodeReviewCursor(at time.Time, id uuid.UUID) string {
	return base64.RawURLEncoding.EncodeToString([]byte(strconv.FormatInt(at.UnixMicro(), 10) + "|" + id.String()))
}

func decodeReviewCursor(c string) (time.Time, uuid.UUID, bool) {
	raw, err := base64.RawURLEncoding.DecodeString(c)
	if err != nil {
		return time.Time{}, uuid.Nil, false
	}
	at, id, ok := strings.Cut(string(raw), "|")
	micros, err1 := strconv.ParseInt(at, 10, 64)
	uid, err2 := uuid.Parse(id)
	if !ok || err1 != nil || err2 != nil {
		return time.Time{}, uuid.Nil, false
	}
	return time.UnixMicro(micros), uid, true
}

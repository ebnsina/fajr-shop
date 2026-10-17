-- Every query here runs inside Server.scoped, so row-level security sees the caller.

-- name: AddToWishlist :exec
INSERT INTO wishlist_items (user_id, product_id) VALUES (app_user(), $1) ON CONFLICT DO NOTHING;

-- name: RemoveFromWishlist :exec
DELETE FROM wishlist_items WHERE product_id = $1;

-- name: WishlistProductIDs :many
SELECT product_id FROM wishlist_items ORDER BY added_at DESC LIMIT 500;

-- name: SaveMyReview :one
WITH r AS (
    INSERT INTO reviews (product_id, user_id, rating, body) VALUES ($1, app_user(), $2, $3)
    ON CONFLICT (product_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body
    RETURNING *
)
SELECT r.*, u.name AS author FROM r JOIN users u ON u.id = r.user_id;

-- name: DeleteMyReview :execrows
DELETE FROM reviews WHERE product_id = $1 AND user_id = app_user();

-- name: MyReview :one
SELECT r.*, u.name AS author FROM reviews r JOIN users u ON u.id = r.user_id
WHERE r.product_id = $1 AND r.user_id = app_user();

-- name: ListReviews :many
SELECT r.*, u.name AS author FROM reviews r JOIN users u ON u.id = r.user_id
WHERE r.product_id = sqlc.arg(product_id) AND NOT r.hidden
  AND (sqlc.narg(before_at)::timestamptz IS NULL OR (r.created_at, r.id) < (sqlc.narg(before_at), sqlc.narg(before_id)::uuid))
ORDER BY r.created_at DESC, r.id DESC
LIMIT sqlc.arg(lim);

-- name: RatingCounts :many
SELECT rating, count(*)::int AS n FROM reviews WHERE product_id = $1 AND NOT hidden GROUP BY rating;

-- name: AdminListReviews :many
SELECT r.*, u.name AS author, p.name AS product_name, p.slug AS product_slug
FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
ORDER BY r.created_at DESC, r.id DESC LIMIT 200;

-- name: SetReviewHidden :one
WITH r AS (UPDATE reviews SET hidden = $2 WHERE reviews.id = $1 RETURNING *)
SELECT r.*, u.name AS author, p.name AS product_name, p.slug AS product_slug
FROM r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id;

-- name: AskQuestion :one
WITH q AS (INSERT INTO questions (product_id, user_id, body) VALUES ($1, app_user(), $2) RETURNING *)
SELECT q.*, u.name AS author FROM q JOIN users u ON u.id = q.user_id;

-- name: ListQuestions :many
SELECT q.*, u.name AS author FROM questions q JOIN users u ON u.id = q.user_id
-- Spelled out (not left to row security) so the shop's staff see what shoppers see here.
WHERE q.product_id = $1 AND NOT q.hidden AND (q.answer IS NOT NULL OR q.user_id = app_user())
ORDER BY q.answered_at DESC NULLS FIRST, q.created_at DESC LIMIT 50;

-- name: AdminListQuestions :many
SELECT q.*, u.name AS author, p.name AS product_name, p.slug AS product_slug
FROM questions q JOIN users u ON u.id = q.user_id JOIN products p ON p.id = q.product_id
WHERE NOT sqlc.arg(waiting)::bool OR (q.answer IS NULL AND NOT q.hidden)
ORDER BY q.created_at DESC LIMIT 200;

-- name: AnswerQuestion :one
WITH q AS (
    UPDATE questions SET answer = sqlc.narg(answer),
        answered_at = CASE WHEN sqlc.narg(answer)::text IS NULL THEN NULL ELSE coalesce(answered_at, now()) END,
        hidden = sqlc.arg(hidden)
    WHERE questions.id = sqlc.arg(id) RETURNING *
)
SELECT q.*, u.name AS author, p.name AS product_name, p.slug AS product_slug
FROM q JOIN users u ON u.id = q.user_id JOIN products p ON p.id = q.product_id;

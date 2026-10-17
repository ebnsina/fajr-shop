package httpapi_test

import (
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func TestWishlist(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Attar", nil)
	oud := h.product(admin.AccessToken, plain("Oud", 150000, 3, cat.Id))
	a, b := h.register(uniqueEmail()), h.register(uniqueEmail())
	path := "/v1/wishlist/" + oud.Id.String()

	expect(t, h.call("PUT", path, "", nil), 401, apigen.Unauthenticated)
	expect(t, h.call("PUT", path, a.AccessToken, nil), 204, "")
	expect(t, h.call("PUT", path, a.AccessToken, nil), 204, "") // saving twice is fine
	expect(t, h.call("PUT", "/v1/wishlist/"+cat.Id.String(), a.AccessToken, nil), 404, apigen.NotFound)

	list := func(token string) []apigen.ProductSummary {
		t.Helper()
		return decode[struct{ Items []apigen.ProductSummary }](t, expect2(t, h.call("GET", "/v1/wishlist", token, nil), 200)).Items
	}
	if got := list(a.AccessToken); len(got) != 1 || got[0].Id != oud.Id {
		t.Fatalf("a's wishlist: %+v", got)
	}
	if got := list(b.AccessToken); len(got) != 0 {
		t.Errorf("b sees a's wishlist: %+v", got)
	}

	// Row-level security is the boundary, not the API: outside a scoped transaction nothing shows.
	var n int
	if err := h.pool.QueryRow(t.Context(), "SELECT count(*) FROM wishlist_items").Scan(&n); err != nil || n != 0 {
		t.Errorf("unscoped query saw %d rows (err %v)", n, err)
	}

	expect(t, h.call("DELETE", path, a.AccessToken, nil), 204, "")
	if got := list(a.AccessToken); len(got) != 0 {
		t.Errorf("after removing: %+v", got)
	}
}

func TestReviews(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Dates", nil)
	ajwa := h.product(admin.AccessToken, plain("Ajwa", 150000, 9, cat.Id))
	a, b, staff := h.register(uniqueEmail()), h.register(uniqueEmail()), h.member(dbq.UserRoleStaff)
	base := "/v1/products/" + ajwa.Slug + "/reviews"

	expect(t, h.call("PUT", base+"/mine", "", map[string]any{"rating": 5}), 401, apigen.Unauthenticated)
	expect(t, h.call("PUT", base+"/mine", a.AccessToken, map[string]any{"rating": 6}), 400, apigen.Validation)
	mine := decode[apigen.Review](t, expect2(t, h.call("PUT", base+"/mine", a.AccessToken, map[string]any{"rating": 5, "body": "  Soft and sweet.  "}), 200))
	if !mine.Mine || mine.Body != "Soft and sweet." || mine.Author != "Ibn B." {
		t.Errorf("saved: %+v", mine)
	}
	bs := decode[apigen.Review](t, expect2(t, h.call("PUT", base+"/mine", b.AccessToken, map[string]any{"rating": 2}), 200))

	page := func(token string) apigen.ReviewPage {
		t.Helper()
		return decode[apigen.ReviewPage](t, expect2(t, h.call("GET", base, token, nil), 200))
	}
	got := page("")
	if got.Summary.Count != 2 || *got.Summary.Average != 3.5 || got.Summary.Stars[4] != 1 || got.Summary.Stars[1] != 1 || got.Mine != nil {
		t.Errorf("summary %+v", got.Summary)
	}
	// Saving again replaces, and the product's own rating follows.
	expect(t, h.call("PUT", base+"/mine", a.AccessToken, map[string]any{"rating": 4}), 200, "")
	p := decode[apigen.Product](t, expect2(t, h.call("GET", "/v1/products/"+ajwa.Slug, "", nil), 200))
	if p.RatingCount != 2 || *p.RatingAverage != 3 {
		t.Errorf("product rating %d %v", p.RatingCount, p.RatingAverage)
	}

	// The shop hides b's: shoppers stop seeing it and it stops counting; b still sees their own.
	expect(t, h.call("PATCH", "/v1/admin/reviews/"+bs.Id.String(), b.AccessToken, map[string]any{"hidden": true}), 403, apigen.Forbidden)
	hidden := decode[apigen.Review](t, expect2(t, h.call("PATCH", "/v1/admin/reviews/"+bs.Id.String(), staff.AccessToken, map[string]any{"hidden": true}), 200))
	if !hidden.Hidden || hidden.Product == nil || hidden.Product.Slug != ajwa.Slug {
		t.Errorf("hidden: %+v", hidden)
	}
	got = page(b.AccessToken)
	if got.Summary.Count != 1 || len(got.Items) != 1 || got.Mine == nil || !got.Mine.Hidden {
		t.Errorf("after hiding: %+v mine %+v", got.Summary, got.Mine)
	}
	if p := decode[apigen.Product](t, h.call("GET", "/v1/products/"+ajwa.Slug, "", nil)); p.RatingCount != 1 {
		t.Errorf("hidden review still counted: %d", p.RatingCount)
	}
	// Editing a hidden review doesn't bring it back.
	expect(t, h.call("PUT", base+"/mine", b.AccessToken, map[string]any{"rating": 5}), 200, "")
	if got := page(""); got.Summary.Count != 1 {
		t.Errorf("edit unhid it: %+v", got.Summary)
	}

	expect(t, h.call("GET", base+"?cursor=nonsense", "", nil), 400, apigen.Validation)
	expect(t, h.call("DELETE", base+"/mine", a.AccessToken, nil), 204, "")
	expect(t, h.call("DELETE", base+"/mine", a.AccessToken, nil), 404, apigen.NotFound)
	expect(t, h.call("GET", "/v1/products/no-such-thing/reviews", "", nil), 404, apigen.NotFound)
}

func TestQuestions(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Lungi", nil)
	lungi := h.product(admin.AccessToken, plain("Check Lungi", 50000, 9, cat.Id))
	a, b, staff := h.register(uniqueEmail()), h.register(uniqueEmail()), h.member(dbq.UserRoleStaff)
	base := "/v1/products/" + lungi.Slug + "/questions"
	list := func(token string) []apigen.Question {
		t.Helper()
		return decode[struct{ Items []apigen.Question }](t, expect2(t, h.call("GET", base, token, nil), 200)).Items
	}

	expect(t, h.call("POST", base, "", map[string]any{"body": "Cotton?"}), 401, apigen.Unauthenticated)
	expect(t, h.call("POST", base, a.AccessToken, map[string]any{"body": "   "}), 400, apigen.Validation)
	asked := decode[apigen.Question](t, expect2(t, h.call("POST", base, a.AccessToken, map[string]any{"body": "Is it pure cotton?"}), 201))

	// Waiting for an answer: only the asker sees it, staff included elsewhere but not on the shop.
	if got := list(a.AccessToken); len(got) != 1 || !got[0].Mine || got[0].Answer != nil {
		t.Errorf("asker: %+v", got)
	}
	for _, token := range []string{"", b.AccessToken, staff.AccessToken} {
		if got := list(token); len(got) != 0 {
			t.Errorf("unanswered question shown: %+v", got)
		}
	}
	waiting := decode[struct{ Items []apigen.Question }](t, expect2(t, h.call("GET", "/v1/admin/questions?waiting=true", staff.AccessToken, nil), 200)).Items
	found := false
	for _, q := range waiting {
		found = found || q.Id == asked.Id
	}
	if !found {
		t.Error("waiting list misses the question")
	}

	expect(t, h.call("PUT", "/v1/admin/questions/"+asked.Id.String(), b.AccessToken, map[string]any{"answer": "Yes", "hidden": false}), 403, apigen.Forbidden)
	answered := decode[apigen.Question](t, expect2(t, h.call("PUT", "/v1/admin/questions/"+asked.Id.String(), staff.AccessToken, map[string]any{"answer": "Yes, 100% cotton.", "hidden": false}), 200))
	if answered.AnsweredAt == nil {
		t.Error("no answered_at")
	}
	if got := list(""); len(got) != 1 || *got[0].Answer != "Yes, 100% cotton." || got[0].Mine {
		t.Errorf("answered: %+v", got)
	}
	expect(t, h.call("PUT", "/v1/admin/questions/"+asked.Id.String(), staff.AccessToken, map[string]any{"answer": "Yes, 100% cotton.", "hidden": true}), 200, "")
	if got := list(""); len(got) != 0 {
		t.Errorf("hidden question shown: %+v", got)
	}
}

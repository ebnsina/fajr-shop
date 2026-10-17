package courier

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
)

// The couriers' merchant panels. None offers a lookup API, so this signs in as the shop, as its
// staff would in a browser; tests point these at fakes.
var (
	SteadfastPanelURL = "https://steadfast.com.bd"
	PathaoPanelURL    = "https://merchant.pathao.com"
)

// HistoryKeys says which saved fields a courier's lookup signs in with.
var HistoryKeys = map[string][2]string{
	"steadfast": {"panel_email", "panel_password"},
	"pathao":    {"username", "password"},
}

// History is how many of a phone number's parcels this courier delivered and how many came back.
// ponytail: signs in on every call; the caller caches results for a day.
func History(ctx context.Context, code string, keys map[string]string, phone string) (delivered, cancelled int, err error) {
	k, ok := HistoryKeys[code]
	if !ok || keys[k[0]] == "" || keys[k[1]] == "" {
		return 0, 0, ErrUnsupported
	}
	switch code {
	case "steadfast":
		return steadfastHistory(ctx, keys[k[0]], keys[k[1]], phone)
	default:
		return pathaoHistory(ctx, keys[k[0]], keys[k[1]], phone)
	}
}

var csrf = regexp.MustCompile(`name="_token" value="([^"]+)"`)

func steadfastHistory(ctx context.Context, email, password, phone string) (int, int, error) {
	jar, _ := cookiejar.New(nil) // never fails without options
	c := &http.Client{Jar: jar, Timeout: client.Timeout}
	page, err := fetch(ctx, c, http.MethodGet, SteadfastPanelURL+"/login", nil, "")
	if err != nil {
		return 0, 0, err
	}
	m := csrf.FindSubmatch(page)
	if m == nil {
		return 0, 0, fmt.Errorf("steadfast panel: no sign-in form")
	}
	form := url.Values{"_token": {string(m[1])}, "email": {email}, "password": {password}}
	if _, err := fetch(ctx, c, http.MethodPost, SteadfastPanelURL+"/login", strings.NewReader(form.Encode()), "application/x-www-form-urlencoded"); err != nil {
		return 0, 0, err
	}
	raw, err := fetch(ctx, c, http.MethodGet, SteadfastPanelURL+"/user/frauds/check/"+phone, nil, "")
	if err != nil {
		return 0, 0, err
	}
	var out struct {
		Delivered *int `json:"total_delivered"`
		Cancelled *int `json:"total_cancelled"`
	}
	if json.Unmarshal(raw, &out) != nil || out.Delivered == nil {
		return 0, 0, &Refused{"the merchant panel email or password was not accepted"}
	}
	return *out.Delivered, *out.Cancelled, nil
}

func pathaoHistory(ctx context.Context, username, password, phone string) (int, int, error) {
	body, _ := json.Marshal(map[string]string{"username": username, "password": password})
	raw, err := fetch(ctx, client, http.MethodPost, PathaoPanelURL+"/api/v1/login", bytes.NewReader(body), "application/json")
	if err != nil {
		return 0, 0, err
	}
	var login struct {
		Token string `json:"access_token"`
	}
	if json.Unmarshal(raw, &login) != nil || login.Token == "" {
		return 0, 0, &Refused{"the merchant email or password was not accepted"}
	}
	body, _ = json.Marshal(map[string]string{"phone": phone})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, PathaoPanelURL+"/api/v1/user/success", bytes.NewReader(body))
	if err != nil {
		return 0, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+login.Token)
	res, err := client.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("pathao panel: %w", err)
	}
	defer res.Body.Close()
	var out struct {
		Data struct {
			Customer struct {
				Total   int `json:"total_delivery"`
				Success int `json:"successful_delivery"`
			} `json:"customer"`
		} `json:"data"`
	}
	if res.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("pathao panel: %s", res.Status)
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&out); err != nil {
		return 0, 0, fmt.Errorf("pathao panel: %w", err)
	}
	c := out.Data.Customer
	return c.Success, max(0, c.Total-c.Success), nil
}

// fetch makes one request and reads the reply, treating any 4xx/5xx as a failure.
func fetch(ctx context.Context, c *http.Client, method, u string, body io.Reader, contentType string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, u, body)
	if err != nil {
		return nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	req.Header.Set("Accept", "application/json, text/html")
	res, err := c.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", u, err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("%s: %s", u, res.Status)
	}
	return raw, nil
}

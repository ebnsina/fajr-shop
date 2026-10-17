// Package config reads the API's settings from the environment and refuses to start without them.
package config

import (
	"encoding/base64"
	"fmt"
	"net/netip"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL string
	HTTPAddr    string
	// CORSOrigins may be empty: the web storefront calls the API server-side and needs none.
	CORSOrigins []string
	// MediaDir is where uploaded images are written; MediaURL is where browsers fetch them.
	MediaDir string
	MediaURL string
	// TrustedProxies may set X-Forwarded-For: Caddy and the web app's server. May be empty.
	TrustedProxies []netip.Prefix
	// ShopURL is the storefront's address, where payment gateways send customers back.
	ShopURL string
	// SecretKey seals provider credentials in the database: 32 random bytes, base64.
	SecretKey []byte
}

func Load() (Config, error) {
	var missing []string
	need := func(key string) string {
		v, ok := os.LookupEnv(key)
		if !ok || v == "" {
			missing = append(missing, key)
		}
		return v
	}
	c := Config{
		DatabaseURL: need("FAJR_DATABASE_URL"),
		HTTPAddr:    need("FAJR_HTTP_ADDR"),
		MediaDir:    need("FAJR_MEDIA_DIR"),
		MediaURL:    strings.TrimRight(need("FAJR_MEDIA_URL"), "/"),
		ShopURL:     strings.TrimRight(need("FAJR_SHOP_URL"), "/"),
	}
	origins, ok := os.LookupEnv("FAJR_CORS_ORIGINS")
	if !ok {
		missing = append(missing, "FAJR_CORS_ORIGINS")
	}
	for o := range strings.SplitSeq(origins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			c.CORSOrigins = append(c.CORSOrigins, o)
		}
	}
	proxies, ok := os.LookupEnv("FAJR_TRUSTED_PROXIES")
	if !ok {
		missing = append(missing, "FAJR_TRUSTED_PROXIES")
	}
	for p := range strings.SplitSeq(proxies, ",") {
		if p = strings.TrimSpace(p); p == "" {
			continue
		}
		prefix, err := netip.ParsePrefix(p)
		if err != nil {
			return Config{}, fmt.Errorf("config: FAJR_TRUSTED_PROXIES: %w", err)
		}
		c.TrustedProxies = append(c.TrustedProxies, prefix)
	}
	if key := need("FAJR_SECRET_KEY"); key != "" {
		b, err := base64.StdEncoding.DecodeString(key)
		if err != nil || len(b) != 32 {
			return Config{}, fmt.Errorf("config: FAJR_SECRET_KEY must be 32 bytes in base64 (openssl rand -base64 32)")
		}
		c.SecretKey = b
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("config: missing environment variables: %s", strings.Join(missing, ", "))
	}
	return c, nil
}

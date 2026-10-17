// Package config reads the API's settings from the environment and refuses to start without them.
package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL string
	HTTPAddr    string
	// CORSOrigins may be empty: the web storefront calls the API server-side and needs none.
	CORSOrigins []string
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
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("config: missing environment variables: %s", strings.Join(missing, ", "))
	}
	return c, nil
}

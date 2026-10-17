// Package provider lists the couriers, payment gateways and SMS gateways a shop can connect, and what each asks for.
package provider

type Kind string

const (
	Courier Kind = "courier"
	Payment Kind = "payment"
	SMS     Kind = "sms"
)

type Field struct {
	Key   string
	Label string
	// Secret fields are sealed in the database and never sent back out.
	Secret bool
	// Optional fields may stay empty when the provider is switched on.
	Optional bool
}

type Provider struct {
	Code   string
	Kind   Kind
	Name   string
	Fields []Field
}

// ponytail: field lists come from each provider's merchant docs; each driver re-checks them when it is built.
var All = []Provider{
	{"steadfast", Courier, "Steadfast", []Field{
		{Key: "api_key", Label: "API key", Secret: true},
		{Key: "secret_key", Label: "Secret key", Secret: true},
	}},
	{"pathao", Courier, "Pathao", []Field{
		{Key: "client_id", Label: "Client ID"},
		{Key: "client_secret", Label: "Client secret", Secret: true},
		{Key: "username", Label: "Merchant email"},
		{Key: "password", Label: "Merchant password", Secret: true},
		{Key: "store_id", Label: "Store ID"},
	}},
	{"redx", Courier, "RedX", []Field{
		{Key: "api_token", Label: "API access token", Secret: true},
	}},
	{"bkash", Payment, "bKash", []Field{
		{Key: "app_key", Label: "App key"},
		{Key: "app_secret", Label: "App secret", Secret: true},
		{Key: "username", Label: "Username"},
		{Key: "password", Label: "Password", Secret: true},
	}},
	{"nagad", Payment, "Nagad", []Field{
		{Key: "merchant_id", Label: "Merchant ID"},
		{Key: "merchant_private_key", Label: "Merchant private key", Secret: true},
		{Key: "pg_public_key", Label: "Nagad public key"},
	}},
	{"sslcommerz", Payment, "SSLCommerz", []Field{
		{Key: "store_id", Label: "Store ID"},
		{Key: "store_password", Label: "Store password", Secret: true},
	}},
	{"aamarpay", Payment, "aamarPay", []Field{
		{Key: "store_id", Label: "Store ID"},
		{Key: "signature_key", Label: "Signature key", Secret: true},
	}},
	{"shurjopay", Payment, "ShurjoPay", []Field{
		{Key: "username", Label: "Username"},
		{Key: "password", Label: "Password", Secret: true},
		{Key: "prefix", Label: "Order prefix"},
	}},
	{"bulksmsbd", SMS, "BulkSMSBD", []Field{
		{Key: "api_key", Label: "API key", Secret: true},
		{Key: "sender_id", Label: "Sender ID"},
	}},
	{"sslwireless", SMS, "SSL Wireless", []Field{
		{Key: "api_token", Label: "API token", Secret: true},
		{Key: "sid", Label: "SID"},
	}},
}

func ByCode(code string) (Provider, bool) {
	for _, p := range All {
		if p.Code == code {
			return p, true
		}
	}
	return Provider{}, false
}

// Codes lists the providers of one kind.
func Codes(k Kind) []string {
	var out []string
	for _, p := range All {
		if p.Kind == k {
			out = append(out, p.Code)
		}
	}
	return out
}

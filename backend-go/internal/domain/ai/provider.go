package ai

import "errors"

// Provider はLLMプロバイダー
type Provider string

const (
	ProviderOpenAI    Provider = "openai"
	ProviderAnthropic Provider = "anthropic"
	ProviderGoogle    Provider = "google"
)

// String は文字列表現を返す
func (p Provider) String() string {
	return string(p)
}

// IsValid はProviderが有効かどうかを確認
func (p Provider) IsValid() bool {
	switch p {
	case ProviderOpenAI, ProviderAnthropic, ProviderGoogle:
		return true
	default:
		return false
	}
}

// ParseProvider は文字列からProviderを生成
func ParseProvider(s string) (Provider, error) {
	p := Provider(s)
	if !p.IsValid() {
		return "", errors.New("invalid provider")
	}
	return p, nil
}

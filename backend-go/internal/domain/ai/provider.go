package ai

import "errors"

// Provider はLLMプロバイダー
type Provider string

const (
	ProviderOpenAI    Provider = "openai"
	ProviderAnthropic Provider = "anthropic"
	ProviderGoogle    Provider = "google"
	// ProviderWebLLM はブラウザ内(WebGPU)で推論を実行するローカルプロバイダー。
	// サーバー(Python)では推論せず、クライアントで WebLLM が実行する。
	ProviderWebLLM Provider = "webllm"
)

// String は文字列表現を返す
func (p Provider) String() string {
	return string(p)
}

// IsValid はProviderが有効かどうかを確認
func (p Provider) IsValid() bool {
	switch p {
	case ProviderOpenAI, ProviderAnthropic, ProviderGoogle, ProviderWebLLM:
		return true
	default:
		return false
	}
}

// IsClientRuntime は推論をクライアント(ブラウザ)で実行するプロバイダーかどうかを返す。
// true の場合、サーバー(Python)では推論せず、推論に必要な材料をクライアントへ返す。
func (p Provider) IsClientRuntime() bool {
	return p == ProviderWebLLM
}

// ParseProvider は文字列からProviderを生成
func ParseProvider(s string) (Provider, error) {
	p := Provider(s)
	if !p.IsValid() {
		return "", errors.New("invalid provider")
	}
	return p, nil
}

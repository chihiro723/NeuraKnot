package ai

import "errors"

// PersonaType はAI Agentの振る舞いタイプ
type PersonaType string

const (
	PersonaAssistant  PersonaType = "assistant"
	PersonaCreative   PersonaType = "creative"
	PersonaAnalytical PersonaType = "analytical"
)

// String は文字列表現を返す
func (p PersonaType) String() string {
	return string(p)
}

// IsValid はPersonaTypeが有効かどうかを確認
func (p PersonaType) IsValid() bool {
	switch p {
	case PersonaAssistant, PersonaCreative, PersonaAnalytical:
		return true
	default:
		return false
	}
}

// ParsePersonaType は文字列からPersonaTypeを生成
func ParsePersonaType(s string) (PersonaType, error) {
	p := PersonaType(s)
	if !p.IsValid() {
		return "", errors.New("invalid persona type")
	}
	return p, nil
}

// DefaultSystemPrompts はペルソナタイプごとのデフォルトシステムプロンプト
var DefaultSystemPrompts = map[PersonaType]string{
	PersonaAssistant: `あなたは親切で丁寧なアシスタントです。
ユーザーの質問に分かりやすく、丁寧に答えてください。
必要に応じて、ステップバイステップで説明してください。`,

	PersonaCreative: `あなたは創造的で発想豊かなアシスタントです。
ユーザーとの対話を通じて、新しいアイデアや視点を提供してください。
既成概念にとらわれず、自由な発想を大切にしてください。`,

	PersonaAnalytical: `あなたは論理的で分析的なアシスタントです。
データと事実に基づいて回答し、根拠を明確に示してください。
複雑な問題は要素に分解し、体系的に分析してください。`,
}

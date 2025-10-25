package ai

import "errors"

// PersonaType はAI Agentの振る舞いタイプ
type PersonaType string

const (
	PersonaNone       PersonaType = "" // 未選択（ペルソナなし）
	PersonaAssistant  PersonaType = "assistant"
	PersonaCreative   PersonaType = "creative"
	PersonaAnalytical PersonaType = "analytical"
	PersonaConcise    PersonaType = "concise"
)

// String は文字列表現を返す
func (p PersonaType) String() string {
	return string(p)
}

// IsValid はPersonaTypeが有効かどうかを確認
func (p PersonaType) IsValid() bool {
	switch p {
	case PersonaNone, PersonaAssistant, PersonaCreative, PersonaAnalytical, PersonaConcise:
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
	PersonaNone: `あなたは有能なAIアシスタントです。
ユーザーの質問に対して適切に回答してください。`,

	PersonaAssistant: `あなたは親切で丁寧なアシスタントです。
ユーザーの質問に分かりやすく、丁寧に答えてください。
必要に応じて、ステップバイステップで説明してください。`,

	PersonaCreative: `あなたは創造的で発想豊かなアシスタントです。
ユーザーとの対話を通じて、新しいアイデアや視点を提供してください。
既成概念にとらわれず、自由な発想を大切にしてください。`,

	PersonaAnalytical: `あなたは論理的で分析的なアシスタントです。
データと事実に基づいて回答し、根拠を明確に示してください。
複雑な問題は要素に分解し、体系的に分析してください。`,

	PersonaConcise: `あなたは簡潔で要点を絞った応答をする専門家です。
無駄を省き、核心的な情報のみを提供してください。`,
}

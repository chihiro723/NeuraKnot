# サービス・ツール選択機能 実装完了レポート

## 📋 実装概要

エージェント作成時に、ユーザーが登録済みのサービスとそのツールを選択できる機能を実装しました。

## ✅ 完了した実装

### 1. UI 改善

#### 1.1 絵文字の削除

- **ServiceRegistrationForm.tsx**: サービス選択時の絵文字表示を削除
- **ServiceCard.tsx**: lucide-react の `Server` アイコンに統一

#### 1.2 マイサービスの削除機能

- **ServiceDetailModal.tsx**: 削除ボタンとハンドラーは既に実装済み
- **ServiceList.tsx**: `deleteServiceConfig` アクションを利用した削除処理が実装済み
- 確認ダイアログ付きで物理削除を実行

### 2. エージェント作成画面

#### 2.1 ツール使用トグルの削除

- `tools_enabled` は常に `true` に固定
- UI から「ツール使用を許可」トグルを完全削除

#### 2.2 新規コンポーネント: ServiceSelectorModal

**ファイル**: `frontend/components/services/ServiceSelectorModal.tsx`

**機能**:

- ✅ ユーザーの登録済みサービス一覧を表示
- ✅ マイサービスで無効化されているものはグレーアウト表示
- ✅ サービス選択時にツール一覧を展開
- ✅ ツール選択モード: 「全ツール」または「個別選択」
- ✅ 「全選択」「全解除」ボタン
- ✅ 複数サービスの同時選択

#### 2.3 AddFriendsPanel の拡張

**ファイル**: `frontend/components/friends/AddFriendsPanel.tsx`

**追加機能**:

- ✅ サービス選択状態の管理
- ✅ サービス追加・削除処理
- ✅ ツール選択モードの変更
- ✅ 選択済みサービスの表示（アコーディオン形式）
- ✅ ツールの個別選択 UI
- ✅ フォーム送信時にサービス情報を含める

### 3. バックエンド Go

#### 3.1 AIAgentHandler

**ファイル**: `backend-go/internal/handler/http/ai_agent_handler.go`

**変更点**:

- ✅ `aiAgentServiceRepo` を依存関係に追加
- ✅ エージェント作成時にサービス紐付けを保存
- ✅ `ai_agent_services` テーブルへのレコード挿入

#### 3.2 ChatUsecase

**ファイル**: `backend-go/internal/usecase/chat/chat_usecase.go`

**変更点**:

- ✅ `aiAgentServiceRepo` を依存関係に追加
- ✅ チャット時にエージェントの紐付けサービスを取得
- ✅ サービス情報を Python AI サーバーに送信

#### 3.3 ServiceConfig 型の拡張

**ファイル**: `backend-go/internal/infrastructure/external/ai_client.go`

```go
type ServiceConfig struct {
    ServiceClass      string   `json:"service_class"`
    ToolSelectionMode string   `json:"tool_selection_mode,omitempty"` // "all" or "selected"
    SelectedTools     []string `json:"selected_tools,omitempty"`
    APIKey            *string  `json:"api_key,omitempty"`
}
```

#### 3.4 Router

**ファイル**: `backend-go/internal/handler/http/router.go`

- ✅ `aiAgentServiceRepo` の初期化
- ✅ `AIAgentHandler` と `ChatUsecase` への依存注入

### 4. バックエンド Python

#### 4.1 ServiceConfig 型の拡張

**ファイル**: `backend-python/app/models/request.py`

```python
class ServiceConfig(BaseModel):
    service_class: str
    tool_selection_mode: str = "all"  # "all" or "selected"
    selected_tools: List[str] = []
    api_key: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    enabled: bool = True
```

#### 4.2 チャット処理の更新

**ファイル**: `backend-python/app/api/v1/chat.py`

**変更点**:

- ✅ サービスレジストリからツールを動的取得
- ✅ `tool_selection_mode` に基づくツールフィルタリング
- ✅ 通常チャットとストリーミングチャット両方に対応

**ツール取得ロジック**:

```python
if request.services:
    for service_config in request.services:
        service_class = registry.get_service(service_config.service_class)
        if service_class:
            service = service_class()
            service_tools = service.get_tools()

            # ツール選択モードに基づいてフィルタリング
            if service_config.tool_selection_mode == "selected" and service_config.selected_tools:
                service_tools = [
                    tool for tool in service_tools
                    if tool.name in service_config.selected_tools
                ]

            tools.extend(service_tools)
```

## 🔄 データフロー

### エージェント作成フロー

```
1. ユーザーがサービス選択モーダルを開く
   ↓
2. マイサービスから有効なサービス一覧を取得
   ↓
3. サービス選択 & ツール選択モード設定
   ↓
4. フォーム送信 (services配列を含む)
   ↓
5. Go Backend: ai_agents テーブルにエージェント作成
   ↓
6. Go Backend: ai_agent_services テーブルに紐付け保存
```

### チャットフロー

```
1. ユーザーがメッセージ送信
   ↓
2. Go Backend: conversation取得、agent取得
   ↓
3. Go Backend: ai_agent_servicesからサービス情報取得
   ↓
4. Go Backend: Python AIサーバーにリクエスト (services含む)
   ↓
5. Python: サービスレジストリからツール取得
   ↓
6. Python: tool_selection_modeに基づいてフィルタリング
   ↓
7. Python: LangChainエージェントでチャット実行
```

## 🗂️ データベーススキーマ

### ai_agent_services テーブル

```sql
CREATE TABLE ai_agent_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    service_class VARCHAR(255) NOT NULL,
    tool_selection_mode VARCHAR(50) DEFAULT 'all',
    selected_tools TEXT[],
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ai_agent_id, service_class),
    CONSTRAINT chk_tool_selection_mode CHECK (tool_selection_mode IN ('all', 'selected'))
);
```

## 📁 変更ファイル一覧

### Frontend (7 ファイル)

1. `components/services/ServiceRegistrationForm.tsx` - 絵文字削除
2. `components/services/ServiceCard.tsx` - アイコン統一（既存）
3. `components/services/ServiceSelectorModal.tsx` - **新規作成**
4. `components/friends/AddFriendsPanel.tsx` - サービス選択 UI 追加
5. `lib/types/service.ts` - 型定義（既存）
6. `lib/actions/services.ts` - サービスアクション（既存）
7. `lib/actions/ai-agent.ts` - services パラメータ対応（既存）

### Backend Go (5 ファイル)

1. `internal/handler/http/ai_agent_handler.go` - サービス紐付け処理
2. `internal/handler/http/router.go` - 依存関係更新
3. `internal/usecase/chat/chat_usecase.go` - サービス取得・送信
4. `internal/infrastructure/external/ai_client.go` - ServiceConfig 拡張
5. `internal/handler/http/request/ai_agent.go` - Services フィールド（既存）

### Backend Python (2 ファイル)

1. `app/models/request.py` - ServiceConfig 拡張
2. `app/api/v1/chat.py` - ツールフィルタリング実装

## 🎯 利用方法

### 1. エージェント作成時

1. 基本情報・ペルソナ・LLM 設定を入力
2. 「機能設定」セクションで「サービスを追加」ボタンをクリック
3. モーダルから使用したいサービスを選択
4. 各サービスのツール選択モードを設定:
   - 「全ツール」: サービスの全ツールを使用
   - 「個別選択」: 特定のツールのみ選択
5. 「追加」ボタンで設定画面に反映
6. 必要に応じてツール選択を調整
7. エージェント作成

### 2. チャット時

- エージェントに紐付けられたサービス・ツールが自動的に利用可能になります
- `tool_selection_mode` が "selected" の場合、選択されたツールのみ使用されます

## 🔍 確認ポイント

### ビルド確認

- ✅ Backend Go: `go build` 成功
- ✅ Frontend: TypeScript 型チェック成功
- ✅ Lint エラー: なし

### 動作確認項目

1. [ ] エージェント作成画面でサービス選択モーダルが開く
2. [ ] マイサービスで無効化したサービスがグレーアウトで表示される
3. [ ] ツール選択モードの切り替えが動作する
4. [ ] 複数サービスを同時選択できる
5. [ ] 選択したサービスがフォームに表示される
6. [ ] エージェント作成時にサービス紐付けが DB に保存される
7. [ ] チャット時に選択したツールのみ利用可能になる

## 🚀 次のステップ

1. **動作確認**: Docker 環境で実際にエージェント作成とチャットをテスト
2. **エラーハンドリング**: サービス取得失敗時のフォールバック処理
3. **パフォーマンス**: 大量のツールがある場合の最適化
4. **UX 改善**: ローディング状態の表示、エラーメッセージの改善

## 📝 備考

- マイサービスの削除機能は既に実装済みでした
- `tools_enabled` フィールドは後方互換性のため残していますが、常に `true` です
- サービスの認証情報（API キー等）の暗号化・復号化は既存の仕組みを利用

## 🧹 システム整理: include_basic_tools の削除

### 削除理由

- 全てのツールがサービスシステムで一元管理されるようになった
- ユーザーがエージェント作成時にサービス・ツールを明示的に選択できる
- `include_basic_tools` は旧システムの遺産で不要になった

### 削除内容

1. **Python**: `ChatRequest.include_basic_tools` フィールド削除
2. **Python**: 基本ツールの自動ロードロジック削除
3. **Go**: `ChatRequest.IncludeBasicTools` フィールド削除
4. **Go**: チャット時の `IncludeBasicTools: true` 設定削除

### 新しい仕様

- 全てのツール（基本ツール含む）はサービスとして管理
- エージェント作成時に必要なサービスを選択
- 選択したサービスのツールのみがチャット時に利用可能
- 基本ツールを使いたい場合は `DateTimeService` 等を選択

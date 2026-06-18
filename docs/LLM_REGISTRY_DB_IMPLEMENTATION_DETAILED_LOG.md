# LLM Registry DB化 実装詳細ログ（超詳細版）

最終更新: 2026-05-28  
対象リポジトリ: `NeuraKnot`  
対象フェーズ: LLM Registry DB integration（モデル追加/有効無効/範囲制約/管理UI/エージェント設定連動）

---

## 1. このドキュメントの目的

今回の実装で行った変更を、以下の観点で将来追跡できる状態にする。

- 何を目的に、どの層に、どんな変更を入れたか
- `git diff` で何が変わっているか（ファイル単位）
- 途中で発生した不具合と修正理由
- 現時点で残っている課題（次フェーズ向け）

---

## 2. 実装の背景と到達点

### 背景

- これまでモデル追加・無効化はコード修正ベースで運用負荷が高かった
- エージェント作成/編集画面のモデル候補がハードコードされていた
- `temperature` / `max_tokens` の許容範囲がモデルごとに運用できなかった
- 管理UIが不足しており、運用中の即時対応が難しかった

### 到達点（今回）

- DBテーブル `llm_models` を追加し、モデル可用性と実行制約を管理
- Go APIでモデル一覧取得・管理CRUD（作成/編集/有効無効/削除）を提供
- エージェント作成/更新・チャット実行時にDB定義でモデル制約を検証
- 管理画面（Next.js）でモーダルUIによる登録/編集を実装
- エージェント作成/設定画面でモデルごとの制約をUIに反映（自動クランプ含む）

---

## 3. `git diff` 取得手順（再現用）

今回の棚卸しで使用したコマンド:

```bash
git status --short
git diff --stat
git diff --name-only
git ls-files --others --exclude-standard
git diff -- <主要ファイル群>
```

### 3.1 `git diff --stat` 結果（取得時点）

```text
backend-go/docs/docs.go                            |   6 +
backend-go/docs/swagger.json                       |   6 +
backend-go/docs/swagger.yaml                       |   4 +
backend-go/internal/handler/http/ai_agent_handler.go      |  22 +-
backend-go/internal/handler/http/chat_handler.go           |  23 +-
backend-go/internal/handler/http/request/ai_agent.go       |   2 +
backend-go/internal/handler/http/router.go                 |  32 +-
backend-go/internal/usecase/ai/agent_usecase.go            |  38 ++-
backend-go/internal/usecase/chat/chat_usecase.go           |  41 +++
backend-python/app/core/llm_factory.py                     |  46 +--
frontend/app/dashboard/settings/page.tsx                   |   9 +
frontend/components/friends/AddFriendsPanel.tsx            | 333 +++++++++++--------
frontend/components/friends/AgentSettingsModal.tsx         | 357 +++++++++++++++------
...（バイナリ差分 .DS_Store / tfplan は省略）
```

### 3.2 変更ファイルの扱い

- **本機能の主要変更として扱う**
  - `backend-go/internal/domain/llmmodel/*`
  - `backend-go/internal/usecase/llmmodel/*`
  - `backend-go/internal/infrastructure/persistence/llm_model_repository.go`
  - `backend-go/internal/handler/http/llm_model_handler.go`
  - `backend-go/internal/handler/http/request/llm_model.go`
  - `backend-go/internal/handler/http/response/llm_model.go`
  - `backend-go/internal/handler/http/request/ai_agent.go`
  - `backend-go/internal/handler/http/ai_agent_handler.go`
  - `backend-go/internal/usecase/ai/agent_usecase.go`
  - `backend-go/internal/usecase/chat/chat_usecase.go`
  - `backend-go/internal/handler/http/chat_handler.go`
  - `backend-go/internal/handler/http/router.go`
  - `backend-go/migrations/000009_add_llm_models.up.sql`
  - `backend-go/migrations/000009_add_llm_models.down.sql`
  - `frontend/lib/types/llm-model.ts`
  - `frontend/lib/actions/llm-models.ts`
  - `frontend/app/dashboard/admin/llm-models/page.tsx`
  - `frontend/components/admin/LLMModelsAdminModalClient.tsx`
  - `frontend/components/friends/AddFriendsPanel.tsx`
  - `frontend/components/friends/AgentSettingsModal.tsx`
  - `backend-python/app/core/llm_factory.py`
- **本機能と直接関係しない/記録対象外**
  - `.DS_Store`
  - `terraform` の `tfplan` 差分

---

## 4. バックエンド（Go）変更詳細

## 4.1 DB設計・マイグレーション

対象:

- `backend-go/migrations/000009_add_llm_models.up.sql`
- `backend-go/migrations/000009_add_llm_models.down.sql`

追加内容:

- 新規テーブル `llm_models`
  - `provider`, `model`, `display_name`, `is_enabled`
  - `temperature_min`, `temperature_max`
  - `max_tokens_min`, `max_tokens_max`
  - `supports_streaming`, `metadata`
- 制約
  - `UNIQUE(provider, model)`
  - provider check (`openai`, `anthropic`, `google`)
  - temperature/max_tokens 範囲制約
- インデックス
  - `(provider, is_enabled)`
  - `(is_enabled, updated_at DESC)`
- `updated_at` トリガー
- 初期seed（OpenAI/Anthropic/Googleの既存モデル）

ロールバック:

- trigger/index/table を逆順で削除

## 4.2 Domain層（LLMモデル）

対象:

- `backend-go/internal/domain/llmmodel/model.go`
- `backend-go/internal/domain/llmmodel/repository.go`

主な実装:

- エンティティ `Model` を追加
- ドメインエラーを定義（NotFound, Disabled, OutOfRange, AlreadyExists など）
- `Validate()`:
  - provider/model/display_name 基本チェック
  - 範囲設定整合性チェック
- `ValidateRuntimeConfig(temperature, maxTokens)`:
  - 有効無効チェック
  - 実行パラメータが許容範囲内か検証
- Repository interface を定義:
  - `List`, `FindByID`, `FindByProviderAndModel`, `Create`, `Update`, `UpdateEnabled`, `UpdateRange`, `Delete`

注記:

- `UpdateRange` は初期実装で追加されたが、最終的には `Update`（全項目編集）へ主軸移行

## 4.3 Infrastructure層（Repository実装）

対象:

- `backend-go/internal/infrastructure/persistence/llm_model_repository.go`

主な実装:

- SQL CRUD 実装 (`List`, `FindByID`, `FindByProviderAndModel`, `Create`, `Update`, `UpdateEnabled`, `Delete`)
- `List` で `provider *string` の `nil`/値ありを明示処理（`interface{}` へ詰め替え）
- `scanModel` 共通化
- `RowsAffected` で NotFound 判定

不具合対応メモ:

- 初期に `provider` パラメータ取り扱いで一覧API 500 が発生したため、`nil` を明示的にSQLへ渡す形に修正

## 4.4 Usecase層（LLMモデル管理）

対象:

- `backend-go/internal/usecase/llmmodel/usecase.go`

主な実装:

- `ListModels`
- `CreateModel`
  - `provider+model` 重複チェック（事前 `FindByProviderAndModel`）
- `UpdateModel`
  - 全項目更新（provider/model/display_name/range/supports_streaming）
  - **更新時にも** `provider+model` 重複チェック
- `SetModelEnabled`
- `DeleteModel`
- `ValidateRuntimeConfig`
  - エラーメッセージに expected/got を埋めた詳細化

## 4.5 Handler層（LLMモデルAPI）

対象:

- `backend-go/internal/handler/http/llm_model_handler.go`
- `backend-go/internal/handler/http/request/llm_model.go`
- `backend-go/internal/handler/http/response/llm_model.go`

追加/変更API:

- `GET /api/v1/llm-models`
- `POST /api/v1/admin/llm-models`
- `PATCH /api/v1/admin/llm-models/:id`（全項目編集）
- `PATCH /api/v1/admin/llm-models/:id/enabled`
- `DELETE /api/v1/admin/llm-models/:id`

主なポイント:

- `UpdateLLMModelEnabledRequest` を `bool` から `*bool` に変更
  - `false` が未指定扱いになるバインド問題を回避
- `ErrModelAlreadyExists` は `409 Conflict` を返す
- `UpdateModel` は必須項目を `nil` チェックで保証

注意点（現状）:

- `UpdateRange` 用 DTO/Handler/Route が一部残存
  - 現在は全項目編集 (`PATCH /:id`) が主経路
  - 将来的に `/:id/range` 廃止を検討可能

## 4.6 ルーティングとSwagger

対象:

- `backend-go/internal/handler/http/router.go`
- `backend-go/docs/docs.go`
- `backend-go/docs/swagger.json`
- `backend-go/docs/swagger.yaml`

主な変更:

- 上記の LLMモデル API ルートを追加
- Swagger定義を更新

---

## 5. エージェント作成/更新・チャット実行への検証差し込み

## 5.1 Agent API DTO（重要な不具合修正）

対象:

- `backend-go/internal/handler/http/request/ai_agent.go`

修正:

- `CreateAgentRequest` に `Temperature`, `MaxTokens` を追加
- `UpdateAgentRequest` に `Temperature`, `MaxTokens` を追加

これにより:

- フロントから送っていた値が正しく受理されるようになった
- 以前はDTO欠落でデフォルト `0.7 / 2000` に落ちていた

## 5.2 AIAgent Handler / Usecase

対象:

- `backend-go/internal/handler/http/ai_agent_handler.go`
- `backend-go/internal/usecase/ai/agent_usecase.go`

変更点:

- Create時、DTO受理値（temperature/max_tokens）を使用
- `AgentUsecase.CreateAgent` で `llmModels.ValidateRuntimeConfig` を実行
- `AgentUsecase.UpdateAgent` でも同検証を実行
- モデル制約エラーを HTTP 400 として返却

## 5.3 Chat実行前の再検証

対象:

- `backend-go/internal/usecase/chat/chat_usecase.go`
- `backend-go/internal/handler/http/chat_handler.go`

変更点:

- チャット実行直前 (`SendMessage`, `SendMessageStream`, `SendAgentIntroduction`) でモデル妥当性を再チェック
- `mapChatErrorStatus` を追加し、モデル制約違反を `400 Bad Request` へマップ

意図:

- 既存エージェント設定と最新DB定義のドリフトを実行時に検出して安全側に倒す

---

## 6. フロントエンド（Next.js）変更詳細

## 6.1 型定義とServer Action

対象:

- `frontend/lib/types/llm-model.ts`
- `frontend/lib/actions/llm-models.ts`

実装内容:

- `LLMModel`, `LLMModelsResponse`, `LLMProviderModels` 型追加
- Server Action:
  - `listLLMModels`
  - `listLLMProviderModels`
  - `createLLMModel`
  - `updateLLMModel`
  - `updateLLMModelEnabled`
  - `deleteLLMModel`
  - （互換残存）`updateLLMModelRange`
- `revalidatePath` で
  - `/dashboard/admin/llm-models`
  - `/dashboard/add/ai`
    を更新

## 6.2 管理画面（Admin）

対象:

- `frontend/app/dashboard/admin/llm-models/page.tsx`
- `frontend/components/admin/LLMModelsAdminModalClient.tsx`

実装内容:

- 管理ページを追加（DBモデル一覧を表示）
- 作成/編集フォームをモーダル化
- 全項目編集対応
  - `provider`, `model`, `display_name`
  - `temperature_min/max`
  - `max_tokens_min/max`
  - `supports_streaming`
- UI改善
  - カードは `display_name` 中心表示
  - 「詳細」展開で補助情報と操作ボタンを表示
  - disabledカードの視認性向上
  - 有効/無効トグル文言調整
  - デバッグ用途の物理削除ボタン追加
- 範囲UI改善
  - temperature/max_tokens を「1つのレンジUI（両端ハンドル）」に改善
  - ハンドル操作競合（max側だけ動く問題）を `pointer-events` と `z-index` 調整で修正
- 入力項目ラベルの明示（provider/model/display_name含む）

## 6.3 エージェント作成画面への反映

対象:

- `frontend/components/friends/AddFriendsPanel.tsx`

主な変更:

- ハードコード候補を廃止し `listLLMProviderModels(true)` を使用
- `applyModelConstraints` + `clampToRange` を導入
  - provider/model変更時に `temperature` / `max_tokens` を自動補正
- `useEffect` でモデル変更時の値逸脱を再補正
- 送信直前にも normalize してAPIへ渡す
- fixed temperature (`min === max`) はスライダーを出さず固定表示テキストに変更

## 6.4 エージェント設定モーダルへの反映

対象:

- `frontend/components/friends/AgentSettingsModal.tsx`

主な変更:

- `AddFriendsPanel` と同様に DB制約連動
- provider/model変更時のクランプ
- 保存時 normalize
- fixed temperature の専用表示

補足判断:

- フロントのクランプ処理は UX目的で維持（誤操作予防）
- 送信直前の再フェッチは不要化（DTO修正後は冗長）として削除

---

## 7. Python側（互換方針）

対象:

- `backend-python/app/core/llm_factory.py`

変更点:

- モデル可用性の正本を Go+DB に寄せる方針へ変更
- Python側は provider妥当性と空modelチェック中心に簡略化
- `get_available_models()` は後方互換として空配列返却

意図:

- 段階導入で互換を保ちつつ、モデル管理責務を一元化

---

## 8. 発生した不具合と修正履歴（抜粋）

1. **一覧API 500**

- 原因: マイグレーション未適用 + provider引数のSQL渡し方
- 対応: migration適用案内 + repositoryで `nil` を明示取り扱い

2. **`is_enabled=false` がバリデーションエラー**

- 原因: `binding:"required"` + `bool` の組み合わせで `false` が未指定扱い
- 対応: `*bool` 化 + `nil` チェック

3. **管理UIで重複識別子問題**

- 原因: 反復パッチ中の重複定義
- 対応: コンポーネントを `LLMModelsAdminModalClient` に再構成

4. **温度固定モデルで `expected 1.00-1.00 got 0.70`**

- 原因: `CreateAgentRequest` に `temperature`/`max_tokens` 欠落
- 対応: DTO追加（フロント値が受理されるよう修正）

5. **レンジUIでmaxハンドルしか動かない**

- 原因: オーバーレイrange inputのポインタイベント競合
- 対応: `thumb` のイベント制御と重なり順調整

6. **Hydration mismatch（別件）**

- 原因候補: クライアント依存状態でSSR出力とhydrate後DOMが不一致
- 状態: 原因特定済み、恒久対応は別タスク

---

## 9. 動作確認ログ（この記録作成時）

実行コマンド:

```bash
cd backend-go
go test ./internal/usecase/llmmodel ./internal/usecase/ai ./internal/usecase/chat ./internal/handler/http
```

結果:

```text
?    backend-go/internal/usecase/llmmodel    [no test files]
?    backend-go/internal/usecase/ai          [no test files]
?    backend-go/internal/usecase/chat        [no test files]
?    backend-go/internal/handler/http        [no test files]
```

備考:

- 対象パッケージにユニットテスト未整備のため、コンパイル健全性確認のみ

---

## 10. 既知課題 / 次フェーズ候補

- 管理API保護の強化（暫定authのみ -> allowlist/RBAC）
- 管理操作の監査ログ
- 管理画面でAPI接続テスト（任意）
- `PATCH /admin/llm-models/:id/range` の整理（全項目編集へ統合するなら削除）
- hydration mismatch の本対応（`mounted` ガード等）

---

## 11. 変更ファイル早見（本機能分）

### 新規

- `backend-go/internal/domain/llmmodel/model.go`
- `backend-go/internal/domain/llmmodel/repository.go`
- `backend-go/internal/usecase/llmmodel/usecase.go`
- `backend-go/internal/infrastructure/persistence/llm_model_repository.go`
- `backend-go/internal/handler/http/llm_model_handler.go`
- `backend-go/internal/handler/http/request/llm_model.go`
- `backend-go/internal/handler/http/response/llm_model.go`
- `backend-go/migrations/000009_add_llm_models.up.sql`
- `backend-go/migrations/000009_add_llm_models.down.sql`
- `frontend/lib/types/llm-model.ts`
- `frontend/lib/actions/llm-models.ts`
- `frontend/app/dashboard/admin/llm-models/page.tsx`
- `frontend/components/admin/LLMModelsAdminModalClient.tsx`

### 既存変更

- `backend-go/internal/handler/http/request/ai_agent.go`
- `backend-go/internal/handler/http/ai_agent_handler.go`
- `backend-go/internal/usecase/ai/agent_usecase.go`
- `backend-go/internal/usecase/chat/chat_usecase.go`
- `backend-go/internal/handler/http/chat_handler.go`
- `backend-go/internal/handler/http/router.go`
- `backend-go/docs/docs.go`
- `backend-go/docs/swagger.json`
- `backend-go/docs/swagger.yaml`
- `backend-python/app/core/llm_factory.py`
- `frontend/components/friends/AddFriendsPanel.tsx`
- `frontend/components/friends/AgentSettingsModal.tsx`

---

## 12. まとめ

今回の実装で、モデル運用の主導権を「コード定数」から「DBレジストリ」へ移し、管理UIと実行時検証をつなげる基盤が完成した。  
特に、作成/編集UIの制約反映、API側の厳密検証、チャット実行前再検証まで通したことで、運用時の設定ドリフトや不正値流入を防ぎやすくなっている。

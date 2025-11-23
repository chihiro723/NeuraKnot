# グループチャット機能 実装仕様書

## 🎯 実装概要

複数の AI エージェントを 1 つのグループに集め、メンション機能（@エージェント名）で直列処理により協調作業を行わせる機能を実装します。

### コア機能

- **メンション機能**: `@エージェント名` で特定のエージェントを指定
- **@all 機能**: グループ内の全エージェントに一括メンション
- **直列処理**: メンション順にエージェントが応答し、前の回答を踏まえて次が回答
- **ストリーミング対応**: SSE で各エージェントの応答をリアルタイム表示
- **生成キャンセル**: 処理中の応答を任意のタイミングで中止（1:1 チャット・グループチャット共通）

### 制約

- 1 ユーザー + 複数 AI エージェント（ユーザー間の接続機能なし）
- メッセージ送信時は最低 1 つのメンション必須
- グループには最低 1 体のエージェントが必要

---

## 📊 データベース設計

### 新規テーブル（4 つ）

#### 1. `group_chats`

```sql
CREATE TABLE group_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_chats_user ON group_chats(user_id, last_message_at DESC);
CREATE INDEX idx_group_chats_active ON group_chats(user_id, is_active) WHERE is_active = true;
```

#### 2. `group_chat_members`

```sql
CREATE TABLE group_chat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_chat_id, ai_agent_id)
);

CREATE INDEX idx_group_members_group ON group_chat_members(group_chat_id, display_order);
CREATE INDEX idx_group_members_agent ON group_chat_members(ai_agent_id);
```

#### 3. `group_messages`

```sql
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai')),
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_message_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    ai_session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,
    processing_status VARCHAR(50) DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_messages_group ON group_messages(group_chat_id, created_at DESC);
CREATE INDEX idx_group_messages_sender ON group_messages(sender_type, sender_id);
CREATE INDEX idx_group_messages_parent ON group_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
```

#### 4. `message_mentions`

```sql
CREATE TABLE message_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    ai_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    mention_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    response_message_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE (message_id, ai_agent_id)
);

CREATE INDEX idx_mentions_message ON message_mentions(message_id, mention_order);
CREATE INDEX idx_mentions_agent ON message_mentions(ai_agent_id);
CREATE INDEX idx_mentions_status ON message_mentions(status) WHERE status IN ('pending', 'processing');
```

### トリガー

```sql
-- group_messages INSERT 時の統計更新
CREATE OR REPLACE FUNCTION update_group_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE group_chats
    SET last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.group_chat_id;

    IF NEW.sender_type = 'ai' THEN
        UPDATE ai_agents
        SET message_count = message_count + 1,
            last_chat_at = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.sender_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_chat_on_message
AFTER INSERT ON group_messages
FOR EACH ROW EXECUTE FUNCTION update_group_chat_on_message();

-- updated_at 自動更新
CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON group_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 既存テーブルへの変更（オプション）

```sql
-- ai_chat_sessions にグループチャット対応を追加
ALTER TABLE ai_chat_sessions ADD COLUMN group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;
ALTER TABLE ai_chat_sessions ADD CONSTRAINT chk_chat_type CHECK (
    (conversation_id IS NOT NULL AND group_chat_id IS NULL) OR
    (conversation_id IS NULL AND group_chat_id IS NOT NULL)
);
```

---

## 🔄 メッセージ処理フロー（直列処理）

### 1. ユーザーメッセージ送信

```
1. group_messages INSERT (sender_type='user', processing_status='pending')
2. message_mentions INSERT (各メンションに対して mention_order 順)
3. SSE: mention_queue イベント送信（全体の処理キューを通知）
```

### 2. メンション処理ループ（mention_order 昇順）

```
FOR EACH mention IN mentions ORDER BY mention_order:
    1. message_mentions UPDATE (status='processing')
    2. SSE: agent_preparing イベント送信

    3. 会話履歴を取得:
       - group_messages から現在のメッセージより前の全メッセージ
       - 既に完了した同一メッセージ内の他エージェントの応答も含む
       - 古い順に並び替え

    4. AI API 呼び出し (Python backend-python):
       - SSE: agent_start イベント送信
       - ストリーミング中: agent_chunk イベント送信
       - ツール使用時: tool_usage イベント送信

    5. 応答完了:
       - group_messages INSERT (sender_type='ai', parent_message_id=ユーザーメッセージID)
       - ai_chat_sessions INSERT (トークン使用量等を記録)
       - message_mentions UPDATE (status='completed', response_message_id)
       - SSE: agent_complete イベント送信
```

### 3. 全メンション完了

```
1. group_messages UPDATE (processing_status='completed')
2. SSE: all_complete イベント送信
3. SSE ストリーム終了
```

### エラー処理

- エージェント処理失敗時: `status='failed'`, `error_message` 記録、後続のメンションは継続
- ネットワークエラー: サーバー側は処理継続、クライアント再接続時に履歴取得

---

## 🌐 API 設計

### エンドポイント一覧

| メソッド | パス                                              | 説明                     |
| -------- | ------------------------------------------------- | ------------------------ |
| POST     | /api/v1/group-chats                               | グループチャット作成     |
| GET      | /api/v1/group-chats                               | グループチャット一覧取得 |
| GET      | /api/v1/group-chats/{id}                          | グループチャット詳細取得 |
| PUT      | /api/v1/group-chats/{id}                          | グループチャット更新     |
| DELETE   | /api/v1/group-chats/{id}                          | グループチャット削除     |
| POST     | /api/v1/group-chats/{id}/icon                     | アイコンアップロード     |
| POST     | /api/v1/group-chats/{id}/members                  | メンバー追加             |
| DELETE   | /api/v1/group-chats/{id}/members/{member_id}      | メンバー削除             |
| PUT      | /api/v1/group-chats/{id}/members/reorder          | メンバー順序変更         |
| POST     | /api/v1/group-chats/{id}/messages/stream          | メッセージ送信（SSE）    |
| POST     | /api/v1/group-chats/{id}/messages/{msg_id}/cancel | メッセージ処理キャンセル |
| GET      | /api/v1/group-chats/{id}/messages                 | メッセージ履歴取得       |

### 重要な API 仕様

#### メッセージ送信（SSE ストリーミング）

**Request:**

```json
POST /api/v1/group-chats/{id}/messages/stream

{
  "content": "@エージェントA @エージェントB タスクを実行",
  "mentions": [
    {"ai_agent_id": "uuid1", "order": 1},
    {"ai_agent_id": "uuid2", "order": 2}
  ]
}

// または @all の場合
{
  "content": "@all タスクを確認",
  "mentions": "all"
}
```

**Response (SSE):**

```
event: user_message_saved
data: {"message_id": "msg_001", ...}

event: mention_queue
data: {"mentions": [{"agent_id": "uuid1", "agent_name": "...", "order": 1, "status": "pending"}, ...]}

event: agent_preparing
data: {"agent_id": "uuid1", "agent_name": "エージェントA", "order": 1}

event: agent_start
data: {"agent_id": "uuid1", "agent_name": "エージェントA"}

event: agent_chunk
data: {"agent_id": "uuid1", "content": "テキスト", "is_delta": true}

event: tool_usage
data: {"agent_id": "uuid1", "tool_name": "...", "status": "started/completed"}

event: agent_complete
data: {"agent_id": "uuid1", "message_id": "msg_002", "content": "...", "metadata": {...}}

event: all_complete
data: {"user_message_id": "msg_001", "agent_responses": [...], "total_tokens": 320}
```

#### アイコンアップロード

```
POST /api/v1/group-chats/{id}/icon
Content-Type: multipart/form-data

file: (binary)
```

- 既存の `S3Client.UploadAvatar()` を流用
- パス: `avatars/group-chats/{group_chat_id}/icon.{ext}`
- キャッシュバスティング用タイムスタンプを追加

---

## 🎨 UI 設計

### メンション入力 UI

#### @入力時の候補表示

- 先頭に `@all` オプション（全メンバー一括指定）
- グループメンバー一覧（`display_order` 順）
- エンターで選択

#### メンションタグ表示

- 各タグに [↑][↓][×] ボタン
- ↑↓: 順序変更（処理順序に影響）
- ×: 削除

#### @all 選択時

- `👥 @all (3人のエージェント) [×]` と表示
- 内部的には全メンバーを展開

### 進捗表示（メンション処理キュー）

処理中のみ画面上部に表示:

```
⚙ エージェントが順番に応答中...
✅ エージェントA → 🔵 エージェントB → ⏱ エージェントC
```

- ✅ 完了: 緑色
- 🔵 処理中: 青色（リング付き）
- ⏱ 待機中: 灰色

### ストリーミング表示

#### 準備中（agent_preparing）

```
エージェントA
🔄 応答を生成中... ●●●
```

#### テキスト生成中（agent_chunk 受信後）

```
エージェントA
タスクを分析しました▋
```

---

## 🛑 生成キャンセル機能

### 仕様

- 1:1 チャット・グループチャット共通
- ストリーミング中に「キャンセル」ボタン表示
- クリック時: SSE 接続を切断、キャンセル API 呼び出し

### グループチャットでのキャンセル

- 現在処理中のエージェントの応答をキャンセル
- 後続のメンションも自動的に `status='cancelled'` に更新
- 全体の処理を中止

### データベースへの影響

```
処理中だったエージェント:
  message_mentions.status = 'cancelled'
  部分生成テキストは保存可能（オプション）

未処理だったエージェント:
  message_mentions.status = 'cancelled'
  response_message_id = NULL
```

### トークン課金

- キャンセル時点までに消費したトークンは `ai_chat_sessions` に記録され、通常通り課金対象

---

## 📝 実装チェックリスト

### フェーズ 1: データベース・ドメイン層

#### マイグレーション

- [ ] `migrations/000004_add_group_chat.up.sql` - 4 テーブル作成、トリガー、インデックス
- [ ] `migrations/000004_add_group_chat.down.sql` - ロールバック
- [ ] `ai_chat_sessions` テーブルに `group_chat_id` 追加（オプション）

#### ドメイン層 (`internal/domain/groupchat/`)

- [ ] `group_chat.go` - エンティティ、バリデーション、ビジネスロジック
- [ ] `group_member.go` - エンティティ、順序変更ロジック
- [ ] `group_message.go` - エンティティ、送信者タイプ判定
- [ ] `message_mention.go` - エンティティ、ステータス管理
- [ ] `repository.go` - リポジトリインターフェース定義

### フェーズ 2: インフラ層・ユースケース層

#### インフラ層 (`internal/infrastructure/persistence/`)

- [ ] `group_chat_repository.go` - CRUD 実装
- [ ] `group_member_repository.go` - CRUD、順序変更クエリ
- [ ] `group_message_repository.go` - CRUD、履歴取得クエリ
- [ ] `message_mention_repository.go` - CRUD、順序別取得クエリ

#### ユースケース層 (`internal/usecase/groupchat/`)

- [ ] `group_chat_usecase.go`:
  - `CreateGroupChat(name, description, memberIDs)`
  - `UpdateGroupChat(id, name, description, iconURL)`
  - `DeleteGroupChat(id)`
  - `AddMember(groupID, agentID, order)`
  - `RemoveMember(groupID, memberID)`
  - `ReorderMembers(groupID, memberOrders)`
- [ ] `group_message_usecase.go`:
  - `SendMessageStream(groupID, userID, content, mentions)` ⭐ 最重要
    - @all の展開処理
    - 直列処理ループ
    - SSE イベント送信
    - エラーハンドリング
  - `GetMessages(groupID, limit, before)`
  - `CancelMessage(groupID, messageID)`

### フェーズ 3: ハンドラー層・API

#### ハンドラー層 (`internal/handler/http/`)

- [ ] `group_chat_handler.go`:

  - `CreateGroupChat(c *gin.Context)`
  - `GetGroupChats(c *gin.Context)`
  - `GetGroupChat(c *gin.Context)`
  - `UpdateGroupChat(c *gin.Context)`
  - `DeleteGroupChat(c *gin.Context)`
  - `AddMember(c *gin.Context)`
  - `RemoveMember(c *gin.Context)`
  - `ReorderMembers(c *gin.Context)`
  - `SendMessageStream(c *gin.Context)` - SSE 対応
  - `CancelMessage(c *gin.Context)`
  - `GetMessages(c *gin.Context)`

- [ ] `upload_handler.go` に追加:

  - `UploadGroupChatIcon(c *gin.Context)`

- [ ] `request/group_chat.go` - リクエスト DTO
- [ ] `response/group_chat.go` - レスポンス DTO

#### ルーター

- [ ] `router.go` に全エンドポイント追加

### フェーズ 4: フロントエンド

#### ページ (`app/dashboard/group-chats/`)

- [ ] `page.tsx` - グループチャット一覧
- [ ] `new/page.tsx` - グループ作成
- [ ] `[id]/page.tsx` - グループチャット画面
- [ ] `[id]/settings/page.tsx` - グループ設定

#### コンポーネント (`components/group-chat/`)

- [ ] `GroupChatList.tsx` - 一覧表示
- [ ] `GroupChatRoom.tsx` - チャットルーム（メイン）
- [ ] `GroupMessageInput.tsx` - メンション入力 UI
- [ ] `MentionSelector.tsx` - @候補ドロップダウン
- [ ] `MentionTag.tsx` - メンションタグ（順序変更ボタン付き）
- [ ] `GroupMessageList.tsx` - メッセージ一覧
- [ ] `GroupMessage.tsx` - メッセージ単体表示
- [ ] `AgentProgressIndicator.tsx` - 進捗表示（処理キュー）
- [ ] `CreateGroupModal.tsx` - グループ作成モーダル

#### API クライアント (`lib/api/group-chat.ts`)

- [ ] `createGroupChat()`
- [ ] `updateGroupChat()`
- [ ] `deleteGroupChat()`
- [ ] `uploadIcon()`
- [ ] `addMember()`
- [ ] `removeMember()`
- [ ] `reorderMembers()`
- [ ] `sendMessageStream()` - SSE 対応
- [ ] `cancelMessage()`
- [ ] `getMessages()`

### フェーズ 5: キャンセル機能（1:1・グループ共通）

#### 共通実装

- [ ] 1:1 チャットにキャンセルボタン追加
- [ ] グループチャットにキャンセルボタン追加
- [ ] SSE 切断処理
- [ ] バックエンドでキャンセル検知・処理中断
- [ ] キャンセル API 実装

### テスト

- [ ] グループチャット CRUD
- [ ] メンバー管理（追加・削除・順序変更）
- [ ] アイコンアップロード
- [ ] @all 機能
- [ ] 直列処理（複数エージェントの順次応答）
- [ ] 会話履歴の引き継ぎ（エージェント間協調）
- [ ] ストリーミング表示
- [ ] 進捗表示
- [ ] キャンセル機能（1:1・グループ）
- [ ] エラーハンドリング

---

## 🔧 実装時の注意点

### バックエンド（Go）

1. **直列処理ロジック（最重要）**

   - `SendMessageStream()` で mention_order 順にループ
   - 各エージェントの処理前に会話履歴を取得（前のエージェントの応答を含む）
   - SSE イベントを適切なタイミングで送信
   - context.Context でキャンセル対応

2. **@all の展開**

   - `mentions: "all"` を受け取ったら `group_chat_members` から全メンバーを `display_order` 順に取得
   - 各メンバーに対して `message_mentions` レコードを生成

3. **アイコンアップロード**

   - 既存の `S3Client.UploadAvatar()` を流用
   - パス: `avatars/group-chats/{id}/icon.{ext}`

4. **トークン使用量の記録**
   - 各エージェントの応答ごとに `ai_chat_sessions` に記録
   - `group_chat_id` を設定（オプション対応の場合）

### フロントエンド（Next.js）

1. **メンション入力 UI**

   - `@` 入力時に候補ドロップダウンを表示
   - 選択時にメンションタグを追加（改行区切り）
   - ドラッグ&ドロップまたは矢印ボタンで順序変更

2. **ストリーミング対応**

   - SSE で `mention_queue`, `agent_preparing`, `agent_start`, `agent_chunk`, `agent_complete` イベントを受信
   - 進捗キューを画面上部に表示
   - 各エージェントのストリーミングテキストをリアルタイム表示

3. **キャンセル機能**
   - ストリーミング中のみキャンセルボタン表示
   - クリック時に `eventSource.close()` と キャンセル API 呼び出し

### テーブル設計の補足

- `group_messages.parent_message_id`: AI の応答の場合、元のユーザーメッセージ ID を設定
- `message_mentions.mention_order`: 処理順序を決定（1 から開始）
- `message_mentions.response_message_id`: 完了時に AI 応答メッセージ ID を設定

---

## 🚀 実装の優先順位

1. **フェーズ 1**: データベース、ドメイン層（基盤）
2. **フェーズ 2**: インフラ層、ユースケース層（特に直列処理ロジック）
3. **フェーズ 3**: ハンドラー層、API 実装（SSE ストリーミング）
4. **フェーズ 4**: フロントエンド実装（UI、メンション入力、進捗表示）
5. **フェーズ 5**: キャンセル機能（1:1・グループ共通）

各フェーズで単体テストを行い、段階的に統合していくことで安定した実装が可能です。

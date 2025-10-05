# データベース設計ガイド

## 🎯 概要

BridgeSpeak のデータベース設計と構造について説明します。

## 📋 前提条件

1. AWS Cognito プロジェクトが作成済み
2. 環境変数（NEXT_PUBLIC_AWS_REGION、NEXT_PUBLIC_COGNITO_USER_POOL_ID 等）が設定済み
3. AWS Cognito ダッシュボードへのアクセス権限

> **注意**: 完全なセットアップ手順については [SETUP.md](SETUP.md) を参照してください。

## 🗄️ データベース構造

### テーブル設計

#### 1. users (ユーザー情報)

- **目的**: ユーザーの基本情報を管理
- **特徴**: AWS Cognito と 1:1 の関係
- **主要フィールド**: id, cognito_user_id, email, username, display_name, status

#### 2. ai_agents (AI エージェント)

- **目的**: AI エージェントの情報とパーソナリティを管理
- **特徴**: 5 つの異なるパーソナリティ（support, friendly, business, casual, humor）
- **主要フィールド**: id, name, personality_preset, description, avatar_url

#### 3. friendships (友だち関係)

- **目的**: ユーザー間およびユーザーと AI エージェント間の関係を管理
- **特徴**: 人間と AI の両方に対応したポリモーフィック設計
- **主要フィールド**: user_id, friend_type, friend_id

#### 4. conversations (会話)

- **目的**: チャット会話のメタデータを管理
- **特徴**: 1 対 1 の会話をサポート
- **主要フィールド**: participant1_type, participant1_id, participant2_type, participant2_id

#### 5. messages (メッセージ)

- **目的**: 実際のチャットメッセージを保存
- **特徴**: 送信者タイプによる分類（human/ai）
- **主要フィールド**: conversation_id, sender_type, sender_id, content

#### 6. message_reads (既読管理)

- **目的**: メッセージの既読状態を追跡
- **特徴**: ユーザーごとの既読タイムスタンプ
- **主要フィールド**: message_id, user_id, read_at

### ER 図

```
AWS Cognito Users
    |
    v
users -------- friendships -------- ai_agents
    |                    |
    v                    v
conversations -------->
    |
    v
messages -------- message_reads
```

## 🔐 セキュリティ設計

### JWT 認証

AWS Cognito を使用した JWT 認証により、以下のセキュリティが提供されます：

#### ユーザー認証

- **JWT トークン**: セッション管理とユーザー識別
- **AWS Cognito**: マネージド認証サービス
- **OAuth 2.0**: ソーシャルログイン（Google、LINE、X）

#### データアクセス制御

- **認証必須**: 全 API エンドポイントで JWT 認証が必要
- **ユーザー分離**: ユーザーは自分のデータのみアクセス可能
- **最小権限の原則**: 必要なデータのみアクセス

## 🔍 データ整合性

### 外部キー制約

```sql
-- メインのリレーションシップ
users.cognito_user_id -> AWS Cognito User ID
friendships.user_id -> users.id
friendships.friend_id -> users.id OR ai_agents.id
conversations.participant1_id -> users.id OR ai_agents.id
conversations.participant2_id -> users.id OR ai_agents.id
messages.conversation_id -> conversations.id
messages.sender_id -> users.id OR ai_agents.id
message_reads.message_id -> messages.id
message_reads.user_id -> users.id
```

### インデックス戦略

パフォーマンス最適化のため、以下のインデックスが設定されています：

- `users`: (cognito_user_id), (username)
- `friendships`: (user_id, friend_type)
- `conversations`: (participant1_id, participant2_id)
- `messages`: (conversation_id, created_at)
- `message_reads`: (user_id, message_id)

## ⚠️ 設計原則とベストプラクティス

### セキュリティ原則

1. **ゼロトラストアーキテクチャ**: 全 API で JWT 認証必須
2. **最小権限の原則**: ユーザーは必要なデータのみアクセス
3. **データ分離**: ユーザー間のデータは完全に分離

### パフォーマンス最適化

1. **インデックス戦略**: 頻繁なクエリパターンに対して最適化
2. **正規化**: データ重複を避け、整合性を保つ
3. **カスケード削除**: 関連データの自動クリーンアップ

### スケーラビリティ考慮

1. **ポリモーフィック設計**: 人間と AI の両方に対応
2. **拡張性**: 新しいエンティティタイプの追加が容易
3. **パーティショニング対応**: 将来の水平スケーリングに備えた設計

## 🔍 検証とデバッグ

### データベース検証クエリ

```sql
-- 1. 全テーブルの存在確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. AIエージェントの確認
SELECT name, personality_preset FROM ai_agents WHERE is_active = true;

-- 3. ユーザーテーブルの確認
SELECT cognito_user_id, email, username, display_name, status FROM users;

-- 4. 外部キー制約確認
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
```

### デバッグクエリ

```sql
-- ユーザーの友だち関係確認
SELECT f.*, u.username, a.name
FROM friendships f
LEFT JOIN users u ON f.friend_type = 'human' AND f.friend_id = u.id
LEFT JOIN ai_agents a ON f.friend_type = 'ai' AND f.friend_id = a.id
WHERE f.user_id = 'user_id_here';

-- 会話履歴確認
SELECT c.*, m.content, m.created_at
FROM conversations c
JOIN messages m ON c.id = m.conversation_id
WHERE c.participant1_id = 'user_id_here' OR c.participant2_id = 'user_id_here'
ORDER BY m.created_at DESC;
```

---

詳細なセットアップ手順については [SETUP.md](SETUP.md) を参照してください。

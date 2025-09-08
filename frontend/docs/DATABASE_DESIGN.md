# データベース設計ガイド

## 🎯 概要

BridgeSpeakのデータベース設計と構造について説明します。

## 📋 前提条件

1. Supabaseプロジェクトが作成済み
2. 環境変数（NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY）が設定済み
3. Supabaseダッシュボードへのアクセス権限

> **注意**: 完全なセットアップ手順については [SETUP.md](SETUP.md) を参照してください。

## 🗄️ データベース構造

### テーブル設計

#### 1. profiles (ユーザープロフィール)
- **目的**: ユーザーの基本情報を管理
- **特徴**: auth.usersと1:1の関係
- **主要フィールド**: id, user_id, username, display_name, avatar_url

#### 2. ai_agents (AIエージェント)
- **目的**: AIエージェントの情報とパーソナリティを管理
- **特徴**: 5つの異なるパーソナリティ（support, friendly, business, casual, humor）
- **主要フィールド**: id, name, personality_preset, description, avatar_url

#### 3. friendships (友だち関係)
- **目的**: ユーザー間およびユーザーとAIエージェント間の関係を管理
- **特徴**: 人間とAIの両方に対応したポリモーフィック設計
- **主要フィールド**: user_id, friend_type, friend_id

#### 4. conversations (会話)
- **目的**: チャット会話のメタデータを管理
- **特徴**: 1対1の会話をサポート
- **主要フィールド**: participant1_type, participant1_id, participant2_type, participant2_id

#### 5. messages (メッセージ)
- **目的**: 実際のチャットメッセージを保存
- **特徴**: 送信者タイプによる分類（human/ai）
- **主要フィールド**: conversation_id, sender_type, sender_id, content

#### 6. message_reads (既読管理)
- **目的**: メッセージの既読状態を追跡
- **特徴**: ユーザーごとの既読タイムスタンプ
- **主要フィールド**: message_id, user_id, read_at

### ER図

```
auth.users (Supabase Auth)
    |
    v
profiles -------- friendships -------- ai_agents
    |                    |
    v                    v
conversations -------->
    |
    v
messages -------- message_reads
```

## 🔐 セキュリティ設計

### Row Level Security (RLS)

全テーブルでRLSが有効化されており、以下のポリシーが適用されています：

#### profiles テーブル
- **SELECT**: 自分のプロフィールのみ閲覧可能
- **INSERT/UPDATE**: 自分のプロフィールのみ操作可能

#### friendships テーブル
- **SELECT**: 自分の友だち関係のみ閲覧可能
- **INSERT/UPDATE/DELETE**: 自分の友だち関係のみ操作可能

#### conversations テーブル
- **SELECT**: 自分が参加している会話のみ閲覧可能
- **INSERT**: 自分が参加する会話のみ作成可能

#### messages テーブル
- **SELECT**: 自分が参加している会話のメッセージのみ閲覧可能
- **INSERT**: 自分が参加している会話にのみメッセージ送信可能

#### ai_agents テーブル
- **SELECT**: 全ユーザーが閲覧可能（パブリック情報）
- **INSERT/UPDATE/DELETE**: 管理者のみ

## 🔍 データ整合性

### 外部キー制約

```sql
-- メインのリレーションシップ
profiles.user_id -> auth.users.id
friendships.user_id -> profiles.id
friendships.friend_id -> profiles.id OR ai_agents.id
conversations.participant1_id -> profiles.id OR ai_agents.id
conversations.participant2_id -> profiles.id OR ai_agents.id
messages.conversation_id -> conversations.id
messages.sender_id -> profiles.id OR ai_agents.id
message_reads.message_id -> messages.id
message_reads.user_id -> profiles.id
```

### インデックス戦略

パフォーマンス最適化のため、以下のインデックスが設定されています：

- `friendships`: (user_id, friend_type)
- `conversations`: (participant1_id, participant2_id)
- `messages`: (conversation_id, created_at)
- `message_reads`: (user_id, message_id)

## ⚠️ 設計原則とベストプラクティス

### セキュリティ原則

1. **ゼロトラストアーキテクチャ**: 全テーブルでRLS有効
2. **最小権限の原則**: ユーザーは必要なデータのみアクセス
3. **データ分離**: ユーザー間のデータは完全に分離

### パフォーマンス最適化

1. **インデックス戦略**: 頻繁なクエリパターンに対して最適化
2. **正規化**: データ重複を避け、整合性を保つ
3. **カスケード削除**: 関連データの自動クリーンアップ

### スケーラビリティ考慮

1. **ポリモーフィック設計**: 人間とAIの両方に対応
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

-- 3. RLS状態確認
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

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
-- 現在の認証ユーザーID
SELECT auth.uid();

-- RLSポリシー一覧
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE schemaname = 'public';

-- ユーザーの友だち関係確認
SELECT f.*, p.username, a.name 
FROM friendships f
LEFT JOIN profiles p ON f.friend_type = 'human' AND f.friend_id = p.id
LEFT JOIN ai_agents a ON f.friend_type = 'ai' AND f.friend_id = a.id
WHERE f.user_id = auth.uid();
```

---

詳細なセットアップ手順については [SETUP.md](SETUP.md) を参照してください。
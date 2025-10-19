# データベーススキーマ分析レポート

**作成日**: 2025-10-19  
**データベース**: `go_backend` (PostgreSQL 15)  
**分析対象**: 全 8 テーブル

---

## 📊 テーブル概要

| テーブル名           | レコード数 | テーブルサイズ | 総サイズ(インデックス含) | 状態                |
| -------------------- | ---------- | -------------- | ------------------------ | ------------------- |
| users                | 1          | 8 KB           | 128 KB                   | ✅ 正常             |
| ai_agents            | 11         | 24 KB          | 144 KB                   | ⚠️ 軽微な問題あり   |
| conversations        | 11         | 8 KB           | 104 KB                   | ⚠️ データ不整合あり |
| messages             | 247        | 128 KB         | 240 KB                   | ⚠️ データ不整合あり |
| ai_chat_sessions     | 117        | 32 KB          | 136 KB                   | ✅ 正常             |
| ai_tool_usage        | 56         | 88 KB          | 304 KB                   | ✅ 正常             |
| user_service_configs | 6          | 8 KB           | 96 KB                    | ✅ 正常             |
| ai_agent_services    | 13         | 8 KB           | 96 KB                    | ✅ 正常             |

---

## 🔴 重大な問題点

### 1. メッセージカウントの不整合 (Critical)

**問題**: `conversations`テーブルの`message_count`カラムと実際の`messages`テーブルのレコード数が一致しない。

```sql
-- 確認されたデータ不整合
ID: 92750a56-88a2-412c-8c48-572a758758a8
  recorded_count: 220
  actual_count: 118
  差分: 102件 (46.4%の誤差)

ID: 9d8a36f9-dc7f-456a-aedd-09ef45c1be49
  recorded_count: 133
  actual_count: 67
  差分: 66件 (49.6%の誤差)
```

**原因の推測**:

- トリガー `trigger_update_conversation_on_message` の動作不良の可能性
- メッセージ削除時にカウントが減らされていない
- データの手動削除やバッチ削除が行われた

**影響**:

- UI での表示件数が実際と異なる
- 統計データの信頼性低下
- ユーザー体験への悪影響

**推奨対応**:

```sql
-- カウントを修正するクエリ
UPDATE conversations c
SET message_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
),
updated_at = CURRENT_TIMESTAMP;
```

---

### 2. AI メッセージのセッション ID 欠落 (High)

**問題**: 128 件の AI メッセージが`ai_session_id`を持っていない（全 AI メッセージの約 51.8%）

```sql
-- 問題のあるデータ
SELECT COUNT(*) FROM messages
WHERE sender_type = 'ai' AND ai_session_id IS NULL;
-- 結果: 128件
```

**原因の推測**:

- ストリーミングチャット実装時に`ai_session_id`の設定が漏れている
- 旧バージョンのコードでセッション ID を記録していなかった

**影響**:

- AI セッションとメッセージの紐付けができない
- デバッグやトレーサビリティの低下
- 課金・分析データの欠落

**推奨対応**:

1. ストリーミング実装を確認し、必ず`ai_session_id`を設定するように修正
2. 過去データの修正は困難なため、今後のデータで対応

---

### 3. モデル名の表記ゆれ (Medium)

**問題**: `ai_agents`テーブルの`model`カラムに表記ゆれが存在

```sql
-- 現在のモデル名
'gpt-4o': 10件
'gpt4o':  1件  ← ハイフンなし
```

**影響**:

- API リクエスト時のエラーの可能性
- 統計データの不正確さ

**推奨対応**:

```sql
-- 表記を統一
UPDATE ai_agents
SET model = 'gpt-4o', updated_at = CURRENT_TIMESTAMP
WHERE model = 'gpt4o';

-- CHECK制約の追加を検討
ALTER TABLE ai_agents
ADD CONSTRAINT chk_model_format
CHECK (model IN ('gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022', 'gemini-pro'));
```

---

## ⚠️ 軽微な問題点

### 4. `avatar_url`カラムの未使用 (Low)

**問題**: 全 11 件の AI Agent で`avatar_url`が 100% NULL

**推奨対応**:

- 現在使用していない場合、将来的に使用予定があるか確認
- 使用予定がない場合はカラム削除を検討
- 使用予定がある場合は問題なし

---

### 5. `ai_agents`のメッセージカウント微差異 (Low)

**問題**: 1 件のエージェント「石神千空」でメッセージカウントに 1 件の差異

```
recorded_count: 35
actual_count: 34
差分: 1件
```

**影響**: 軽微（誤差範囲内）

**推奨対応**: 大規模な修正時に一緒に修正

---

## ✅ 良好な設計ポイント

### 1. 外部キー制約の完全性

すべての外部キーが適切に設定されており、孤立レコード（orphan records）は 0 件。

```sql
-- 検証結果
Orphan messages: 0件
Invalid sender references: 0件
```

### 2. インデックスの適切な配置

頻繁にアクセスされるカラムに適切なインデックスが設定されている。

**特に使用頻度が高いインデックス**:

- `idx_users_cognito_user_id`: 12,810 回スキャン
- `idx_ai_tool_usage_message`: 9,192 回スキャン
- `idx_user_service_configs_enabled`: 878 回スキャン
- `idx_ai_agent_services_enabled`: 376 回スキャン

### 3. トリガーによる自動更新

`updated_at`の自動更新トリガーが適切に動作している。

### 4. CHECK 制約による整合性

- `persona_type`, `provider`, `status` などの列挙型が適切に制約されている
- 数値範囲の制約（`temperature`, `max_tokens`）が適切

### 5. ツール実行の高い成功率

全てのツールで 100%の成功率を記録。

```
web_search: 33回実行 / 100%成功
get_weather: 6回実行 / 100%成功
calculate: 4回実行 / 100%成功
```

---

## 📈 パフォーマンス統計

### AI セッション統計

```
総セッション数: 117件
平均トークン使用量: 2,690トークン
最小トークン: 0
最大トークン: 5,891
平均処理時間: 5,816ms (約5.8秒)
```

### 会話の活動状況

```
Active (< 1 day): 9件 (81.8%)
Recent (< 7 days): 2件 (18.2%)
Inactive: 0件
```

→ 高いアクティブ率を維持

### 最もアクティブな会話 (Top 5)

| Agent 名             | メッセージ数 | 最終活動 |
| -------------------- | ------------ | -------- |
| インターネット愛好家 | 220          | < 1 日前 |
| 石神千空             | 133          | 1 日前   |
| 孫悟空               | 45           | < 1 日前 |
| 激怒ニキ             | 37           | < 1 日前 |
| お天気お姉さん       | 21           | 1 日前   |

---

## 🔧 推奨される改善策

### 即時対応が必要（Critical）

1. **メッセージカウントの修正**

   ```sql
   -- conversations テーブルのカウント修正
   UPDATE conversations c
   SET message_count = (
       SELECT COUNT(*)
       FROM messages m
       WHERE m.conversation_id = c.id
   ),
   updated_at = CURRENT_TIMESTAMP;
   ```

2. **モデル名の統一**
   ```sql
   UPDATE ai_agents
   SET model = 'gpt-4o', updated_at = CURRENT_TIMESTAMP
   WHERE model = 'gpt4o';
   ```

### 短期的対応（1-2 週間以内）

3. **ストリーミング実装の修正**

   - AI メッセージ作成時に必ず`ai_session_id`を設定
   - `backend-go/internal/handler/http/chat_handler.go`を確認
   - `backend-python/app/services/agent_service.py`を確認

4. **モデル名の CHECK 制約追加**
   ```sql
   ALTER TABLE ai_agents
   ADD CONSTRAINT chk_valid_models
   CHECK (model IN (
       'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo',
       'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229',
       'gemini-pro', 'gemini-1.5-pro'
   ));
   ```

### 中長期的検討（1 ヶ月以内）

5. **`avatar_url`の利用方針決定**

   - 使用する場合: フロントエンドとの連携を実装
   - 使用しない場合: カラム削除のマイグレーション作成

6. **統計情報のメンテナンスジョブ作成**

   - 定期的に`message_count`の整合性をチェック
   - 不整合を自動修正する仕組みの導入

7. **監視・アラートの設定**
   - メッセージカウント不整合の検出
   - AI セッション ID 欠落の検出
   - 異常に長い処理時間の検出

---

## 🎯 スキーマ設計の評価

### 総合評価: **B+ (良好)**

#### 強み

- ✅ クリーンアーキテクチャに準拠した適切な設計
- ✅ 外部キー制約による参照整合性の確保
- ✅ 適切なインデックス配置
- ✅ トリガーによる自動更新の実装
- ✅ CHECK 制約による型安全性

#### 改善の余地

- ⚠️ 統計カウンターの同期メカニズム
- ⚠️ ストリーミング実装でのセッション ID 管理
- ⚠️ モデル名などの文字列定数の管理

---

## 📝 次のステップ

### 1. 即座に実行すべき SQL

```sql
-- Step 1: conversationsのカウント修正
UPDATE conversations c
SET message_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
),
updated_at = CURRENT_TIMESTAMP;

-- Step 2: ai_agentsのカウント修正
UPDATE ai_agents a
SET message_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.sender_id = a.id AND m.sender_type = 'ai'
),
updated_at = CURRENT_TIMESTAMP;

-- Step 3: モデル名の統一
UPDATE ai_agents
SET model = 'gpt-4o', updated_at = CURRENT_TIMESTAMP
WHERE model = 'gpt4o';

-- Step 4: 確認
SELECT
    c.id,
    c.message_count as recorded,
    COUNT(m.id) as actual
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id, c.message_count
HAVING c.message_count != COUNT(m.id);
-- 結果が0件であることを確認
```

### 2. コードの修正箇所

- `backend-go/internal/handler/http/chat_handler.go` - ストリーミング時の ai_session_id 設定
- `backend-go/internal/domain/ai/agent.go` - モデル名の定数化
- `backend-go/schema/schema.sql` - CHECK 制約の追加

### 3. 監視項目の追加

- メッセージカウントの不整合検出
- AI セッション ID 欠落率の監視
- 異常に長い処理時間のアラート

---

## 📚 参考資料

- [DATABASE_DESIGN.md](/docs/DATABASE_DESIGN.md)
- [backend-go/schema/schema.sql](/backend-go/schema/schema.sql)
- PostgreSQL 公式ドキュメント: [Triggers](https://www.postgresql.org/docs/15/triggers.html)

---

**レポート作成者**: AI Assistant  
**最終更新**: 2025-10-19

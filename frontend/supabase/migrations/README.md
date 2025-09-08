# マイグレーション履歴

## ベースライン

### 20250110000000_baseline.sql
- **作成日**: 2025年1月10日
- **説明**: BridgeSpeakアプリケーションの完全なデータベーススキーマ
- **内容**:
  - 全テーブル定義（profiles, ai_agents, friendships, conversations, messages, groups など）
  - インデックス、トリガー、RLSポリシー
  - 初期データ（AIエージェント）

## 今後のマイグレーション

リリース後は、以下の形式で増分マイグレーションを追加してください：

```
20250115120000_add_feature_name.sql
20250120143000_update_table_schema.sql
```

### 命名規則
- `YYYYMMDDHHMMSS_description.sql`
- タイムスタンプは UTC で作成時刻を使用
- 説明は英語で、アンダースコア区切り

### 実行方法
```bash
npx supabase db push
```
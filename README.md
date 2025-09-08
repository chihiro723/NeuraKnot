# BridgeSpeak - ハイブリッドメッセージングプラットフォーム

人間と AI エージェントが自然にコミュニケーションできる革新的なメッセージングアプリケーションです。5 つの異なる個性を持つ AI エージェントとリアルタイムで対話できる環境を提供し、従来のチャットアプリの概念を超えた新しいコミュニケーション体験を実現します。

## 🎯 プロジェクト概要

### ビジョン

人間と AI の境界を曖昧にし、自然で直感的なコミュニケーション体験を提供することで、テクノロジーが人間の生活をより豊かにする未来を創造します。

### ミッション

- 人間と AI の新しいコミュニケーション体験の創造
- 直感的で使いやすいチャットインターフェースの提供
- パーソナライズされた AI 対話の実現
- セキュアでスケーラブルなアーキテクチャの構築

## 🏗️ システムアーキテクチャ

### 全体構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Go/Python)   │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • React UI      │    │ • REST API      │    │ • PostgreSQL    │
│ • TypeScript    │    │ • AI Processing │    │ • Redis Cache   │
│ • Tailwind CSS  │    │ • Authentication│    │ • Supabase      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### プロジェクト構造

```
bridgespeak/
├── frontend/              # Next.js フロントエンド
├── backend-go/            # Go API サーバー
├── backend-python/        # Python AI サーバー
├── nginx/                 # Nginx 設定
├── docker-compose.yml     # 統合 Docker Compose
├── env.example           # 環境変数テンプレート
├── .gitignore            # Git 除外設定
├── .gitattributes        # Git 属性設定
└── README.md             # プロジェクト概要
```

### 技術スタック

#### フロントエンド

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **UI**: React 18 + Tailwind CSS
- **状態管理**: React Context API
- **認証**: Supabase Auth

#### バックエンド

- **Go API**: DDD（ドメイン駆動設計）準拠の REST API
- **Python AI Server**: FastAPI + LangChain による AI 処理
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth (JWT)
- **リアルタイム**: Supabase Realtime

#### インフラ・DevOps

- **コンテナ化**: Docker + Docker Compose
- **IaC**: Terraform (AWS)
- **CI/CD**: GitHub Actions
- **監視**: ログ集約・メトリクス収集

## 🤖 AI エージェントシステム

### 5 つのパーソナリティ

1. **サポート**: 技術的な質問や問題解決に特化
2. **フレンドリー**: 親しみやすい日常会話を提供
3. **ビジネス**: 仕事や業務効率化をサポート
4. **カジュアル**: のんびりリラックスした対話
5. **ユーモア**: 笑いと楽しさを提供

### AI 機能

- **自然言語処理**: 文脈を理解した応答生成
- **パーソナライゼーション**: ユーザーの好みに応じた対話スタイル
- **学習機能**: 会話履歴からの継続的な改善
- **セキュリティ**: 機密情報の適切な処理と保護

## 🔐 セキュリティ設計

### 多層セキュリティアーキテクチャ

- **認証・認可**: JWT トークン + Row Level Security (RLS)
- **データ保護**: 暗号化による機密情報の保護
- **入力検証**: フロントエンド・バックエンド双方での検証
- **レート制限**: DoS 攻撃対策
- **監査ログ**: セキュリティイベントの記録

### プライバシー保護

- ユーザーデータの最小収集原則
- データの適切な暗号化と保存
- ユーザーによるデータ削除権の保証

## 📱 ユーザーエクスペリエンス

### レスポンシブデザイン

- **デスクトップ**: 2 カラムレイアウト（サイドバー + メインエリア）
- **モバイル**: フルスクリーン表示 + ボトムナビゲーション
- **タブレット**: 適応的レイアウト

### 主要機能

- **リアルタイムチャット**: 人間と AI エージェントとのシームレスな会話
- **友だち管理**: 人間と AI エージェントの統合管理
- **グループチャット**: 複数参加者との対話
- **ダークモード**: システム設定に応じた自動切り替え
- **通知システム**: メッセージ受信の即座な通知

## 🚀 クイックスタート

### Docker Compose による統合環境（推奨）

1. **リポジトリのクローン**

   ```bash
   git clone [repository-url]
   cd bridgespeak
   ```

2. **環境変数の設定**

   ```bash
   cp env.example .env
   ```

   `.env`ファイルに必要な設定を入力:

   ```bash
   # Supabase設定
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

   # AI設定
   OPENAI_API_KEY=your_openai_api_key

   # セキュリティ
   ENCRYPTION_KEY=your_fernet_encryption_key
   JWT_SECRET_KEY=your_jwt_secret

   # データベース
   POSTGRES_PASSWORD=password
   ```

3. **全サービスを起動**

   ```bash
   # 開発環境
   docker-compose up -d

   # 本番環境（Nginxリバースプロキシ付き）
   docker-compose --profile production up -d
   ```

4. **アクセス**
   - フロントエンド: http://localhost:3000
   - Go API: http://localhost:8080
   - AI サーバー: http://localhost:8000
   - データベース: localhost:5432

### 個別開発環境

各サービスを個別に開発する場合：

- 📖 **[フロントエンド開発](frontend/README.md)** - Next.js アプリケーション
- 🛠️ **[Go API 開発](backend-go/README.md)** - DDD 準拠の API サーバー
- 🤖 **[AI サーバー開発](backend-python/ai_server/README.md)** - AI 処理サーバー

## 🚀 開発・運用

### 開発環境

- **ローカル開発**: Docker Compose による統合環境
- **テスト**: 単体テスト・統合テスト・E2E テスト
- **コード品質**: ESLint・TypeScript・Prettier

### デプロイメント

- **フロントエンド**: Vercel (推奨) または任意のプラットフォーム
- **バックエンド**: AWS ECS/Fargate + RDS
- **データベース**: Supabase (マネージドサービス)

### Docker Compose コマンド

```bash
# 全サービス起動
docker-compose up -d

# 特定のサービスのみ起動
docker-compose up -d frontend go-api

# ログ確認
docker-compose logs -f [service-name]

# サービス停止
docker-compose down

# ボリュームも含めて完全削除
docker-compose down -v

# サービス再構築
docker-compose up --build -d

# 本番環境（Nginx付き）
docker-compose --profile production up -d
```

### 監視・運用

- **ヘルスチェック**: 各サービスの健全性監視
- **ログ管理**: 構造化ログによる問題追跡
- **メトリクス**: パフォーマンス・利用状況の監視

## 📊 スケーラビリティ

### 水平スケーリング

- **マイクロサービス化**: 機能別の独立したサービス
- **API Gateway**: 統一されたエンドポイント管理
- **データベース**: 読み取り専用レプリカの活用

### パフォーマンス最適化

- **キャッシュ戦略**: Redis による高速データアクセス
- **CDN**: 静的アセットの配信最適化
- **データベース**: インデックス最適化とクエリチューニング

## 🎯 ロードマップ

### Phase 1: MVP (現在)

- [x] 基本的なチャット機能
- [x] AI エージェントとの対話
- [x] 認証システム
- [x] レスポンシブデザイン

### Phase 2: 機能拡張

- [ ] 音声メッセージ対応
- [ ] 画像・ファイル共有
- [ ] グループチャット機能
- [ ] 通知システム強化

### Phase 3: AI 機能強化

- [ ] 感情分析
- [ ] 多言語対応
- [ ] カスタム AI エージェント作成
- [ ] 学習機能の高度化

### Phase 4: エコシステム拡張

- [ ] サードパーティ連携
- [ ] API 公開
- [ ] モバイルアプリ
- [ ] エンタープライズ機能

## 🤝 コントリビューション

### 開発に参加する方へ

開発ルールについては [CONTRIBUTING.md](CONTRIBUTING.md) をご確認ください。

- コミットメッセージ規約
- ブランチ命名規則
- プルリクエストガイドライン

## 📚 ドキュメント

### プロジェクト理解

- [フロントエンド README](frontend/README.md) - Next.js アプリケーションの詳細
- [Go バックエンド README](backend-go/README.md) - DDD 準拠の API サーバー
- [Python AI サーバー README](backend-python/ai_server/README.md) - AI 処理サーバー

### 技術ドキュメント

- [アーキテクチャガイド](frontend/docs/ARCHITECTURE.md) - システム設計の詳細
- [データベース設計](frontend/docs/DATABASE_DESIGN.md) - データベース構造
- [セットアップガイド](frontend/docs/SETUP.md) - 環境構築手順
- [新規エンジニア向けガイド](frontend/docs/GETTING_STARTED.md) - 開発の始め方

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## 📞 サポート・お問い合わせ

- **バグ報告**: [GitHub Issues](https://github.com/your-org/bridgespeak/issues)
- **機能要求**: [GitHub Discussions](https://github.com/your-org/bridgespeak/discussions)
- **技術的な質問**: チーム Slack チャンネル
- **メール**: support@bridgespeak.com

---

**BridgeSpeak** は、人間と AI の新しいコミュニケーション体験を創造する挑戦的なプロジェクトです。私たちと一緒に、テクノロジーが人間の生活をより豊かにする未来を築きませんか？

**Happy Coding! 🚀**

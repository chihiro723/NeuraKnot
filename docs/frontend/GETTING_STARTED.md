# 新規エンジニア向けプロジェクトガイド

## プロジェクト概要

**BridgeSpeak**は、人間と AI エージェントが自然にコミュニケーションできる革新的なメッセージングプラットフォームです。従来のチャットアプリの概念を超え、5 つの異なる個性を持つ AI エージェントとリアルタイムで対話できる環境を提供します。

### 🎯 プロジェクトの目的

- 人間と AI の新しいコミュニケーション体験の創造
- 直感的で使いやすいチャットインターフェースの提供
- パーソナライズされた AI 対話の実現

## 🏗️ 技術スタック

### フロントエンド

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UI**: React 18 + Lucide React icons
- **状態管理**: React Context API

### バックエンド

- **データベース**: PostgreSQL
- **認証**: AWS Cognito
- **API**: Go (Gin)

### 開発ツール

- **リンター**: ESLint
- **型チェック**: TypeScript
- **パッケージマネージャー**: npm

## 📁 プロジェクト構造の理解

```
bridgespeak/
├── app/                    # Next.js App Router - ページとルーティング
│   ├── auth/              # 認証関連ページ (ログイン・サインアップ)
│   ├── dashboard/         # メインダッシュボード
│   └── setup/             # 初期セットアップページ
├── components/            # Reactコンポーネント
│   ├── auth/              # 認証フォーム
│   ├── chat/              # チャット機能
│   ├── friends/           # 友だち管理
│   ├── layout/            # レイアウトコンポーネント
│   ├── settings/          # 設定画面
│   └── ui/                # 再利用可能なUIコンポーネント
├── lib/                   # ビジネスロジックとユーティリティ
│   ├── auth/              # 認証ロジック（AWS Cognito）
│   ├── constants/         # 定数定義
│   ├── data/              # データ取得・サンプルデータ
│   ├── hooks/             # カスタムReactフック
│   ├── types/             # TypeScript型定義
│   └── utils/             # ユーティリティ関数
```

### 重要なディレクトリの詳細

#### `components/` - UI コンポーネント

- **ui/**: ボタン、入力フィールドなど基本的な UI コンポーネント
- **chat/**: チャット機能に特化したコンポーネント群
- **layout/**: レスポンシブレイアウトの実装

#### `lib/` - ビジネスロジック

- **auth/**: AWS Cognito 認証の設定とヘルパー関数
- **hooks/**: 再利用可能な React フック
- **types/**: アプリケーション全体で使用する型定義

## 🚀 開発環境セットアップ

### 1. リポジトリのクローン

```bash
git clone [repository-url]
cd bridgespeak
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルに以下を設定:

```
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_cognito_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_cognito_client_id
NEXT_PUBLIC_COGNITO_DOMAIN=your_cognito_domain
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

### 4. データベースセットアップ

詳細は `docs/COGNITO_SETUP.md` を参照

### 5. 開発サーバーの起動

```bash
npm run dev
```

## 🤖 AI エージェントシステム

### 5 つのパーソナリティ

1. **サポート**: 技術的な質問や問題解決
2. **フレンドリー**: 親しみやすい日常会話
3. **ビジネス**: 仕事や業務効率化
4. **カジュアル**: のんびりリラックス
5. **ユーモア**: 笑いと楽しさ

### パーソナリティの実装

パーソナリティ定義は `lib/constants/personalities.ts` で管理されています。

## 📱 レスポンシブデザイン

### デスクトップ (1024px 以上)

- **レイアウト**: 2 カラム（サイドバー + メインエリア）
- **ナビゲーション**: タブ形式
- **表示**: チャット・友だち詳細・設定を同時表示

### モバイル (1023px 以下)

- **レイアウト**: フルスクリーン
- **ナビゲーション**: ボトムナビゲーション
- **表示**: 画面切り替え式

### 実装のポイント

- `useMediaQuery` フックでブレークポイント管理
- `ResponsiveLayout` コンポーネントで適切なレイアウトを選択

## 🔐 セキュリティ実装

### 認証システム

- **AWS Cognito**: セキュアな認証基盤
- **JWT トークン**: セッション管理
- **OAuth**: Google、LINE、X でのソーシャルログイン

### データ保護

- 全 API エンドポイントで認証チェック
- フロントエンド・バックエンド双方での入力検証
- 機密情報の環境変数管理

## 🛠️ 開発ワークフロー

### コードスタイル

- TypeScript の厳格な型チェック
- Tailwind CSS でのスタイリング
- ESLint によるコード品質チェック

### コンポーネント設計原則

1. **単一責任原則**: 各コンポーネントは一つの責任を持つ
2. **再利用性**: UI コンポーネントは汎用的に設計
3. **型安全性**: すべての Props と State を型定義

### ベストプラクティス

- カスタムフックでロジックの分離
- エラーバウンダリーでエラーハンドリング
- パフォーマンス最適化（React.memo, useMemo 等）

## 🚧 開発時の注意点

### パフォーマンス

- 大きなリストは仮想化を検討
- 画像は適切に最適化
- 不要な再レンダリングを避ける

### アクセシビリティ

- キーボードナビゲーション対応
- スクリーンリーダー対応
- 適切な ARIA ラベルの設定

### テスト

- 新機能には必ずテストを追加
- エッジケースを考慮
- リグレッションテストの実行

## 📚 学習リソース

### 必読ドキュメント

- [SETUP.md](./SETUP.md) - 完全なセットアップ手順
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャの詳細
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - データベース設計

### 外部リソース

- [Next.js App Router](https://nextjs.org/docs/app)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 チーム開発

### ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発ブランチ

### コミットメッセージ

```
type(scope): description

例:
feat(chat): add message encryption
fix(auth): resolve login redirect issue
docs(readme): update setup instructions
```

### プルリクエスト

- 機能ごとに小さな PR を作成
- レビューは必須
- CI チェックの通過を確認

## 🆘 トラブルシューティング

### よくある問題

#### 1. 環境変数が読み込まれない

```bash
# .envファイルの確認
cat .env

# 開発サーバーの再起動
npm run dev
```

#### 2. Cognito 接続エラー

- User Pool ID と Client ID の確認
- AWS Cognito プロジェクトの起動状態確認
- ネットワーク接続の確認

#### 3. TypeScript エラー

```bash
# 型チェック実行
npx tsc --noEmit

# ESLint実行
npm run lint
```

### サポート

- プロジェクトの課題や質問は GitHub Issues で管理
- チーム Slack チャンネルでのリアルタイム相談
- 週次開発ミーティングでの進捗共有

## 🎯 次のステップ

### 初回タスク推奨

1. ローカル環境でプロジェクトを起動
2. 簡単な UI コンポーネントの修正
3. チャット機能の動作確認
4. 小さな機能追加またはバグ修正

### スキルアップ

- React の最新機能（Server Components 等）
- AWS Cognito の高度な機能
- パフォーマンス最適化技術
- テスト駆動開発

---

このプロジェクトは、最新の Web 技術を使って人間と AI の新しいコミュニケーション体験を創造する挑戦的なプロジェクトです。疑問や困ったことがあれば、遠慮なくチームに相談してください！

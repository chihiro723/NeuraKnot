# ハイブリッドメッセージング

人間と AI エージェントとの新しいコミュニケーション体験を提供する Next.js アプリケーション

## 🚀 機能

- **リアルタイムチャット**: 人間と AI エージェントとのシームレスな会話
- **AI パーソナリティ**: 5 つの異なる個性を持つ AI エージェント（サポート、フレンドリー、ビジネス、カジュアル、ユーモア）
- **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
- **ダークモード**: システム設定に応じた自動切り替え
- **認証システム**: AWS Cognito を使用したセキュアな認証
- **友だち管理**: 人間と AI エージェントの統合管理

## 🛠 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: PostgreSQL
- **認証**: AWS Cognito
- **アイコン**: Lucide React
- **状態管理**: React Context API

## 📁 プロジェクト構造

```
bridgespeak/
├── app/                    # Next.js App Router - ページルーティング
│   ├── auth/              # 認証関連ページ（ログイン・サインアップ）
│   ├── dashboard/         # メインダッシュボード
│   └── setup/             # 初期セットアップページ
├── components/            # Reactコンポーネント
│   ├── auth/              # 認証フォーム
│   ├── chat/              # チャット機能
│   ├── dashboard/         # ダッシュボード
│   ├── friends/           # 友だち管理
│   ├── groups/            # グループチャット
│   ├── layout/            # レスポンシブレイアウト
│   ├── settings/          # 設定画面
│   └── ui/                # 再利用可能なUIコンポーネント
├── lib/                   # ビジネスロジックとユーティリティ
│   ├── auth/              # 認証ロジック
│   ├── constants/         # 定数定義
│   ├── contexts/          # Reactコンテキスト
│   ├── data/              # データ取得・サンプルデータ
│   ├── hooks/             # カスタムReactフック
│   ├── types/             # TypeScript型定義
│   └── utils/             # ユーティリティ関数
├── docs/                  # プロジェクトドキュメント
│   ├── ARCHITECTURE.md    # アーキテクチャ詳細
│   ├── DATABASE_DESIGN.md # データベース設計
│   ├── GETTING_STARTED.md # 新規エンジニア向けガイド
│   └── SETUP.md           # セットアップガイド
```

## 🎨 デザインシステム

### カラーパレット

- **プライマリ**: Green (500-600)
- **セカンダリ**: Gray (500-600)
- **アクセント**: Blue, Purple, Pink
- **ステータス**: Green (オンライン), Gray (オフライン)

### コンポーネント

- **Avatar**: プロフィール画像とステータス表示
- **Button**: 統一されたボタンスタイル
- **Input**: フォーム入力コンポーネント
- **LoadingSpinner**: ローディング表示
- **EmptyState**: 空状態の表示

## 🚀 クイックスタート

### 基本セットアップ

1. **リポジトリのクローン**

   ```bash
   git clone [repository-url]
   cd bridgespeak
   ```

2. **依存関係のインストール**

   ```bash
   npm install
   ```

3. **環境変数の設定**

   ```bash
   cp .env.example .env.local
   ```

   `.env.local`ファイルに AWS Cognito の接続情報を設定:

   ```
   NEXT_PUBLIC_AWS_REGION=ap-northeast-1
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_cognito_user_pool_id
   NEXT_PUBLIC_COGNITO_CLIENT_ID=your_cognito_client_id
   NEXT_PUBLIC_COGNITO_DOMAIN=your_cognito_domain
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
   ```

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

### 詳細セットアップ

初回セットアップや AWS Cognito の設定については、以下のガイドを参照してください：

- 📖 **[新規エンジニア向けガイド](docs/GETTING_STARTED.md)** - プロジェクト全体の理解
- 🛠️ **[セットアップガイド](docs/SETUP.md)** - 詳細なセットアップ手順
- 🏗️ **[アーキテクチャガイド](docs/ARCHITECTURE.md)** - 技術的な詳細

## 📱 レスポンシブデザイン

### デスクトップ (1024px 以上)

- 左サイドバー + 右メインエリアの 2 カラムレイアウト
- タブナビゲーション
- チャット・友だち詳細・設定の同時表示

### モバイル (1023px 以下)

- フルスクリーン表示
- ボトムナビゲーション
- 画面切り替え式の UI

## 🤖 AI パーソナリティ

1. **サポート**: 技術的な質問や問題解決
2. **フレンドリー**: 親しみやすい日常会話
3. **ビジネス**: 仕事や業務効率化
4. **カジュアル**: のんびりリラックス
5. **ユーモア**: 笑いと楽しさ

## 🔐 セキュリティ

- **Row Level Security (RLS)**: 全テーブルで有効
- **認証必須**: プライベートデータへのアクセス制御
- **入力検証**: フロントエンド・バックエンド両方で実装
- **CSRF 保護**: Next.js の標準機能を使用

## 🚀 デプロイ

### Vercel (推奨)

```bash
npm run build
vercel --prod
```

### その他のプラットフォーム

```bash
npm run build
npm start
```

## 📚 ドキュメント

### プロジェクト理解

- 📖 **[新規エンジニア向けガイド](docs/GETTING_STARTED.md)** - プロジェクト概要と開発の始め方
- 🏗️ **[アーキテクチャガイド](docs/ARCHITECTURE.md)** - システム設計と技術的詳細

### セットアップ・運用

- 🛠️ **[セットアップガイド](docs/SETUP.md)** - 環境構築の詳細手順

### 外部リソース

- [Next.js ドキュメント](https://nextjs.org/docs)
- [AWS Cognito ドキュメント](https://docs.aws.amazon.com/cognito/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)

## 🤝 コントリビューション

1. フォークしてブランチを作成
2. 変更を実装
3. テストを実行
4. プルリクエストを作成

## 📄 ライセンス

MIT License

## 🙏 謝辞

- [Next.js](https://nextjs.org/) - React フレームワーク
- [AWS Cognito](https://aws.amazon.com/cognito/) - 認証サービス
- [Tailwind CSS](https://tailwindcss.com/) - CSS フレームワーク
- [Lucide](https://lucide.dev/) - アイコンライブラリ

# アーキテクチャドキュメント

## 概要

ハイブリッドメッセージングアプリは、モダンなReact/Next.jsアーキテクチャを採用し、スケーラブルで保守性の高いコードベースを実現しています。

## アーキテクチャ原則

### 1. 関心の分離 (Separation of Concerns)
- **UI層**: プレゼンテーション専用
- **ビジネスロジック層**: アプリケーションロジック
- **データ層**: データアクセスとAPI通信

### 2. 単一責任原則 (Single Responsibility Principle)
- 各コンポーネントは単一の責任を持つ
- 機能ごとにファイルを分割
- 再利用可能なコンポーネント設計

### 3. 依存性の注入 (Dependency Injection)
- Reactコンテキストによる状態管理
- カスタムフックによるロジック分離
- 型安全性の確保

## ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証グループ
│   ├── dashboard/         # ダッシュボード
│   └── globals.css        # グローバルスタイル
├── components/            # UIコンポーネント
│   ├── ui/                # 基本UIコンポーネント
│   ├── features/          # 機能別コンポーネント
│   └── layout/            # レイアウトコンポーネント
├── lib/                   # ビジネスロジック
│   ├── types/             # 型定義
│   ├── hooks/             # カスタムフック
│   ├── utils/             # ユーティリティ
│   ├── constants/         # 定数
│   └── contexts/          # Reactコンテキスト
└── supabase/              # データベース
    └── migrations/        # マイグレーション
```

## コンポーネント設計

### 基本原則

1. **Atomic Design**: 原子・分子・有機体・テンプレート・ページの階層
2. **Props Interface**: 明確な型定義
3. **Default Props**: デフォルト値の設定
4. **Error Boundaries**: エラーハンドリング

### コンポーネント分類

#### 1. UI Components (`components/ui/`)
- 再利用可能な基本コンポーネント
- ビジネスロジックを含まない
- Storybookでのテスト対象

```typescript
// 例: Button コンポーネント
interface ButtonProps {
  variant: 'primary' | 'secondary'
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}
```

#### 2. Feature Components (`components/features/`)
- 特定の機能に特化したコンポーネント
- ビジネスロジックを含む
- カスタムフックを使用

#### 3. Layout Components (`components/layout/`)
- ページレイアウトの構造
- レスポンシブデザイン
- ナビゲーション

## 状態管理

### 1. ローカル状態 (useState)
- コンポーネント内の一時的な状態
- フォーム入力値
- UI状態（開閉状態など）

### 2. グローバル状態 (Context API)
- アプリケーション全体で共有する状態
- ユーザー情報
- テーマ設定

### 3. サーバー状態 (Supabase)
- データベースからの取得データ
- リアルタイム更新
- キャッシュ戦略

## データフロー

```
User Action → Component → Custom Hook → API/Database → State Update → UI Re-render
```

### 例: メッセージ送信フロー

1. ユーザーがメッセージを入力
2. `ChatWindow`コンポーネントがイベントを受信
3. `useMessages`フックがAPI呼び出し
4. Supabaseにデータを保存
5. リアルタイム更新でUIが再描画

## 型システム

### 型定義の階層

1. **基本型** (`lib/types/base.ts`)
   - プリミティブ型の拡張
   - 共通インターフェース

2. **ドメイン型** (`lib/types/domain.ts`)
   - ビジネスドメインの型
   - エンティティとバリューオブジェクト

3. **API型** (`lib/types/api.ts`)
   - APIレスポンスの型
   - リクエストパラメータ

### 型安全性の確保

```typescript
// 厳密な型チェック
interface User {
  readonly id: string
  readonly email: string
  readonly profile: Profile
}

// ユニオン型による状態管理
type LoadingState = 'idle' | 'loading' | 'success' | 'error'
```

## パフォーマンス最適化

### 1. コンポーネント最適化
- `React.memo`による不要な再描画防止
- `useMemo`による計算結果のキャッシュ
- `useCallback`による関数の安定化

### 2. バンドル最適化
- 動的インポートによるコード分割
- Tree Shakingによる不要コードの除去
- 画像最適化

### 3. データ取得最適化
- SWRによるキャッシュ戦略
- Suspenseによる非同期処理
- Prefetchingによる先読み

## セキュリティ

### 1. 認証・認可
- JWTトークンによる認証
- Row Level Security (RLS)
- RBAC (Role-Based Access Control)

### 2. 入力検証
- Zodによるスキーマ検証
- サニタイゼーション
- CSRFプロテクション

### 3. データ保護
- HTTPS通信の強制
- 機密情報の環境変数管理
- ログの適切な管理

## テスト戦略

### 1. 単体テスト (Jest + Testing Library)
- コンポーネントのテスト
- カスタムフックのテスト
- ユーティリティ関数のテスト

### 2. 統合テスト
- API統合テスト
- データベーステスト
- E2Eテスト (Playwright)

### 3. 視覚的回帰テスト
- Storybookによるコンポーネントテスト
- Chromatic による視覚的テスト

## デプロイメント

### 1. CI/CD パイプライン
- GitHub Actions
- 自動テスト実行
- 自動デプロイ

### 2. 環境管理
- 開発・ステージング・本番環境
- 環境変数の管理
- データベースマイグレーション

### 3. モニタリング
- エラートラッキング (Sentry)
- パフォーマンス監視
- ログ集約

## 今後の拡張性

### 1. マイクロサービス化
- 機能別サービス分割
- API Gateway
- サービス間通信

### 2. リアルタイム機能強化
- WebSocket接続
- プッシュ通知
- オフライン対応

### 3. AI機能拡張
- 自然言語処理
- 感情分析
- パーソナライゼーション
# エラーハンドリング アーキテクチャ

## 概要

Next.js App Router のエラーハンドリング機能を活用し、階層的で保守性の高いエラー処理を実装しています。

## Next.js のエラーハンドリングの仕組み

### 自動継承

Next.js App Router では、`error.tsx` と `not-found.tsx` は**親ディレクトリのものを自動的に継承**します。

```
app/
├── error.tsx                # レベル1: アプリ全体
└── dashboard/
    ├── error.tsx            # レベル2: ダッシュボード全体（レベル1を上書き）
    └── chats/
        ├── page.tsx         # error.tsx → 親のdashboard/error.tsxを使用
        └── [id]/
            └── page.tsx     # error.tsx → 親のdashboard/error.tsxを使用
```

**ベストプラクティス:**

- ✅ 共通のエラー UI は親階層で定義
- ✅ 特別なカスタマイズが必要な場合のみ子階層で上書き
- ❌ すべての階層で error.tsx を定義しない（冗長）

## プロジェクトのエラー階層構造

### 1. アプリレベル

```
app/
├── not-found.tsx            # アプリ全体の404
└── dashboard/
    ├── error.tsx            # ダッシュボード全体のエラー
    ├── not-found.tsx        # ダッシュボード全体の404
    └── ...
```

**役割:**

- `app/not-found.tsx` - 認証前のページや存在しないルート
- `app/dashboard/error.tsx` - ダッシュボード内のすべてのエラー
- `app/dashboard/not-found.tsx` - ダッシュボード内の存在しないページ

### 2. セクションレベル

```
app/dashboard/
├── chats/
│   ├── page.tsx             # error.tsx → 親を使用 ✅
│   ├── loading.tsx          # ローディングUI（固有）
│   └── [id]/
│       ├── page.tsx         # error.tsx → 親を使用 ✅
│       ├── loading.tsx      # ローディングUI（固有）
│       └── not-found.tsx    # 404 UI（固有） ⚠️
│
├── roster/
│   ├── page.tsx             # error.tsx → 親を使用 ✅
│   └── [id]/
│       ├── page.tsx         # error.tsx → 親を使用 ✅
│       └── not-found.tsx    # 404 UI（固有） ⚠️
│
├── add/
│   ├── page.tsx             # error.tsx → 親を使用 ✅
│   └── ...
│
├── services/
│   ├── page.tsx             # error.tsx → 親を使用 ✅
│   └── ...
│
└── settings/
    ├── page.tsx             # error.tsx → 親を使用 ✅
    └── ...
```

**戦略:**

- ✅ **error.tsx は定義しない** → 親の `dashboard/error.tsx` を継承
- ⚠️ **not-found.tsx は必要な場合のみ** → リソース固有のメッセージが必要な[id]ページのみ

### 3. 詳細ページレベル

```
app/dashboard/chats/[id]/
├── page.tsx                 # SSRでチャット詳細を表示
├── loading.tsx              # ローディングUI
└── not-found.tsx            # チャット固有の404メッセージ
```

**なぜ not-found.tsx が必要？**

親の `dashboard/not-found.tsx` は汎用的なメッセージですが、
詳細ページでは**リソース固有のメッセージ**を表示したい：

```tsx
// ❌ 汎用的（dashboard/not-found.tsx）
"ページが見つかりません"

// ✅ 具体的（chats/[id]/not-found.tsx）
"チャットが見つかりません"
"チャット一覧に戻る" ← 適切な戻り先
```

## エラー UI コンポーネント

### 1. ErrorDisplay（エラー処理）

```tsx
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";

export default function DashboardError({ error, reset }) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="ダッシュボードの読み込みに失敗しました"
      description="問題が発生しました。もう一度お試しください。"
    />
  );
}
```

**特徴:**

- 🎨 統一されたデザイン
- 🔄 再試行ボタン
- 🏠 ダッシュボードに戻るボタン
- 🐛 開発環境でエラー詳細表示

### 2. NotFoundDisplay（404 処理）

```tsx
import { NotFoundDisplay } from "@/components/ui/NotFoundDisplay";
import { MessageCircle } from "lucide-react";

export default function ChatNotFound() {
  return (
    <NotFoundDisplay
      icon={MessageCircle}
      title="チャットが見つかりません"
      description="このチャットは存在しないか、削除された可能性があります。"
      backLink="/dashboard/chats"
      backLabel="チャット一覧に戻る"
    />
  );
}
```

**特徴:**

- 🎯 カスタマイズ可能なアイコン
- 📝 カスタマイズ可能なメッセージ
- 🔗 適切な戻り先

## エラーハンドリングのフロー

### 1. エラー発生時

```
ユーザーアクション
  ↓
Server Component でエラー発生
  ↓
最も近い error.tsx が捕捉
  ↓
親の dashboard/error.tsx が表示
  ↓
ErrorDisplay コンポーネントでレンダリング
```

### 2. 404 発生時（notFound()呼び出し）

```
Server Component で notFound() 呼び出し
  ↓
最も近い not-found.tsx を探索
  ↓
chats/[id]/not-found.tsx が見つかる
  ↓
NotFoundDisplay でレンダリング（チャット固有のメッセージ）
```

### 3. 404 発生時（存在しない URL）

```
存在しないURL（例: /dashboard/xyz）
  ↓
最も近い not-found.tsx を探索
  ↓
dashboard/not-found.tsx が見つかる
  ↓
NotFoundDisplay でレンダリング（汎用メッセージ）
```

## ファイル構成の原則

### ✅ DO（推奨）

```
app/dashboard/
├── error.tsx                # 共通のエラーハンドリング
├── not-found.tsx            # 共通の404ハンドリング
└── chats/
    ├── page.tsx             # error/not-foundは親を継承
    └── [id]/
        ├── page.tsx
        └── not-found.tsx    # リソース固有のメッセージ
```

### ❌ DON'T（非推奨）

```
app/dashboard/
├── error.tsx
├── not-found.tsx
└── chats/
    ├── error.tsx            # ❌ 冗長（親と同じなら不要）
    ├── not-found.tsx        # ❌ 冗長（親と同じなら不要）
    ├── page.tsx
    └── [id]/
        ├── page.tsx
        ├── error.tsx        # ❌ 冗長
        └── not-found.tsx    # ✅ これは必要（固有メッセージ）
```

## 実装パターン

### パターン 1: 共通エラーハンドリング

**使用場所:** セクションレベル（chats, roster, add, services, settings）

```tsx
// app/dashboard/error.tsx
export default function DashboardError({ error, reset }) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="エラーが発生しました"
      description="問題が発生しました。もう一度お試しください。"
    />
  );
}
```

**継承されるページ:**

- `/dashboard/chats`
- `/dashboard/chats/[id]`
- `/dashboard/roster`
- `/dashboard/roster/[id]`
- `/dashboard/add/*`
- `/dashboard/services/*`
- `/dashboard/settings/*`

### パターン 2: リソース固有の 404

**使用場所:** 動的ルート（[id]）

```tsx
// app/dashboard/chats/[id]/not-found.tsx
export default function ChatNotFound() {
  return (
    <NotFoundDisplay
      icon={MessageCircle}
      title="チャットが見つかりません"
      backLink="/dashboard/chats"
      backLabel="チャット一覧に戻る"
    />
  );
}
```

**なぜ必要？**

- リソース名を明示（"チャット"、"友だち"）
- 適切な戻り先（チャット一覧、友だち一覧）
- ユーザー体験の向上

### パターン 3: 汎用 404（フォールバック）

**使用場所:** ディレクトリレベル

```tsx
// app/dashboard/not-found.tsx
export default function DashboardNotFound() {
  return (
    <NotFoundDisplay
      icon={Search}
      title="ページが見つかりません"
      backLink="/dashboard/chats"
      backLabel="ダッシュボードに戻る"
    />
  );
}
```

**継承されるページ:**

- `/dashboard/xyz`（存在しないページ）
- `/dashboard/chats/xyz`（[id]以外）
- その他、not-found.tsx が定義されていないページ

## メリット

### 1. DRY 原則

- ✅ エラーハンドリングを 1 箇所に集約
- ✅ 重複コードを排除
- ✅ 保守性の向上

### 2. 一貫性

- ✅ すべてのページで統一されたエラー UI
- ✅ 統一された UX
- ✅ ブランディングの一貫性

### 3. 柔軟性

- ✅ 必要な場所でのみカスタマイズ
- ✅ 階層的な上書きが可能
- ✅ Next.js の仕組みを最大限活用

### 4. パフォーマンス

- ✅ コード量の削減
- ✅ バンドルサイズの削減
- ✅ メンテナンスコストの削減

## トラブルシューティング

### Q: エラーページが表示されない

**A:** error.tsx は Client Component である必要があります。

```tsx
"use client"; // ← 必須

export default function Error({ error, reset }) {
  // ...
}
```

### Q: not-found.tsx が表示されない

**A:** Server Component で `notFound()` を呼び出す必要があります。

```tsx
import { notFound } from "next/navigation";

export default async function Page({ params }) {
  const data = await fetchData(params.id);

  if (!data) {
    notFound(); // ← これで not-found.tsx が表示される
  }

  return <div>{data.name}</div>;
}
```

### Q: 親のエラーページを継承したくない

**A:** 子階層で新しい error.tsx を作成すれば、それが優先されます。

```
app/dashboard/
├── error.tsx              # 汎用エラー
└── chats/
    └── error.tsx          # チャット固有のエラー（親を上書き）
```

## まとめ

✅ **階層的なエラーハンドリング** - Next.js の継承機能を活用  
✅ **DRY 原則** - 共通処理を親階層で定義  
✅ **柔軟なカスタマイズ** - 必要な場所でのみ上書き  
✅ **統一された UI** - ErrorDisplay/NotFoundDisplay コンポーネント  
✅ **保守性の高い設計** - 変更が容易、テストが可能

この設計により、クリーンで保守性の高いエラーハンドリングを実現しています。

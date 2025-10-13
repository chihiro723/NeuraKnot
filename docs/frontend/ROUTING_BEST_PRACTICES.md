# Next.js App Router ベストプラクティス

## 概要

このドキュメントでは、本プロジェクトで採用している Next.js App Router のベストプラクティスを解説します。

## アーキテクチャ原則

### ❌ アンチパターン

```tsx
// ❌ 悪い例: layout.tsx でデータフェッチ
export default async function ChatsLayout({ children }) {
  // layoutは全ての子ページで共有されるため非効率
  const data = await fetchData();

  return (
    <SidebarLayout sidebar={<Sidebar data={data} />}>{children}</SidebarLayout>
  );
}
```

**問題点:**

- layout は全ての子ページ（`page.tsx`, `[id]/page.tsx`）で共有される
- 子ページに移動しても layout は再レンダリングされない
- データが変わらないのに毎回フェッチされる可能性
- キャッシュの恩恵を受けにくい

### ✅ ベストプラクティス

```tsx
// ✅ 良い例: layout.tsx はUI構造のみ
export default function ChatsLayout({ children }) {
  return <>{children}</>;
}

// ✅ 良い例: page.tsx でデータフェッチ
export const revalidate = 60; // キャッシング戦略

export default async function ChatsPage() {
  const data = await fetchData();

  return (
    <SidebarLayout sidebar={<Sidebar data={data} />}>
      <MainContent data={data} />
    </SidebarLayout>
  );
}
```

**メリット:**

- 各ページが独立してデータフェッチ
- ページごとに異なるキャッシング戦略を設定可能
- Static/Dynamic の制御が容易
- パフォーマンス最適化しやすい

## ディレクトリ構造

### 統一された構造

```
app/dashboard/
├── chats/                    # チャットセクション
│   ├── page.tsx             # 一覧ページ（サーバーコンポーネント、データフェッチ）
│   ├── layout.tsx           # UI構造のみ（データフェッチなし）
│   ├── loading.tsx          # ローディングUI
│   ├── error.tsx            # エラーUI
│   └── [id]/                # 動的ルート
│       ├── page.tsx         # 詳細ページ（サーバーコンポーネント、SSR）
│       ├── loading.tsx      # ローディングUI
│       └── not-found.tsx    # 404ページ
│
├── roster/                   # 名簿セクション
│   ├── page.tsx             # 一覧ページ
│   ├── layout.tsx           # UI構造のみ
│   ├── loading.tsx          # ローディングUI
│   └── [id]/                # 動的ルート
│       ├── page.tsx         # 詳細ページ
│       └── not-found.tsx    # 404ページ
│
├── add/                      # 新規追加セクション
│   ├── page.tsx             # デフォルトページ
│   ├── layout.tsx           # UI構造のみ
│   ├── ai/page.tsx          # AIエージェント追加
│   ├── user/page.tsx        # ユーザー追加
│   └── group/page.tsx       # グループ作成
│
├── services/                 # 外部サービスセクション
│   ├── page.tsx             # デフォルトページ
│   ├── layout.tsx           # UI構造のみ
│   ├── my-services/page.tsx # マイサービス
│   └── register/page.tsx    # 新規登録
│
└── settings/                 # 設定セクション
    ├── page.tsx             # プロフィール設定（デフォルト）
    ├── layout.tsx           # UI構造のみ
    ├── subscription/page.tsx # サブスクリプション
    └── analytics/page.tsx    # 統計・分析
```

## Server Component と Client Component の使い分け

### Server Component（page.tsx）

**役割:**

- データフェッチ
- Server Actions の直接呼び出し
- 認証情報の処理
- 初期データの準備

**メリット:**

- SEO に有利（HTML にデータが含まれる）
- 初期ロードが高速
- サーバー側でデータ処理
- セキュリティ強化

**例:**

```tsx
// app/dashboard/chats/page.tsx
export const revalidate = 60; // 60秒ごとに再検証

export default async function ChatsPage() {
  // サーバーサイドでデータフェッチ
  const [conversationsResult, agentsResult] = await Promise.all([
    listConversations(),
    listAIAgents(),
  ]);

  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="トーク">
          <ChatListClient
            initialConversations={conversationsResult.data}
            initialAgents={agentsResult.data}
          />
        </DashboardSidebar>
      }
    >
      <MainContent />
    </SidebarLayout>
  );
}
```

### Client Component（\*Client.tsx）

**役割:**

- ユーザーインタラクション
- 状態管理（useState, useContext）
- イベントハンドラー
- ブラウザ API の使用
- React フックの使用

**例:**

```tsx
// components/chat/ChatListClient.tsx
"use client";

import { useMemo } from "react";

interface ChatListClientProps {
  initialConversations: any;
  initialAgents: any;
}

export function ChatListClient({
  initialConversations,
  initialAgents,
}: ChatListClientProps) {
  // サーバーから渡されたデータを変換
  const conversations = useMemo(() => {
    return transformData(initialConversations, initialAgents);
  }, [initialConversations, initialAgents]);

  return <div>{/* UI */}</div>;
}
```

## データフローパターン

### 1. リスト表示パターン

```
Server Component (page.tsx)
  ↓ サーバーサイドでデータフェッチ
  ↓ await listItems()
  ↓
Client Component (*ListClient.tsx)
  ↓ props でデータを受け取る
  ↓ useMemo でデータ変換
  ↓
UI にレンダリング
```

**実装例:**

```tsx
// page.tsx
export default async function ChatsPage() {
  const data = await fetchData();
  return <ChatListClient initialData={data} />;
}

// ChatListClient.tsx
"use client";
export function ChatListClient({ initialData }) {
  const items = useMemo(() => transform(initialData), [initialData]);
  return <div>{items.map(...)}</div>;
}
```

### 2. 詳細表示パターン（Dynamic Routes）

```
Server Component ([id]/page.tsx)
  ↓ URLパラメータから ID 取得
  ↓ params.id
  ↓ サーバーサイドでデータフェッチ
  ↓ await getItemById(id)
  ↓ データが見つからない → notFound()
  ↓
Client Component (*DetailClient.tsx)
  ↓ props でデータを受け取る
  ↓ useEffect で Context 更新
  ↓
UI にレンダリング
```

**実装例:**

```tsx
// [id]/page.tsx
export default async function ChatDetailPage({ params }) {
  const chat = await getChatById(params.id);

  if (!chat) {
    notFound(); // 404ページを表示
  }

  return <ChatWindowClient chatData={chat} />;
}

// ChatWindowClient.tsx
("use client");
export function ChatWindowClient({ chatData }) {
  useEffect(() => {
    setSelectedChat(chatData); // Context更新
  }, [chatData]);

  return <div>{/* UI */}</div>;
}
```

## キャッシング戦略

### 1. Revalidation

```tsx
// 60秒ごとに再検証（ISR: Incremental Static Regeneration）
export const revalidate = 60;

export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}
```

### 2. Dynamic Rendering

```tsx
// 常に動的レンダリング（リアルタイム性が重要な場合）
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}
```

### 3. Static Rendering

```tsx
// 完全に静的（ビルド時のみ）
export const dynamic = "force-static";

export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}
```

### プロジェクトでの推奨設定

```tsx
// チャット一覧: 60秒キャッシュ（頻繁に更新）
// app/dashboard/chats/page.tsx
export const revalidate = 60;

// チャット詳細: 30秒キャッシュ（リアルタイム性重視）
// app/dashboard/chats/[id]/page.tsx
export const revalidate = 30;

// 名簿一覧: 60秒キャッシュ
// app/dashboard/roster/page.tsx
export const revalidate = 60;

// 設定ページ: 静的（あまり変わらない）
// app/dashboard/settings/page.tsx
// revalidate 未設定（デフォルトの静的生成）
```

## ローディングとエラーハンドリング

### 1. Loading UI

```tsx
// app/dashboard/chats/loading.tsx
export default function ChatsLoading() {
  return <SkeletonUI />;
}
```

**メリット:**

- 自動的に Suspense 境界として機能
- ページ遷移時に即座に表示
- ユーザー体験の向上

### 2. Error Boundary

```tsx
// app/dashboard/chats/error.tsx
"use client";

export default function ChatsError({ error, reset }) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <button onClick={reset}>再試行</button>
    </div>
  );
}
```

### 3. Not Found

```tsx
// app/dashboard/chats/[id]/not-found.tsx
export default function ChatNotFound() {
  return <div>チャットが見つかりません</div>;
}

// page.tsx で使用
export default async function Page({ params }) {
  const chat = await getChatById(params.id);

  if (!chat) {
    notFound(); // not-found.tsx を表示
  }

  return <div>{chat.name}</div>;
}
```

## パフォーマンス最適化

### 1. 並列データフェッチ

```tsx
// ✅ 良い例: Promise.all で並列フェッチ
const [conversations, agents] = await Promise.all([
  listConversations(),
  listAIAgents(),
]);

// ❌ 悪い例: 逐次フェッチ
const conversations = await listConversations();
const agents = await listAIAgents(); // conversationsの完了を待ってから実行
```

### 2. useMemo によるメモ化

```tsx
"use client";

export function ChatListClient({ initialData }) {
  // 重い計算をキャッシュ
  const processedData = useMemo(() => {
    return initialData.map(item => heavyTransform(item));
  }, [initialData]);

  return <div>{processedData.map(...)}</div>;
}
```

### 3. 条件付きデータフェッチ

```tsx
export default async function Page({ params }) {
  // 必要なデータのみフェッチ
  const baseData = await getBaseData();

  // 条件に応じて追加データをフェッチ
  const extraData = params.includeExtra ? await getExtraData() : null;

  return <Component base={baseData} extra={extraData} />;
}
```

## Static vs Dynamic Routes

### Static Routes（静的ルート）

```
/dashboard/chats          → チャット一覧
/dashboard/roster         → 名簿一覧
/dashboard/add            → 新規追加
/dashboard/services       → 外部サービス
/dashboard/settings       → 設定
```

**特徴:**

- ビルド時に HTML を生成
- 高速な初期表示
- CDN でキャッシュ可能
- `revalidate` で ISR 可能

### Dynamic Routes（動的ルート）

```
/dashboard/chats/[id]     → 個別チャット
/dashboard/roster/[id]    → 友だち詳細
```

**特徴:**

- リクエスト時に HTML を生成（SSR）
- URL パラメータに基づいてコンテンツ変化
- `notFound()` で 404 ハンドリング
- リアルタイムデータに適している

### generateStaticParams（将来的な最適化）

```tsx
// ビルド時に特定のIDのページを事前生成
export async function generateStaticParams() {
  const chats = await getAllChats();

  return chats.map((chat) => ({
    id: chat.id,
  }));
}

export default async function Page({ params }) {
  const chat = await getChatById(params.id);
  return <div>{chat.name}</div>;
}
```

**メリット:**

- よくアクセスされるページを事前生成
- 初期表示が高速
- 残りのページはオンデマンドで生成

## 認証の扱い

### Server Component での認証

```tsx
// Server Actionは自動的にCookieから認証情報を取得
export default async function Page() {
  const data = await listConversations(); // 内部で認証チェック
  return <Component data={data} />;
}
```

### Client Component での認証

```tsx
"use client";

export function Component() {
  const { user, profile } = useDashboard(); // Context から取得
  return <div>{profile.display_name}</div>;
}
```

## まとめ

### ✅ 実装されたベストプラクティス

1. **layout.tsx は UI 構造のみ**

   - データフェッチなし
   - 子ページに共通の構造を提供

2. **page.tsx でデータフェッチ**

   - Server Component として実装
   - Server Actions を直接呼び出し
   - 並列フェッチで最適化

3. **Dynamic Routes で SSR**

   - URL パラメータからデータ取得
   - `notFound()` で 404 ハンドリング
   - リアルタイムデータに対応

4. **適切なキャッシング戦略**

   - `revalidate` で ISR 実装
   - ページごとに最適な設定

5. **ローディングとエラーハンドリング**

   - `loading.tsx` で Suspense
   - `error.tsx` で Error Boundary
   - `not-found.tsx` で 404

6. **パフォーマンス最適化**
   - 並列データフェッチ
   - useMemo によるメモ化
   - Server/Client の適切な分離

### 🎯 パフォーマンスメリット

| 項目            | 変更前                           | 変更後                       |
| --------------- | -------------------------------- | ---------------------------- |
| 初期ロード      | クライアント側でフェッチ（遅い） | サーバー側でフェッチ（高速） |
| SEO             | 空の HTML（不利）                | データ入り HTML（有利）      |
| キャッシュ      | なし                             | ISR で自動キャッシュ         |
| URL 直アクセス  | データなし（エラー）             | SSR で正常表示               |
| ローディング UI | カスタム実装                     | Next.js 標準（Suspense）     |

### 📚 参考資料

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [Caching in Next.js](https://nextjs.org/docs/app/building-your-application/caching)
- [Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

---

このアーキテクチャにより、スケーラブルで保守性の高い、パフォーマンスに優れたアプリケーションを構築できています。

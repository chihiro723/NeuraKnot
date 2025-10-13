# サーバーサイドフェッチ実装ガイド

## 概要

Next.js App Router を活用して、データフェッチをサーバーサイドで行う実装に変更しました。

## 実装の概要

### 変更前（クライアントサイドフェッチ）

```tsx
"use client";

export default function ChatsLayout({ children }) {
  return (
    <SidebarLayout
      sidebar={
        <DashboardSidebar title="トーク">
          <ChatListClient /> {/* 内部でuseEffectでフェッチ */}
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
```

### 変更後（サーバーサイドフェッチ）

```tsx
// "use client"を削除 → Server Component

import { listConversations } from "@/lib/actions/conversation-actions";
import { listAIAgents } from "@/lib/actions/ai-agent-actions";

export default async function ChatsLayout({ children }) {
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
            initialConversations={
              conversationsResult.success ? conversationsResult.data : null
            }
            initialAgents={agentsResult.success ? agentsResult.data : null}
          />
        </DashboardSidebar>
      }
    >
      {children}
    </SidebarLayout>
  );
}
```

## メリット

### 1. **初期ロードの高速化**

- サーバーでデータを取得済み
- クライアントでのロード時間が短縮
- ユーザー体験の向上

### 2. **SEO 改善**

- HTML にデータが含まれる
- クローラーがコンテンツを認識可能
- 検索エンジンのランキング向上

### 3. **Server Actions の直接使用**

- 認証トークンをサーバー側で処理
- クライアント側での複雑な認証処理が不要
- セキュリティの向上

### 4. **ストリーミング対応**

- Next.js の Suspense と組み合わせ可能
- 段階的なコンテンツ表示
- より滑らかなユーザー体験

## 実装したセクション

### 1. チャット（/dashboard/chats）

**layout.tsx**

```tsx
export default async function ChatsLayout({ children }) {
  const [conversationsResult, agentsResult] = await Promise.all([
    listConversations(),
    listAIAgents(),
  ]);

  return (
    <SidebarLayout sidebar={...}>
      {children}
    </SidebarLayout>
  );
}
```

**ChatListClient.tsx**

```tsx
interface ChatListClientProps {
  initialConversations: any;
  initialAgents: any;
}

export function ChatListClient({ initialConversations, initialAgents }) {
  // useMemoでデータを変換
  const conversations = useMemo(() => {
    if (!initialConversations?.conversations || !initialAgents?.agents) {
      return [];
    }
    // データ変換ロジック
  }, [initialConversations, initialAgents]);

  // useEffectでのフェッチは削除
}
```

### 2. 名簿（/dashboard/roster）

**layout.tsx**

```tsx
export default async function RosterLayout({ children }) {
  const agentsResult = await listAIAgents();

  return (
    <SidebarLayout sidebar={...}>
      {children}
    </SidebarLayout>
  );
}
```

**RosterListClient.tsx**

```tsx
interface RosterListClientProps {
  initialAgents: any;
}

export function RosterListClient({ initialAgents }) {
  const friends = useMemo(() => {
    if (!initialAgents?.agents) {
      return [];
    }
    // データ変換ロジック
  }, [initialAgents]);
}
```

### 3. その他のセクション

以下のセクションは静的なメニュー表示のみなので、Server Component に変更:

- `/dashboard/add` - 新規追加
- `/dashboard/services` - 外部サービス
- `/dashboard/settings` - 設定

## 技術的な詳細

### Server Component と Client Component の使い分け

#### Server Component（layout.tsx）

- データフェッチ
- Server Actions の直接呼び出し
- 認証情報の処理
- 初期データの準備

#### Client Component（\*Client.tsx）

- ユーザーインタラクション
- 状態管理（useState）
- イベントハンドラー
- ブラウザ API の使用

### データフロー

```
1. Server Component (layout.tsx)
   ↓
   サーバーサイドでデータフェッチ
   ↓
2. Client Component にpropsで渡す
   ↓
3. useMemoでデータを変換・最適化
   ↓
4. UIにレンダリング
```

### 認証の扱い

#### Server Component での認証

```tsx
// Server Actionは自動的にCookieから認証情報を取得
const result = await listConversations();
```

#### Client Component での認証

```tsx
// DashboardProviderから認証済みユーザー情報を取得
const { user, profile } = useDashboard();
```

## パフォーマンス最適化

### 1. **並列フェッチ**

```tsx
const [conversationsResult, agentsResult] = await Promise.all([
  listConversations(),
  listAIAgents(),
]);
```

### 2. **useMemo によるメモ化**

```tsx
const conversations = useMemo(() => {
  // 重い計算をキャッシュ
}, [initialConversations, initialAgents]);
```

### 3. **データの事前フェッチ**

- ユーザーがページに到達する前にデータを準備
- クライアント側でのローディング時間を削減

## 今後の拡張

### 1. **Suspense の追加**

```tsx
<Suspense fallback={<LoadingSpinner />}>
  <ChatListClient initialConversations={...} />
</Suspense>
```

### 2. **ストリーミング**

```tsx
// データの一部を先に表示、残りを後から読み込み
```

### 3. **Revalidation**

```tsx
// 定期的にデータを再検証
export const revalidate = 60; // 60秒ごと
```

### 4. **キャッシング**

```tsx
// Server Actionsの結果をキャッシュ
export const dynamic = "force-cache";
```

## 注意点

### 1. **app/dashboard/layout.tsx は Client Component のまま**

- 認証チェックに `useCognitoAuth` を使用
- ブラウザ API を使用
- この層はクライアント側で実行される必要がある

### 2. **各セクションの layout.tsx は Server Component**

- データフェッチを実行
- 子コンポーネントにデータを渡す
- サーバー側で実行

### 3. **型安全性**

```tsx
// 明示的な型指定を追加
const conversations = useMemo(() => {
  return data.map((conv: ConversationData) => {
    // ...
  });
}, [data]);
```

## まとめ

サーバーサイドフェッチに移行することで:

✅ **パフォーマンス向上** - 初期ロードが高速化  
✅ **SEO 改善** - クローラーがコンテンツを認識  
✅ **セキュリティ強化** - 認証情報をサーバー側で処理  
✅ **コードの簡潔化** - useEffect の削除、状態管理の簡略化  
✅ **型安全性** - サーバー側で型チェック

Next.js App Router の強力な機能を最大限に活用できています。

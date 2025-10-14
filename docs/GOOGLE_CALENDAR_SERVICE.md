# Google Calendar Service

## 概要

Google Calendar APIを使用して、Googleカレンダーのイベントを管理するサービスです。

## 機能

### 1. 今日のイベント取得 (`get_today_events`)
- 今日のカレンダーイベントを一覧表示
- 時刻、タイトル、場所、説明を含む

### 2. 今後のイベント取得 (`get_upcoming_events`)
- 指定した日数分の今後のイベントを取得
- パラメータ:
  - `days` (整数): 取得する日数（1〜30日）

### 3. イベント作成 (`create_event`)
- 新しいカレンダーイベントを作成
- パラメータ:
  - `summary` (文字列): イベントのタイトル
  - `start_datetime` (文字列): 開始日時（ISO 8601形式、例: 2024-12-25T10:00:00）
  - `end_datetime` (文字列): 終了日時（ISO 8601形式、例: 2024-12-25T11:00:00）
  - `description` (文字列、オプション): イベントの説明
  - `location` (文字列、オプション): 場所

### 4. イベント詳細取得 (`get_event_details`)
- 指定したイベントの詳細情報を取得
- パラメータ:
  - `event_id` (文字列): イベントID

### 5. イベント更新 (`update_event`)
- 既存のカレンダーイベントを更新
- パラメータ:
  - `event_id` (文字列): イベントID
  - `summary` (文字列、オプション): 新しいタイトル
  - `start_datetime` (文字列、オプション): 新しい開始日時
  - `end_datetime` (文字列、オプション): 新しい終了日時
  - `description` (文字列、オプション): 新しい説明
  - `location` (文字列、オプション): 新しい場所

### 6. イベント削除 (`delete_event`)
- 指定したカレンダーイベントを削除
- パラメータ:
  - `event_id` (文字列): 削除するイベントのID

### 7. イベント検索 (`search_events`)
- キーワードでカレンダーイベントを検索
- パラメータ:
  - `keyword` (文字列): 検索キーワード

## 認証

### 認証情報の入力フィールド

- **access_token** (必須): Google Calendar API OAuth 2.0 アクセストークン

### OAuth 2.0 アクセストークンの取得方法

#### 方法1: OAuth Playground（推奨・最も簡単）

1. **OAuth Playgroundにアクセス**
   - https://developers.google.com/oauthplayground にアクセス

2. **設定**
   - 右上の歯車アイコンをクリック
   - 「Use your own OAuth credentials」をチェック（自分のクライアントIDを使う場合）
   - または、デフォルトのGoogle credentials をそのまま使用

3. **スコープを選択**
   - 左側の「Step 1 Select & authorize APIs」で「Google Calendar API v3」を選択
   - スコープ `https://www.googleapis.com/auth/calendar` を選択
   - 「Authorize APIs」をクリック

4. **Googleアカウントで認証**
   - Googleアカウントでログイン
   - 権限を承認

5. **トークンを取得**
   - 「Exchange authorization code for tokens」をクリック
   - 表示された `access_token` をコピー

#### 方法2: gcloud CLI

```bash
# Google Cloud SDKがインストール済みの場合
gcloud auth application-default login
gcloud auth application-default print-access-token
```

#### 方法3: 自分のOAuth 2.0クライアントを作成（高度）

1. **Google Cloud Consoleでプロジェクトを作成**
   - https://console.cloud.google.com/ にアクセス
   - 新しいプロジェクトを作成

2. **Google Calendar APIを有効化**
   - 「APIとサービス」→「ライブラリ」に移動
   - 「Google Calendar API」を検索して有効化

3. **OAuth 2.0 認証情報を作成**
   - 「APIとサービス」→「認証情報」に移動
   - 「認証情報を作成」→「OAuth クライアント ID」を選択
   - アプリケーションの種類を選択（デスクトップアプリまたはウェブアプリ）
   - リダイレクト URI を設定（例: `http://localhost:8080` または `https://developers.google.com/oauthplayground`）

4. **OAuth Playgroundで使用**
   - OAuth Playground の設定で「Use your own OAuth credentials」をチェック
   - 作成した OAuth Client ID と Client Secret を入力
   - 上記「方法1」の手順3以降を実行

### BridgeSpeakへの登録

1. **ダッシュボードからサービス登録**
   - ダッシュボード → 外部サービス → 新規登録
   - 「Google Calendar」を選択

2. **アクセストークンを入力**
   - 「アクセストークン」フィールドに取得したトークンを貼り付け
   - 「サービスを登録」をクリック

3. **エージェントに紐付け**
   - 新規追加 → エージェント作成
   - 「外部サービス連携」→「サービスを追加」
   - 「Google Calendar」を選択
   - 使用するツールを選択（デフォルトは全ツール）
   - エージェントを作成

## 使用例

### エージェントに質問

**今日の予定を確認:**
```
今日の予定を教えて
```

**今週の予定を確認:**
```
今後7日間の予定を教えて
```

**イベントを作成:**
```
12月25日の10時から11時まで「クリスマスパーティー」という予定を作成して
場所は「東京タワー」で
```

**イベントを検索:**
```
「ミーティング」という予定を検索して
```

## 注意事項

### アクセストークンの有効期限
- OAuth 2.0アクセストークンは通常1時間で期限切れになります
- 期限切れになった場合は、エラーメッセージが表示されます
- 新しいアクセストークンを取得して再登録してください

### リフレッシュトークンを使用する場合
現在の実装では、リフレッシュトークンの自動更新には対応していません。
アクセストークンが期限切れになった場合は、手動で再取得する必要があります。

将来の実装で、リフレッシュトークンを使用した自動更新に対応する予定です。

### スコープ
このサービスは以下のスコープを必要とします：
- `https://www.googleapis.com/auth/calendar` - カレンダーの読み取りと書き込み

より制限的なスコープを使用したい場合：
- `https://www.googleapis.com/auth/calendar.readonly` - 読み取り専用
- `https://www.googleapis.com/auth/calendar.events` - イベントのみ

## エラーハンドリング

### 401 Unauthorized
- **原因**: アクセストークンが無効または期限切れ
- **対処**: 新しいアクセストークンを取得して再登録

### 404 Not Found
- **原因**: 指定されたイベントが見つからない
- **対処**: イベントIDを確認

### 410 Gone
- **原因**: イベントが既に削除されている
- **対処**: 削除済みのイベントです

## 実装ファイル

- `backend-python/app/services/api_wrappers/google_calendar_service.py`
- `backend-python/app/services/registry.py`
- `backend-python/app/services/api_wrappers/__init__.py`

## API仕様

詳細は Google Calendar API v3 のドキュメントを参照してください：
https://developers.google.com/calendar/api/v3/reference


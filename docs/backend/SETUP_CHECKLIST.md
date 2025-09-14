# BridgeSpeak AI Server セットアップチェックリスト

このドキュメントは、BridgeSpeak AI Serverを初回セットアップから動作確認まで行うための詳細な手順書です。

## 🎯 事前準備

### 必要なアカウント・サービス
- [ ] OpenAI アカウント（GPT API使用のため）
- [ ] Supabase アカウント（データベース・認証のため）
- [ ] Docker Desktop（推奨セットアップ方法）

### 必要なツール
- [ ] Python 3.11以上
- [ ] Git
- [ ] Docker Desktop（または docker + docker-compose）
- [ ] テキストエディタ

## 📋 セットアップ手順

### ステップ1: Python環境のセットアップ

#### 🎓 なぜ仮想環境が必要か？
Python仮想環境は、プロジェクトごとに独立したPython環境を作成するためのツールです。これにより以下の利点があります：

- **依存関係の分離**: プロジェクトAとBで異なるバージョンのライブラリを使用可能
- **システム汚染の防止**: グローバルPython環境を汚さない
- **再現性の確保**: 他の開発者や本番環境で同じ環境を再現できる
- **バージョン管理**: requirements.txtで依存関係のバージョンを厳密に管理

例：プロジェクトAでDjango 3.2、プロジェクトBでDjango 4.1を同時に使用することが可能になります。

```bash
# プロジェクトディレクトリに移動
cd ai_server

# Python仮想環境を作成
python -m venv venv

# 仮想環境を有効化
source venv/bin/activate  # macOS/Linux
# または
venv\Scripts\activate     # Windows

# 依存関係をインストール
pip install -r requirements.txt
```

**確認方法**: `pip list` でパッケージ一覧を確認

### ステップ2: 環境設定ファイルの作成

#### 🎓 なぜ環境変数ファイルが必要か？
環境変数（Environment Variables）は、アプリケーションの設定を外部から注入する仕組みです：

- **セキュリティ**: APIキーやパスワードをコードに直接書かない
- **環境の分離**: 開発・ステージング・本番で異なる設定を使用
- **設定の集約**: 全ての設定を一箇所で管理
- **秘匿性**: `.env`ファイルは`.gitignore`で除外し、機密情報を共有しない

例：開発環境では`DEBUG=True`、本番環境では`DEBUG=False`を自動設定できます。

```bash
# .env.exampleを.envにコピー
cp .env.example .env
```

**確認方法**: `.env`ファイルが作成されていることを確認

### ステップ3: Supabaseプロジェクトの設定

#### 🎓 なぜSupabaseが必要か？
Supabaseは「Firebase代替」として開発されたBaaS（Backend as a Service）です：

- **PostgreSQL**: 高性能なリレーショナルデータベース
- **認証機能**: JWT、OAuth、マルチファクター認証を標準提供
- **リアルタイム機能**: データ変更をリアルタイムで通知
- **Row Level Security**: データベースレベルでのセキュリティ制御
- **自動API生成**: データベーススキーマから自動でREST/GraphQL APIを生成

従来はデータベース＋認証＋API を別々に構築する必要がありましたが、Supabaseで一括管理できます。

#### 3.1 Supabaseプロジェクト作成
1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」をクリック
3. 新しいプロジェクトを作成
4. データベースパスワードを設定（安全なパスワードを使用）

#### 3.2 認証情報の取得
1. プロジェクトダッシュボード → Settings → API
2. 以下の情報をコピー：
   - Project URL
   - Project API keys の `anon` `public`
   - Project API keys の `service_role` `secret`

#### 3.3 .envファイルに設定
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**確認方法**: `.env`ファイルにSupabase情報が正しく設定されていることを確認

### ステップ4: OpenAI APIキーの設定

#### 🎓 なぜOpenAI APIが必要か？
OpenAI APIは大規模言語モデル（LLM）をクラウド経由で利用するサービスです：

- **GPT-4/3.5**: 自然言語理解・生成の最先端モデル
- **スケーラビリティ**: 自社でモデルを運用する必要がない
- **コスト効率**: 使用量に応じた従量課金
- **継続的改善**: Openaiが継続的にモデルを改善
- **多様な用途**: チャット、要約、翻訳、コード生成など

自社でGPTレベルのモデルを訓練・運用するには膨大なコストが必要ですが、APIを使用することで簡単に高品質なAI機能を実装できます。

#### 4.1 OpenAI APIキー取得
1. [OpenAI Platform](https://platform.openai.com)にログイン
2. API keys → Create new secret key
3. キーをコピー（一度だけ表示されるので注意）

#### 4.2 .envファイルに設定
```bash
OPENAI_API_KEY=sk-your_openai_api_key_here
```

**確認方法**: APIキーが`sk-`で始まっていることを確認

### ステップ5: セキュリティキーの生成と設定

#### 🎓 なぜ暗号化とJWTが必要か？

**Fernet暗号化**:
- **対称暗号化**: 同じキーで暗号化・復号化を行う
- **機密データ保護**: APIキーやパスワードをデータベースに安全に保存
- **データ漏洩対策**: データベースが漏洩しても元のデータを取得不可
- **GDPR準拠**: 個人情報保護規則への対応

**JWT（JSON Web Token）**:
- **ステートレス認証**: サーバーでセッション情報を保持不要
- **マイクロサービス**: 複数のサービス間で認証情報を共有
- **スケーラビリティ**: サーバーを増やしても認証が継続
- **セキュリティ**: 改ざん検知機能付きトークン

例：ユーザーがログインすると、JWTトークンが発行され、以降のAPI呼び出しでこのトークンを使用して認証を行います。

#### 5.1 暗号化キーの生成
```python
# Pythonを起動して実行
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

#### 5.2 JWT秘密鍵の生成
```bash
openssl rand -hex 32
```

#### 5.3 .envファイルに設定
```bash
ENCRYPTION_KEY=your_generated_fernet_key_here
JWT_SECRET_KEY=your_generated_jwt_secret_here
```

**確認方法**: 両方のキーが設定されていることを確認

### ステップ6: その他の環境変数設定

#### 🎓 なぜOAuth 2.0とCORSが必要か？

**OAuth 2.0**:
- **第三者認証**: ユーザーがパスワードを直接共有せずに認証
- **権限の委譲**: 必要最小限の権限のみを付与
- **トークンベース**: アクセストークンで安全にAPIを呼び出し
- **標準プロトコル**: GoogleやMicrosoftなど多くのサービスで採用

**CORS（Cross-Origin Resource Sharing）**:
- **セキュリティ**: 異なるドメインからのアクセスを制御
- **Same-Origin Policy**: ブラウザのセキュリティ機能
- **フロントエンド分離**: SPA（Single Page Application）での必須設定
- **API保護**: 許可されたドメインからのみアクセス可能

例：`localhost:3000`のReactアプリから`localhost:8000`のAPIを呼び出す際、CORSが適切に設定されていないとブラウザがアクセスをブロックします。

#### 6.1 Google OAuth設定（MCP使用時）
Google Calendar/Drive統合を使用する場合：
1. [Google Cloud Console](https://console.cloud.google.com)
2. プロジェクト作成 → APIs & Services → Credentials
3. OAuth 2.0 Client IDを作成
4. リダイレクトURIを設定

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/mcp/google/callback
```

#### 6.2 CORS設定
フロントエンドのURLを設定：
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**確認方法**: 最終的な`.env`ファイルがすべての必要な項目を含んでいることを確認

### ステップ7: アプリケーション起動

#### 🎓 なぜDockerが推奨されるか？
Docker（コンテナ技術）は以下の利点があります：

- **環境の一貫性**: 開発・ステージング・本番で同じ環境
- **依存関係の分離**: OSレベルでの分離により競合を回避
- **簡単なデプロイ**: `docker-compose up`一つで複数サービスを起動
- **スケーラビリティ**: コンテナの複製で簡単にスケール
- **リソース効率**: VMよりも軽量で高速

従来は「私の環境では動くのに...」という問題がありましたが、Dockerにより環境差異を解決できます。

#### 方法A: Docker使用（推奨）
```bash
# ai_serverディレクトリで実行
docker-compose up -d

# ログ確認
docker-compose logs -f ai-server
```

#### 方法B: 直接起動
```bash
# 仮想環境が有効化されていることを確認
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**確認方法**: 
- ターミナルでエラーが出ていないことを確認
- http://localhost:8000/api/v1/health にアクセスして `{"status": "healthy"}` が表示される

### ステップ8: 動作確認

#### 🎓 なぜAPI文書とヘルスチェックが重要か？

**Swagger UI（OpenAPI）**:
- **自動生成**: コードから自動でAPI文書を生成
- **インタラクティブ**: ブラウザから直接APIをテスト可能
- **仕様の標準化**: OpenAPI標準に準拠
- **開発効率**: フロントエンド開発者がAPIを理解しやすい

**ヘルスチェック**:
- **監視**: システムの正常性を継続的に確認
- **自動復旧**: 問題検知時の自動再起動
- **ロードバランサー**: 正常なインスタンスにのみトラフィックを送信
- **デバッグ**: 問題の早期発見

本番環境では、ヘルスチェックエンドポイントを監視システムが定期的に呼び出し、異常時にアラートを発生させます。

#### 8.1 API文書の確認
- http://localhost:8000/docs にアクセス
- Swagger UIが表示されることを確認

#### 8.2 ヘルスチェック
```bash
curl http://localhost:8000/api/v1/health
```
期待される応答: `{"status": "healthy"}`

#### 8.3 基本的なAPIテスト
Swagger UIまたはcurlを使用してAPIエンドポイントをテスト

**確認方法**: すべてのエンドポイントが正常にレスポンスを返すことを確認

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. Supabase接続エラー
- **症状**: Database connection failed
- **解決**: 
  - `.env`のSupabase URLとキーを再確認
  - Supabaseプロジェクトが正常に作成されているか確認
  - ネットワーク接続を確認

#### 2. OpenAI APIエラー
- **症状**: OpenAI API authentication failed
- **解決**:
  - APIキーの有効性を確認
  - OpenAIアカウントの請求情報を確認
  - レート制限に達していないか確認

#### 3. 暗号化エラー
- **症状**: Encryption/Decryption failed
- **解決**:
  - `ENCRYPTION_KEY`が正しいFernet形式か確認
  - キーの長さと文字が正しいかチェック

#### 4. ポートエラー
- **症状**: Port 8000 already in use
- **解決**:
  - `lsof -i :8000` で使用中のプロセスを確認
  - 別のポートを使用するか、プロセスを終了

#### 5. Docker関連エラー
- **症状**: Docker container startup failed
- **解決**:
  - Docker Desktopが起動しているか確認
  - `docker-compose logs ai-server` でエラー詳細を確認
  - `.env`ファイルの設定を再確認

### ログファイルの確認
```bash
# アプリケーションログ
tail -f logs/app.log

# エラーログ
tail -f logs/error.log

# セキュリティログ
tail -f logs/security.log
```

## ✅ セットアップ完了チェック

最終確認項目：
- [ ] Python仮想環境が正常に動作
- [ ] `.env`ファイルにすべての必要な環境変数が設定済み
- [ ] Supabaseプロジェクトが正常に接続可能
- [ ] OpenAI APIキーが有効
- [ ] セキュリティキーが正しく生成・設定済み
- [ ] アプリケーションが http://localhost:8000 で起動
- [ ] ヘルスチェックが正常に応答
- [ ] API文書（Swagger UI）が表示される
- [ ] ログファイルにエラーが記録されていない

## 📞 サポート

問題が解決しない場合：
1. ログファイルを確認
2. 環境変数の設定を再確認
3. 各サービス（Supabase、OpenAI）の状態を確認
4. GitHubリポジトリのIssuesを確認

セットアップが完了したら、このチェックリストを保存し、チーム内で共有してください。
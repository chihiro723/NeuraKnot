"""
Slack API サービス

Slackの全機能を網羅：メッセージ管理、チャンネル管理、ユーザー情報、検索
要認証：Bot User OAuth Token（xoxb-で始まる）
"""

import httpx
from typing import Optional, Dict, Any

from app.services.base import BaseService, tool


class SlackService(BaseService):
    """Slack API サービス - 包括的なSlack連携機能（要Bot Token）"""
    
    SERVICE_NAME = "Slack"
    SERVICE_DESCRIPTION = "Slack連携: メッセージ送信/更新/削除、チャンネル管理、ユーザー情報、ファイル共有、検索"
    SERVICE_ICON = "💬"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://slack.com/api"
    
    # Slack APIエラーコードの日本語マッピング
    ERROR_MESSAGES = {
        # 認証・権限エラー
        "invalid_auth": "❌ 認証エラー: Bot Tokenが無効です。トークンを確認してください。",
        "not_authed": "❌ 認証エラー: Bot Tokenが設定されていません。",
        "account_inactive": "❌ アカウントエラー: Slackアカウントが無効化されています。",
        "token_revoked": "❌ 認証エラー: Bot Tokenが取り消されています。新しいトークンを発行してください。",
        "token_expired": "❌ 認証エラー: Bot Tokenの有効期限が切れています。",
        "missing_scope": "⚠️ 権限エラー: 必要な権限（スコープ）が不足しています。Slack Appの設定で以下の権限を追加してください：\n"
                        "  • メッセージ送信: chat:write\n"
                        "  • チャンネル情報: channels:read, channels:history\n"
                        "  • ユーザー情報: users:read, users:read.email\n"
                        "  • 検索: search:read\n"
                        "  • リアクション: reactions:write",
        
        # チャンネル関連エラー
        "channel_not_found": "❌ チャンネルエラー: 指定されたチャンネルが見つかりません。チャンネルIDまたは名前を確認してください。",
        "not_in_channel": "⚠️ アクセスエラー: Botがチャンネルに参加していません。チャンネルで `/invite @アプリ名` を実行してください。",
        "is_archived": "❌ チャンネルエラー: このチャンネルはアーカイブされています。",
        "cant_invite_self": "❌ 操作エラー: 自分自身を招待することはできません。",
        "already_in_channel": "ℹ️ このBotは既にチャンネルに参加しています。",
        
        # メッセージ関連エラー
        "message_not_found": "❌ メッセージエラー: 指定されたメッセージが見つかりません。タイムスタンプを確認してください。",
        "cant_update_message": "❌ 権限エラー: このメッセージは編集できません（Botが送信したメッセージのみ編集可能）。",
        "cant_delete_message": "❌ 権限エラー: このメッセージは削除できません（Botが送信したメッセージのみ削除可能）。",
        "edit_window_closed": "❌ 時間エラー: メッセージの編集可能時間が過ぎています。",
        "msg_too_long": "❌ メッセージエラー: メッセージが長すぎます（最大40,000文字）。",
        "no_text": "❌ メッセージエラー: メッセージ本文が空です。",
        
        # ユーザー関連エラー
        "user_not_found": "❌ ユーザーエラー: 指定されたユーザーが見つかりません。",
        "users_list_not_supplied": "❌ パラメータエラー: ユーザーIDが指定されていません。",
        
        # レート制限
        "rate_limited": "⏱️ レート制限: Slack APIのリクエスト制限に達しました。しばらく待ってから再試行してください。",
        
        # リアクション関連エラー
        "already_reacted": "ℹ️ このメッセージには既に同じリアクションが付いています。",
        "too_many_emoji": "❌ リアクションエラー: リアクションの数が上限に達しています。",
        "invalid_name": "❌ 絵文字エラー: 指定された絵文字名が無効です。",
        
        # その他
        "invalid_arguments": "❌ パラメータエラー: 無効な引数が指定されています。",
        "fatal_error": "❌ サーバーエラー: Slack側で問題が発生しています。しばらく待ってから再試行してください。",
    }
    
    def _format_error(self, error_code: str, context: str = "") -> str:
        """Slackエラーコードをユーザーフレンドリーなメッセージに変換"""
        error_msg = self.ERROR_MESSAGES.get(error_code)
        
        if error_msg:
            return f"{error_msg}\n\n📋 エラーコード: {error_code}"
        else:
            # 未知のエラーコードの場合
            return f"❌ エラー: {context}に失敗しました\n\n📋 エラーコード: {error_code}\n💡 このエラーについて詳しくは https://api.slack.com/methods を参照してください。"
    
    def _handle_http_error(self, error: httpx.HTTPStatusError, context: str = "") -> str:
        """HTTPステータスエラーをハンドリング"""
        status_code = error.response.status_code
        
        if status_code == 429:
            # レート制限の場合、Retry-Afterヘッダーを確認
            retry_after = error.response.headers.get("Retry-After", "不明")
            return f"⏱️ レート制限: Slack APIのリクエスト制限に達しました。\n\n⏳ 再試行可能時間: {retry_after}秒後\n💡 しばらく待ってから再試行してください。"
        elif status_code == 401:
            return "❌ 認証エラー: Bot Tokenが無効です。トークンを確認してください。\n\n📋 HTTPステータス: 401 Unauthorized"
        elif status_code == 403:
            return "⚠️ 権限エラー: このAPIを実行する権限がありません。Slack Appの設定で必要な権限（スコープ）を追加してください。\n\n📋 HTTPステータス: 403 Forbidden"
        elif status_code == 404:
            return f"❌ エラー: {context}に必要なリソースが見つかりませんでした。\n\n📋 HTTPステータス: 404 Not Found"
        elif status_code >= 500:
            return f"❌ サーバーエラー: Slack側で問題が発生しています。しばらく待ってから再試行してください。\n\n📋 HTTPステータス: {status_code}"
        else:
            return f"❌ HTTPエラー: {context}に失敗しました。\n\n📋 HTTPステータス: {status_code}"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @classmethod
    def get_auth_schema(cls) -> Dict[str, Any]:
        """認証情報スキーマ"""
        return {
            "type": "object",
            "properties": {
                "bot_token": {
                    "type": "string",
                    "description": "Slack Bot User OAuth Token (xoxb-で始まる)",
                    "pattern": "^xoxb-",
                    "minLength": 1
                }
            },
            "required": ["bot_token"]
        }
    
    @tool(
        name="send_message",
        description="Slackチャンネルまたはダイレクトメッセージにメッセージを送信。通知、レポート、アラートの配信に使用。チャンネルIDまたは#channel名で指定可能。メッセージはMarkdown形式（**太字**、_イタリック_、`コード`等）をサポート。送信後、メッセージのタイムスタンプが返されるため、update_messageやadd_reactionで後から編集・リアクション可能。",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "チャンネルID（例: C1234567890）または#channel名（例: #general）。DMの場合はユーザーID（例: U1234567890）"
                },
                "text": {
                    "type": "string",
                    "description": "送信するメッセージ本文。Markdown形式対応（**太字**、_イタリック_、`コード`、> 引用等）"
                },
                "thread_ts": {
                    "type": "string",
                    "description": "スレッドのタイムスタンプ。指定するとスレッド返信として送信（オプション）"
                }
            },
            "required": ["channel", "text"]
        },
        category="slack",
        tags=["slack", "message", "send", "post"]
    )
    async def send_message(self, channel: str, text: str, thread_ts: Optional[str] = None) -> str:
        """Slackチャンネルにメッセージを送信"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "channel": channel,
                    "text": text
                }
                
                if thread_ts:
                    payload["thread_ts"] = thread_ts
                
                response = await client.post(
                    f"{self.BASE_URL}/chat.postMessage",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "メッセージの送信")
                
                ts = data.get("ts", "")
                thread_info = f"（スレッド返信）" if thread_ts else ""
                return f"✅ メッセージを送信しました{thread_info}\n📍 チャンネル: {channel}\n🕐 タイムスタンプ: {ts}"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "メッセージの送信")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="list_channels",
        description="ワークスペース内の全チャンネル一覧を取得。パブリック/プライベートチャンネルの名前、ID、メンバー数を表示。メッセージ送信先の確認や、チャンネル管理に使用。アーカイブ済みチャンネルは除外される。各チャンネルのIDはsend_message等で使用可能。",
        input_schema={
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "取得するチャンネル数（1-1000、デフォルト: 100）",
                    "minimum": 1,
                    "maximum": 1000
                },
                "types": {
                    "type": "string",
                    "description": "取得するチャンネルタイプ（public_channel, private_channel, im, mpim。カンマ区切りで複数指定可。デフォルト: public_channel,private_channel）"
                }
            },
            "required": []
        },
        category="slack",
        tags=["slack", "channels", "list"]
    )
    async def list_channels(self, limit: int = 100, types: str = "public_channel,private_channel") -> str:
        """Slackのチャンネル一覧を取得"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {
                    "limit": min(limit, 1000),
                    "exclude_archived": True,
                    "types": types
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/conversations.list",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "チャンネル一覧の取得")
                
                channels = data.get("channels", [])
                
                if not channels:
                    return "チャンネルが見つかりませんでした"
                
                result = f"チャンネル一覧（{len(channels)}件）:\n\n"
                
                for channel in channels:
                    name = channel.get("name", "不明")
                    channel_id = channel.get("id", "不明")
                    is_private = channel.get("is_private", False)
                    member_count = channel.get("num_members", 0)
                    
                    privacy_icon = "🔒" if is_private else "🔓"
                    result += f"{privacy_icon} #{name}\n"
                    result += f"   ID: {channel_id}\n"
                    result += f"   メンバー数: {member_count}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "チャンネル一覧の取得")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="update_message",
        description="既存のメッセージを更新・編集。送信済みメッセージの訂正、情報の追加更新に使用。メッセージのタイムスタンプ（send_messageの返り値）とチャンネルIDが必要。Botが送信したメッセージのみ更新可能。",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "メッセージがあるチャンネルのID（例: C1234567890）"
                },
                "ts": {
                    "type": "string",
                    "description": "更新するメッセージのタイムスタンプ（send_messageの返り値）"
                },
                "text": {
                    "type": "string",
                    "description": "新しいメッセージ本文"
                }
            },
            "required": ["channel", "ts", "text"]
        },
        category="slack",
        tags=["slack", "message", "update", "edit"]
    )
    async def update_message(self, channel: str, ts: str, text: str) -> str:
        """メッセージを更新"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "channel": channel,
                    "ts": ts,
                    "text": text
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/chat.update",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "メッセージの更新")
                
                return f"メッセージを更新しました（チャンネル: {channel}、タイムスタンプ: {ts}）"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "メッセージの更新")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="delete_message",
        description="メッセージを削除。不要なメッセージ、誤送信の削除に使用。メッセージのタイムスタンプとチャンネルIDが必要。Botが送信したメッセージのみ削除可能。削除後は復元不可。",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "メッセージがあるチャンネルのID（例: C1234567890）"
                },
                "ts": {
                    "type": "string",
                    "description": "削除するメッセージのタイムスタンプ"
                }
            },
            "required": ["channel", "ts"]
        },
        category="slack",
        tags=["slack", "message", "delete", "remove"]
    )
    async def delete_message(self, channel: str, ts: str) -> str:
        """メッセージを削除"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "channel": channel,
                    "ts": ts
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/chat.delete",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "メッセージの削除")
                
                return f"メッセージを削除しました（チャンネル: {channel}、タイムスタンプ: {ts}）"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "メッセージの削除")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="get_channel_history",
        description="チャンネルのメッセージ履歴を取得。過去の会話確認、情報検索、履歴レビューに使用。最新メッセージから指定件数を取得。各メッセージのテキスト、送信者、タイムスタンプを含む。",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "チャンネルのID（例: C1234567890）"
                },
                "limit": {
                    "type": "integer",
                    "description": "取得するメッセージ数（1-1000、デフォルト: 100）",
                    "minimum": 1,
                    "maximum": 1000
                }
            },
            "required": ["channel"]
        },
        category="slack",
        tags=["slack", "history", "messages", "conversation"]
    )
    async def get_channel_history(self, channel: str, limit: int = 100) -> str:
        """チャンネルの履歴を取得"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {
                    "channel": channel,
                    "limit": min(limit, 1000)
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/conversations.history",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "履歴の取得")
                
                messages = data.get("messages", [])
                
                if not messages:
                    return f"チャンネル {channel} にメッセージが見つかりませんでした"
                
                result = f"チャンネル履歴（{len(messages)}件、新しい順）:\n\n"
                
                for i, msg in enumerate(messages[:50], 1):  # 最新50件まで表示
                    text = msg.get("text", "")
                    user = msg.get("user", "不明")
                    ts = msg.get("ts", "")
                    msg_type = msg.get("type", "message")
                    
                    if msg_type == "message" and text:
                        result += f"{i}. [{user}] {text[:100]}{'...' if len(text) > 100 else ''}\n"
                        result += f"   タイムスタンプ: {ts}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "履歴の取得")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="add_reaction",
        description="メッセージに絵文字リアクション（👍、❤️、✅等）を追加。メッセージへの反応、確認、承認の表明に使用。メッセージのタイムスタンプとチャンネルID、絵文字名が必要。",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "チャンネルのID（例: C1234567890）"
                },
                "timestamp": {
                    "type": "string",
                    "description": "リアクションを追加するメッセージのタイムスタンプ"
                },
                "name": {
                    "type": "string",
                    "description": "絵文字の名前（例: thumbsup、heart、white_check_mark）。コロン不要"
                }
            },
            "required": ["channel", "timestamp", "name"]
        },
        category="slack",
        tags=["slack", "reaction", "emoji"]
    )
    async def add_reaction(self, channel: str, timestamp: str, name: str) -> str:
        """メッセージにリアクションを追加"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "channel": channel,
                    "timestamp": timestamp,
                    "name": name
                }
                
                response = await client.post(
                    f"{self.BASE_URL}/reactions.add",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "リアクションの追加")
                
                return f"リアクション :{name}: を追加しました（チャンネル: {channel}）"
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "リアクションの追加")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="get_thread_replies",
        description="スレッドの返信メッセージ一覧を取得。スレッド内の議論確認、会話の流れ把握に使用。親メッセージのタイムスタンプで指定。",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "description": "チャンネルのID（例: C1234567890）"
                },
                "ts": {
                    "type": "string",
                    "description": "スレッドの親メッセージのタイムスタンプ"
                }
            },
            "required": ["channel", "ts"]
        },
        category="slack",
        tags=["slack", "thread", "replies"]
    )
    async def get_thread_replies(self, channel: str, ts: str) -> str:
        """スレッドの返信を取得"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {
                    "channel": channel,
                    "ts": ts
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/conversations.replies",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "スレッド返信の取得")
                
                messages = data.get("messages", [])
                
                if not messages or len(messages) <= 1:
                    return f"スレッドに返信がありません"
                
                result = f"スレッド返信（{len(messages) - 1}件）:\n\n"
                
                # 最初のメッセージは親メッセージなのでスキップ
                for i, msg in enumerate(messages[1:], 1):
                    text = msg.get("text", "")
                    user = msg.get("user", "不明")
                    reply_ts = msg.get("ts", "")
                    
                    result += f"{i}. [{user}] {text[:100]}{'...' if len(text) > 100 else ''}\n"
                    result += f"   タイムスタンプ: {reply_ts}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "スレッド返信の取得")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="list_users",
        description="ワークスペースの全ユーザー一覧を取得。メンバーの確認、ユーザーID検索、メンション対象の特定に使用。各ユーザーの名前、表示名、メールアドレス、ステータスを含む。",
        input_schema={
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "取得するユーザー数（1-1000、デフォルト: 100）",
                    "minimum": 1,
                    "maximum": 1000
                }
            },
            "required": []
        },
        category="slack",
        tags=["slack", "users", "list", "members"]
    )
    async def list_users(self, limit: int = 100) -> str:
        """ユーザー一覧を取得"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {
                    "limit": min(limit, 1000)
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/users.list",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "ユーザー一覧の取得")
                
                members = data.get("members", [])
                
                if not members:
                    return "ユーザーが見つかりませんでした"
                
                result = f"ユーザー一覧（{len(members)}人）:\n\n"
                
                for member in members:
                    if member.get("deleted") or member.get("is_bot"):
                        continue
                    
                    user_id = member.get("id", "不明")
                    name = member.get("name", "不明")
                    real_name = member.get("real_name", "")
                    profile = member.get("profile", {})
                    email = profile.get("email", "")
                    status_text = profile.get("status_text", "")
                    
                    result += f"👤 {real_name or name}\n"
                    result += f"   ID: {user_id}\n"
                    result += f"   ユーザー名: {name}\n"
                    if email:
                        result += f"   メール: {email}\n"
                    if status_text:
                        result += f"   ステータス: {status_text}\n"
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ユーザー一覧の取得")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="get_user_info",
        description="特定ユーザーの詳細情報を取得。ユーザーのプロフィール、連絡先、タイムゾーン、ステータス等を確認。ユーザーIDで指定。",
        input_schema={
            "type": "object",
            "properties": {
                "user": {
                    "type": "string",
                    "description": "ユーザーのID（例: U1234567890）"
                }
            },
            "required": ["user"]
        },
        category="slack",
        tags=["slack", "user", "profile", "info"]
    )
    async def get_user_info(self, user: str) -> str:
        """ユーザー情報を取得"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {"user": user}
                
                response = await client.get(
                    f"{self.BASE_URL}/users.info",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "ユーザー情報の取得")
                
                user_data = data.get("user", {})
                profile = user_data.get("profile", {})
                
                name = user_data.get("name", "不明")
                real_name = user_data.get("real_name", "")
                email = profile.get("email", "")
                phone = profile.get("phone", "")
                title = profile.get("title", "")
                status_text = profile.get("status_text", "")
                status_emoji = profile.get("status_emoji", "")
                tz = user_data.get("tz", "")
                
                result = f"ユーザー情報:\n\n"
                result += f"👤 {real_name or name}\n"
                result += f"   ID: {user}\n"
                result += f"   ユーザー名: {name}\n"
                if email:
                    result += f"   メール: {email}\n"
                if phone:
                    result += f"   電話: {phone}\n"
                if title:
                    result += f"   役職: {title}\n"
                if status_text or status_emoji:
                    result += f"   ステータス: {status_emoji} {status_text}\n"
                if tz:
                    result += f"   タイムゾーン: {tz}\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "ユーザー情報の取得")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"
    
    @tool(
        name="search_messages",
        description="ワークスペース全体からメッセージを検索。キーワード、送信者、期間でフィルタリング可能。過去の情報検索、議論の追跡に使用。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ（例: 「議事録」「from:@username」「in:#channel」）"
                },
                "count": {
                    "type": "integer",
                    "description": "取得する結果数（1-100、デフォルト: 20）",
                    "minimum": 1,
                    "maximum": 100
                }
            },
            "required": ["query"]
        },
        category="slack",
        tags=["slack", "search", "messages", "find"]
    )
    async def search_messages(self, query: str, count: int = 20) -> str:
        """メッセージを検索"""
        if not self.auth or "bot_token" not in self.auth:
            return "エラー: Bot Tokenが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.auth['bot_token']}"
                }
                params = {
                    "query": query,
                    "count": min(count, 100)
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/search.messages",
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("ok"):
                    error_code = data.get("error", "unknown_error")
                    return self._format_error(error_code, "メッセージ検索")
                
                messages_data = data.get("messages", {})
                matches = messages_data.get("matches", [])
                total = messages_data.get("total", 0)
                
                if not matches:
                    return f"検索クエリ「{query}」に一致するメッセージが見つかりませんでした"
                
                result = f"検索結果「{query}」（{len(matches)}件/{total}件中）:\n\n"
                
                for i, match in enumerate(matches, 1):
                    text = match.get("text", "")
                    username = match.get("username", "不明")
                    channel_name = match.get("channel", {}).get("name", "不明")
                    ts = match.get("ts", "")
                    
                    result += f"{i}. [{username} in #{channel_name}] {text[:100]}{'...' if len(text) > 100 else ''}\n"
                    result += f"   タイムスタンプ: {ts}\n\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "メッセージ検索")
        except httpx.RequestError as e:
            return f"🌐 ネットワークエラー: Slack APIへの接続に失敗しました。\n\n💡 インターネット接続を確認してください。\n📋 詳細: {str(e)}"
        except Exception as e:
            return f"❌ 予期しないエラー: {str(e)}"














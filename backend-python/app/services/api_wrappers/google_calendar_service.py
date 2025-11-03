"""
Google Calendar API サービス

Googleカレンダーの全機能を網羅：イベント管理、カレンダー管理、空き時間検索
要認証：OAuth 2.0 Access Token
"""

import httpx
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from app.services.base import BaseService, tool


class GoogleCalendarService(BaseService):
    """Google Calendar API サービス - 包括的なカレンダー管理機能（要OAuth）"""

    SERVICE_NAME = "Google Calendar"
    SERVICE_DESCRIPTION = "Googleカレンダー連携: イベント/カレンダー/参加者管理、空き時間検索"
    SERVICE_ICON = "📅"
    SERVICE_TYPE = "api_wrapper"

    BASE_URL = "https://www.googleapis.com/calendar/v3"

    # Google Calendar APIエラーコードの日本語マッピング
    ERROR_MESSAGES = {
        # 認証エラー
        "authError": "❌ 認証エラー: アクセストークンが無効です。再認証してください。",
        "unauthorized": "❌ 認証エラー: 認証情報が必要です。Googleアカウントでログインしてください。",
        
        # カレンダー関連エラー
        "notFound": "❌ エラー: 指定されたリソース（カレンダーまたはイベント）が見つかりません。",
        "deleted": "❌ エラー: このリソースは既に削除されています。",
        
        # 権限エラー
        "forbidden": "⚠️ 権限エラー: このリソースへのアクセス権限がありません。カレンダーの共有設定を確認してください。",
        "insufficientPermissions": "⚠️ 権限エラー: 必要な権限が不足しています。以下の権限を追加してください：\n"
                                   "  • カレンダー読み取り: calendar.readonly\n"
                                   "  • カレンダー編集: calendar.events\n"
                                   "  • カレンダー管理: calendar",
        
        # バリデーションエラー
        "invalid": "❌ バリデーションエラー: 入力データが無効です。日時形式や必須項目を確認してください。",
        "invalidValue": "❌ バリデーションエラー: 無効な値が指定されました。",
        "required": "❌ バリデーションエラー: 必須項目が不足しています。",
        "tooManyAttendees": "❌ エラー: 参加者数が上限（通常200名）を超えています。",
        "attendeeNotAllowed": "❌ エラー: 指定された参加者を追加できません。",
        
        # リソース制限
        "quotaExceeded": "⏱️ クォータ超過: Google Calendar APIの利用制限に達しました。しばらく待ってから再試行してください。",
        "rateLimitExceeded": "⏱️ レート制限: リクエストが多すぎます。しばらく待ってから再試行してください。",
        "userRateLimitExceeded": "⏱️ レート制限: ユーザーあたりのリクエスト制限に達しました。",
        
        # イベント関連エラー
        "updatedMinTooLong": "❌ エラー: 更新日時の指定範囲が長すぎます（最大2年）。",
        "timeRangeEmpty": "❌ エラー: 開始時刻と終了時刻が同じです。",
        "timeRangeTooLarge": "❌ エラー: 指定された期間が長すぎます。",
        
        # その他
        "backendError": "❌ サーバーエラー: Google側で問題が発生しています。しばらく待ってから再試行してください。",
        "internalError": "❌ 内部エラー: 予期しないエラーが発生しました。",
    }
    
    def _format_error(self, error_reason: str, context: str = "") -> str:
        """Googleエラー理由をユーザーフレンドリーなメッセージに変換"""
        error_msg = self.ERROR_MESSAGES.get(error_reason)
        
        if error_msg:
            return f"{error_msg}\n\n📋 エラー理由: {error_reason}"
        else:
            return f"❌ エラー: {context}に失敗しました\n\n📋 エラー理由: {error_reason}\n💡 詳しくは https://developers.google.com/calendar/api/guides/errors を参照してください。"
    
    def _handle_http_error(self, error: httpx.HTTPStatusError, context: str = "") -> str:
        """HTTPステータスエラーをハンドリング"""
        status_code = error.response.status_code
        
        try:
            error_data = error.response.json()
            error_info = error_data.get("error", {})
            
            # Google APIのエラー構造を解析
            if isinstance(error_info, dict):
                reason = error_info.get("errors", [{}])[0].get("reason", "")
                message = error_info.get("message", "")
                
                if reason:
                    formatted_error = self._format_error(reason, context)
                    if message:
                        formatted_error += f"\n\n💬 詳細: {message}"
                    return formatted_error
        except:
            pass
        
        # 汎用HTTPエラー処理
        if status_code == 401:
            return "❌ 認証エラー: アクセストークンが無効または期限切れです。再認証してください。\n\n📋 HTTPステータス: 401 Unauthorized"
        elif status_code == 403:
            return "⚠️ 権限エラー: このリソースへのアクセス権限がありません。カレンダーの共有設定を確認してください。\n\n📋 HTTPステータス: 403 Forbidden"
        elif status_code == 404:
            return f"❌ エラー: {context}に必要なリソースが見つかりませんでした。カレンダーIDやイベントIDを確認してください。\n\n📋 HTTPステータス: 404 Not Found"
        elif status_code == 409:
            return "⚠️ 競合エラー: リソースが既に存在するか、更新中です。\n\n📋 HTTPステータス: 409 Conflict"
        elif status_code == 410:
            return "❌ エラー: このリソースは既に削除されています。\n\n📋 HTTPステータス: 410 Gone"
        elif status_code == 429:
            return "⏱️ レート制限: Google Calendar APIのリクエスト制限に達しました。しばらく待ってから再試行してください。\n\n📋 HTTPステータス: 429 Too Many Requests"
        elif status_code >= 500:
            return f"❌ サーバーエラー: Google側で問題が発生しています。しばらく待ってから再試行してください。\n\n📋 HTTPステータス: {status_code}"
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
                "access_token": {
                    "type": "string",
                    "description": "Google Calendar API OAuth 2.0 アクセストークン",
                    "minLength": 1
                }
            },
            "required": ["access_token"]
        }

    def _get_headers(self) -> Dict[str, str]:
        """共通HTTPヘッダーを取得"""
        if not self.auth or "access_token" not in self.auth:
            raise ValueError("エラー: アクセストークンが設定されていません")

        return {
            "Authorization": f"Bearer {self.auth['access_token']}",
            "Content-Type": "application/json"
        }

    # ==================== イベント管理 ====================

    @tool(
        name="get_today_events",
        description="今日のカレンダーイベントを取得します。日次の予定確認に最適。開始時刻順にソートされ、タイトル、時刻、場所、説明（最大100文字）を表示。空の場合は「今日の予定はありません」と返します。",
        input_schema={
            "type": "object",
            "properties": {
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary = メインカレンダー）。他のカレンダーを指定する場合はlist_calendarsで取得したIDを使用"
                }
            }
        },
        category="calendar",
        tags=["google", "calendar", "events", "today"]
    )
    async def get_today_events(self, calendar_id: str = "primary") -> str:
        """今日のイベント一覧を取得"""
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)

            time_min = today_start.isoformat() + "Z"
            time_max = today_end.isoformat() + "Z"

            url = f"{self.BASE_URL}/calendars/{calendar_id}/events"
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "orderBy": "startTime",
                "singleEvents": "true",
                "maxResults": 50
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            events = data.get("items", [])
            if not events:
                return "📅 今日の予定はありません。"

            result = f"📅 今日の予定 ({len(events)}件):\n\n"
            for event in events:
                start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date"))
                summary = event.get("summary", "タイトルなし")
                location = event.get("location", "")
                description = event.get("description", "")

                if "T" in start:
                    start_time = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    time_str = start_time.strftime("%H:%M")
                else:
                    time_str = "終日"

                result += f"• {time_str} - {summary}\n"
                if location:
                    result += f"  📍 {location}\n"
                if description:
                    result += f"  📝 {description[:100]}{'...' if len(description) > 100 else ''}\n"
                result += "\n"

            return result

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "今日の予定取得")
        except Exception as e:
            return f"🌐 ネットワークエラー: 今日の予定取得に失敗しました\n\n💬 詳細: {str(e)}"

    @tool(
        name="get_upcoming_events",
        description="今後N日間のカレンダーイベントを取得します。1〜30日の範囲で指定可能。週次・月次の予定確認に便利。日付ごとにグループ化され、各イベントのタイトル、時刻、場所を表示。",
        input_schema={
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "取得する日数（1〜30日）",
                    "minimum": 1,
                    "maximum": 30
                },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
            },
            "required": ["days"]
        },
        category="calendar",
        tags=["google", "calendar", "events", "upcoming"]
    )
    async def get_upcoming_events(self, days: int = 7, calendar_id: str = "primary") -> str:
        """今後のイベントを取得"""
        try:
            if days < 1 or days > 30:
                return "❌ バリデーションエラー: 日数は1〜30の範囲で指定してください。"

            time_min = datetime.now().isoformat() + "Z"
            time_max = (datetime.now() + timedelta(days=days)).isoformat() + "Z"

            url = f"{self.BASE_URL}/calendars/{calendar_id}/events"
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "orderBy": "startTime",
                "singleEvents": "true",
                "maxResults": 100
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            events = data.get("items", [])
            if not events:
                return f"📅 今後{days}日間の予定はありません。"

            result = f"📅 今後{days}日間の予定 ({len(events)}件):\n\n"
            current_date = None

            for event in events:
                start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date"))
                summary = event.get("summary", "タイトルなし")
                location = event.get("location", "")

                if "T" in start:
                    event_datetime = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    event_date = event_datetime.date()
                    time_str = event_datetime.strftime("%H:%M")
                else:
                    event_date = datetime.fromisoformat(start).date()
                    time_str = "終日"

                if current_date != event_date:
                    current_date = event_date
                    weekday = ["月", "火", "水", "木", "金", "土", "日"][event_date.weekday()]
                    date_str = event_date.strftime(f"%Y年%m月%d日 ({weekday})")
                    result += f"\n【{date_str}】\n"

                result += f"  • {time_str} - {summary}"
                if location:
                    result += f" ({location})"
                result += "\n"

            return result

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "今後の予定取得")
        except Exception as e:
            return f"🌐 ネットワークエラー: 今後の予定取得に失敗しました\n\n💬 詳細: {str(e)}"

    @tool(
        name="create_event",
        description="新しいカレンダーイベントを作成します。タイトル、開始・終了日時は必須。場所、説明、参加者（カンマ区切りメールアドレス）も追加可能。作成されたイベントのIDとURLを返します。日時はISO 8601形式（例: 2024-12-25T10:00:00）で指定。",
        input_schema={
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "イベントのタイトル"
                },
                "start_datetime": {
                    "type": "string",
                    "description": "開始日時（ISO 8601形式、例: 2024-12-25T10:00:00）"
                },
                "end_datetime": {
                    "type": "string",
                    "description": "終了日時（ISO 8601形式、例: 2024-12-25T11:00:00）"
                },
                "description": {
                    "type": "string",
                    "description": "イベントの説明（オプション）"
                },
                "location": {
                    "type": "string",
                    "description": "場所（オプション）"
                },
                "attendees": {
                    "type": "string",
                    "description": "参加者のメールアドレス（カンマ区切り、オプション）例: user1@example.com,user2@example.com"
            },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
        },
            "required": ["summary", "start_datetime", "end_datetime"]
        },
        category="calendar",
        tags=["google", "calendar", "create", "event"]
    )
    async def create_event(
        self,
        summary: str,
        start_datetime: str,
        end_datetime: str,
        description: str = "",
        location: str = "",
        attendees: str = "",
        calendar_id: str = "primary"
    ) -> str:
        """イベントを作成"""
        try:
            event_data = {
                "summary": summary,
                "start": {
                    "dateTime": start_datetime,
                    "timeZone": "Asia/Tokyo"
                },
                "end": {
                    "dateTime": end_datetime,
                    "timeZone": "Asia/Tokyo"
                }
            }

            if description:
                event_data["description"] = description
            if location:
                event_data["location"] = location
            if attendees:
                attendee_list = [{"email": email.strip()} for email in attendees.split(",") if email.strip()]
                if attendee_list:
                    event_data["attendees"] = attendee_list

            url = f"{self.BASE_URL}/calendars/{calendar_id}/events"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=event_data, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            event_id = data.get("id")
            html_link = data.get("htmlLink")

            result = f"✅ イベントを作成しました:\n\n"
            result += f"📝 タイトル: {summary}\n"
            result += f"🕐 開始: {start_datetime}\n"
            result += f"🕐 終了: {end_datetime}\n"
            if location:
                result += f"📍 場所: {location}\n"
            if attendees:
                result += f"👥 参加者: {attendees}\n"
            result += f"\n🆔 イベントID: {event_id}\n"
            result += f"🔗 URL: {html_link}"

            return result

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "イベント作成")
        except Exception as e:
            return f"🌐 ネットワークエラー: イベント作成に失敗しました\n\n💬 詳細: {str(e)}"

    @tool(
        name="create_quick_event",
        description="自然言語でカレンダーイベントを素早く作成します。Googleの自然言語処理により「明日10時から11時まで会議」のような文章から自動でイベントを生成。複雑な日時指定が簡単に。作成されたイベントの詳細とURLを返します。",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "イベントの内容（自然言語、例: 「明日10時から11時まで会議」「来週金曜日18時から飲み会@渋谷」）"
                },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
            },
            "required": ["text"]
        },
        category="calendar",
        tags=["google", "calendar", "create", "quick", "natural_language"]
    )
    async def create_quick_event(self, text: str, calendar_id: str = "primary") -> str:
        """自然言語でイベントを素早く作成"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}/events/quickAdd"
            params = {"text": text}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            summary = data.get("summary", "タイトルなし")
            start = data.get("start", {}).get("dateTime", data.get("start", {}).get("date", ""))
            end = data.get("end", {}).get("dateTime", data.get("end", {}).get("date", ""))
            event_id = data.get("id")
            html_link = data.get("htmlLink")
            
            result = f"✅ イベントを作成しました:\n\n"
            result += f"📝 タイトル: {summary}\n"
            result += f"🕐 開始: {start}\n"
            result += f"🕐 終了: {end}\n"
            result += f"\n🆔 イベントID: {event_id}\n"
            result += f"🔗 URL: {html_link}"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "クイックイベント作成")
        except Exception as e:
            return f"🌐 ネットワークエラー: クイックイベント作成に失敗しました\n\n💬 詳細: {str(e)}"
    
    @tool(
        name="get_event_details",
        description="指定したイベントの詳細情報を取得します。タイトル、開始・終了日時、場所、説明、作成者、参加者（各参加者の出欠状況付き）、URLを表示。イベントIDはsearch_eventsやget_today_events等で取得可能。",
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "イベントID"
                },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
            },
            "required": ["event_id"]
        },
        category="calendar",
        tags=["google", "calendar", "event", "details"]
    )
    async def get_event_details(self, event_id: str, calendar_id: str = "primary") -> str:
        """イベント詳細を取得"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}/events/{event_id}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                event = response.json()

            summary = event.get("summary", "タイトルなし")
            start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date"))
            end = event.get("end", {}).get("dateTime", event.get("end", {}).get("date"))
            description = event.get("description", "")
            location = event.get("location", "")
            attendees = event.get("attendees", [])
            creator = event.get("creator", {}).get("email", "不明")
            html_link = event.get("htmlLink", "")

            result = f"📅 イベント詳細:\n\n"
            result += f"📝 タイトル: {summary}\n"
            result += f"🕐 開始: {start}\n"
            result += f"🕐 終了: {end}\n"
            if location:
                result += f"📍 場所: {location}\n"
            if description:
                result += f"📄 説明: {description}\n"
            result += f"👤 作成者: {creator}\n"

            if attendees:
                result += f"\n👥 参加者 ({len(attendees)}名):\n"
                for attendee in attendees:
                    email = attendee.get("email", "")
                    response_status = attendee.get("responseStatus", "needsAction")
                    status_icon = {
                        "accepted": "✅",
                        "declined": "❌",
                        "tentative": "❓",
                        "needsAction": "⏳"
                    }.get(response_status, "")
                    result += f"  {status_icon} {email}\n"

            result += f"\n🔗 URL: {html_link}"

            return result

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "イベント詳細取得")
        except Exception as e:
            return f"🌐 ネットワークエラー: イベント詳細取得に失敗しました\n\n💬 詳細: {str(e)}"

    @tool(
        name="update_event",
        description="既存のカレンダーイベントを更新します。イベントIDは必須。タイトル、開始・終了日時、場所、説明は個別に更新可能（指定した項目のみ更新）。更新後のイベント情報を返します。",
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "イベントID"
                },
                "summary": {
                    "type": "string",
                    "description": "新しいタイトル（オプション）"
                },
                "start_datetime": {
                    "type": "string",
                    "description": "新しい開始日時（ISO 8601形式、オプション）"
                },
                "end_datetime": {
                    "type": "string",
                    "description": "新しい終了日時（ISO 8601形式、オプション）"
                },
                "description": {
                    "type": "string",
                    "description": "新しい説明（オプション）"
                },
                "location": {
                    "type": "string",
                    "description": "新しい場所（オプション）"
                },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
            },
            "required": ["event_id"]
        },
        category="calendar",
        tags=["google", "calendar", "update", "event"]
    )
    async def update_event(
        self,
        event_id: str,
        summary: str = "",
        start_datetime: str = "",
        end_datetime: str = "",
        description: str = "",
        location: str = "",
        calendar_id: str = "primary"
    ) -> str:
        """イベントを更新"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}/events/{event_id}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                # 既存データを取得
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                event_data = response.json()

                # 更新データをマージ
                if summary:
                    event_data["summary"] = summary
                if start_datetime:
                    event_data["start"] = {
                        "dateTime": start_datetime,
                        "timeZone": "Asia/Tokyo"
                    }
                if end_datetime:
                    event_data["end"] = {
                        "dateTime": end_datetime,
                        "timeZone": "Asia/Tokyo"
                    }
                if description:
                    event_data["description"] = description
                if location:
                    event_data["location"] = location

                # イベントを更新
                response = await client.put(url, json=event_data, headers=self._get_headers())
                response.raise_for_status()
                updated_event = response.json()

            result = f"✅ イベントを更新しました:\n\n"
            result += f"🆔 イベントID: {event_id}\n"
            result += f"📝 タイトル: {updated_event.get('summary', '')}\n"
            result += f"🕐 開始: {updated_event.get('start', {}).get('dateTime', '')}\n"
            result += f"🕐 終了: {updated_event.get('end', {}).get('dateTime', '')}\n"

            return result

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "イベント更新")
        except Exception as e:
            return f"🌐 ネットワークエラー: イベント更新に失敗しました\n\n💬 詳細: {str(e)}"

    @tool(
        name="delete_event",
        description="指定したカレンダーイベントを削除します。イベントIDは必須。削除は取り消せないため注意。削除成功メッセージを返します。",
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "削除するイベントのID"
                },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
            },
            "required": ["event_id"]
        },
        category="calendar",
        tags=["google", "calendar", "delete", "event"]
    )
    async def delete_event(self, event_id: str, calendar_id: str = "primary") -> str:
        """イベントを削除"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}/events/{event_id}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(url, headers=self._get_headers())
                response.raise_for_status()

            return f"✅ イベント（ID: {event_id}）を削除しました。"

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "イベント削除")
        except Exception as e:
            return f"🌐 ネットワークエラー: イベント削除に失敗しました\n\n💬 詳細: {str(e)}"

    @tool(
        name="search_events",
        description="キーワードでカレンダーイベントを検索します。タイトル、説明、場所から部分一致で検索。最大20件の結果を開始時刻順に表示。各結果にはタイトル、日時、場所、イベントIDが含まれます。",
        input_schema={
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "検索キーワード"
                },
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID（デフォルト: primary）"
                }
            },
            "required": ["keyword"]
        },
        category="calendar",
        tags=["google", "calendar", "search"]
    )
    async def search_events(self, keyword: str, calendar_id: str = "primary") -> str:
        """イベントを検索"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}/events"
            params = {
                "q": keyword,
                "orderBy": "startTime",
                "singleEvents": "true",
                "maxResults": 20
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            events = data.get("items", [])
            if not events:
                return f"🔍 「{keyword}」に一致するイベントは見つかりませんでした。"

            result = f"🔍 「{keyword}」の検索結果 ({len(events)}件):\n\n"
            for event in events:
                event_id = event.get("id")
                summary = event.get("summary", "タイトルなし")
                start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date"))
                location = event.get("location", "")

                if "T" in start:
                    event_datetime = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    date_str = event_datetime.strftime("%Y/%m/%d %H:%M")
                else:
                    date_str = start

                result += f"• {summary}\n"
                result += f"  📅 {date_str}"
                if location:
                    result += f" | 📍 {location}"
                result += f"\n  🆔 ID: {event_id}\n\n"

            return result

        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "イベント検索")
        except Exception as e:
            return f"🌐 ネットワークエラー: イベント検索に失敗しました\n\n💬 詳細: {str(e)}"
    
    @tool(
        name="move_event",
        description="イベントを別のカレンダーへ移動します。移動元カレンダーID、移動先カレンダーID、イベントIDが必須。カレンダー間でイベントを整理する際に使用。移動後のイベント情報とURLを返します。",
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "移動するイベントのID"
                },
                "source_calendar_id": {
                    "type": "string",
                    "description": "移動元カレンダーID（デフォルト: primary）"
                },
                "destination_calendar_id": {
                    "type": "string",
                    "description": "移動先カレンダーID"
                }
            },
            "required": ["event_id", "destination_calendar_id"]
        },
        category="calendar",
        tags=["google", "calendar", "move", "event"]
    )
    async def move_event(
        self,
        event_id: str,
        destination_calendar_id: str,
        source_calendar_id: str = "primary"
    ) -> str:
        """イベントを別のカレンダーへ移動"""
        try:
            url = f"{self.BASE_URL}/calendars/{source_calendar_id}/events/{event_id}/move"
            params = {"destination": destination_calendar_id}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            summary = data.get("summary", "タイトルなし")
            html_link = data.get("htmlLink", "")
            
            result = f"✅ イベントを移動しました:\n\n"
            result += f"📝 タイトル: {summary}\n"
            result += f"📤 移動元: {source_calendar_id}\n"
            result += f"📥 移動先: {destination_calendar_id}\n"
            result += f"🆔 イベントID: {event_id}\n"
            result += f"🔗 URL: {html_link}"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "イベント移動")
        except Exception as e:
            return f"🌐 ネットワークエラー: イベント移動に失敗しました\n\n💬 詳細: {str(e)}"
    
    # ==================== カレンダー管理 ====================
    
    @tool(
        name="list_calendars",
        description="アクセス可能なカレンダーの一覧を取得します。各カレンダーのID、タイトル、説明、タイムゾーン、アクセスロール（owner/writer/reader）を表示。カレンダーIDは他のツールで使用可能。",
        input_schema={
            "type": "object",
            "properties": {},
            "required": []
        },
        category="calendar",
        tags=["google", "calendar", "list"]
    )
    async def list_calendars(self) -> str:
        """カレンダー一覧を取得"""
        try:
            url = f"{self.BASE_URL}/users/me/calendarList"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            calendars = data.get("items", [])
            if not calendars:
                return "📅 カレンダーが見つかりませんでした。"
            
            result = f"📅 カレンダー一覧 ({len(calendars)}件):\n\n"
            for calendar in calendars:
                calendar_id = calendar.get("id")
                summary = calendar.get("summary", "タイトルなし")
                description = calendar.get("description", "")
                timezone = calendar.get("timeZone", "")
                access_role = calendar.get("accessRole", "")
                
                role_icon = {
                    "owner": "👑",
                    "writer": "✏️",
                    "reader": "👁️"
                }.get(access_role, "")
                
                result += f"• {role_icon} {summary}\n"
                result += f"  🆔 ID: {calendar_id}\n"
                if description:
                    result += f"  📝 説明: {description}\n"
                if timezone:
                    result += f"  🌍 タイムゾーン: {timezone}\n"
                result += f"  🔐 権限: {access_role}\n\n"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "カレンダー一覧取得")
        except Exception as e:
            return f"🌐 ネットワークエラー: カレンダー一覧取得に失敗しました\n\n💬 詳細: {str(e)}"
    
    @tool(
        name="get_calendar",
        description="指定したカレンダーの詳細情報を取得します。カレンダーのタイトル、説明、場所、タイムゾーン等の詳細を表示。カレンダーIDはlist_calendarsで取得可能。",
        input_schema={
            "type": "object",
            "properties": {
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID"
                }
            },
            "required": ["calendar_id"]
        },
        category="calendar",
        tags=["google", "calendar", "details"]
    )
    async def get_calendar(self, calendar_id: str) -> str:
        """カレンダー詳細を取得"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            summary = data.get("summary", "タイトルなし")
            description = data.get("description", "")
            location = data.get("location", "")
            timezone = data.get("timeZone", "")
            
            result = f"📅 カレンダー詳細:\n\n"
            result += f"📝 タイトル: {summary}\n"
            result += f"🆔 ID: {calendar_id}\n"
            if description:
                result += f"📄 説明: {description}\n"
            if location:
                result += f"📍 場所: {location}\n"
            if timezone:
                result += f"🌍 タイムゾーン: {timezone}\n"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "カレンダー詳細取得")
        except Exception as e:
            return f"🌐 ネットワークエラー: カレンダー詳細取得に失敗しました\n\n💬 詳細: {str(e)}"
    
    @tool(
        name="create_calendar",
        description="新しいカレンダーを作成します。タイトルは必須。説明、場所、タイムゾーンも設定可能。作成されたカレンダーのIDとURLを返します。プロジェクトやカテゴリ別にカレンダーを整理する際に使用。",
        input_schema={
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "カレンダーのタイトル"
                },
                "description": {
                    "type": "string",
                    "description": "カレンダーの説明（オプション）"
                },
                "location": {
                    "type": "string",
                    "description": "カレンダーの場所（オプション）"
                },
                "timezone": {
                    "type": "string",
                    "description": "タイムゾーン（デフォルト: Asia/Tokyo）"
                }
            },
            "required": ["summary"]
        },
        category="calendar",
        tags=["google", "calendar", "create"]
    )
    async def create_calendar(
        self,
        summary: str,
        description: str = "",
        location: str = "",
        timezone: str = "Asia/Tokyo"
    ) -> str:
        """カレンダーを作成"""
        try:
            calendar_data = {
                "summary": summary,
                "timeZone": timezone
            }
            
            if description:
                calendar_data["description"] = description
            if location:
                calendar_data["location"] = location
            
            url = f"{self.BASE_URL}/calendars"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=calendar_data, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            calendar_id = data.get("id")
            
            result = f"✅ カレンダーを作成しました:\n\n"
            result += f"📝 タイトル: {summary}\n"
            result += f"🆔 カレンダーID: {calendar_id}\n"
            if description:
                result += f"📄 説明: {description}\n"
            if location:
                result += f"📍 場所: {location}\n"
            result += f"🌍 タイムゾーン: {timezone}\n"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "カレンダー作成")
        except Exception as e:
            return f"🌐 ネットワークエラー: カレンダー作成に失敗しました\n\n💬 詳細: {str(e)}"
    
    @tool(
        name="update_calendar",
        description="既存のカレンダーを更新します。カレンダーIDは必須。タイトル、説明、場所、タイムゾーンは個別に更新可能（指定した項目のみ更新）。更新後のカレンダー情報を返します。",
        input_schema={
            "type": "object",
            "properties": {
                "calendar_id": {
                    "type": "string",
                    "description": "カレンダーID"
                },
                "summary": {
                    "type": "string",
                    "description": "新しいタイトル（オプション）"
                },
                "description": {
                    "type": "string",
                    "description": "新しい説明（オプション）"
                },
                "location": {
                    "type": "string",
                    "description": "新しい場所（オプション）"
                },
                "timezone": {
                    "type": "string",
                    "description": "新しいタイムゾーン（オプション）"
                }
            },
            "required": ["calendar_id"]
        },
        category="calendar",
        tags=["google", "calendar", "update"]
    )
    async def update_calendar(
        self,
        calendar_id: str,
        summary: str = "",
        description: str = "",
        location: str = "",
        timezone: str = ""
    ) -> str:
        """カレンダーを更新"""
        try:
            url = f"{self.BASE_URL}/calendars/{calendar_id}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 既存データを取得
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                calendar_data = response.json()
                
                # 更新データをマージ
                if summary:
                    calendar_data["summary"] = summary
                if description:
                    calendar_data["description"] = description
                if location:
                    calendar_data["location"] = location
                if timezone:
                    calendar_data["timeZone"] = timezone
                
                # カレンダーを更新
                response = await client.put(url, json=calendar_data, headers=self._get_headers())
                response.raise_for_status()
                updated_calendar = response.json()
            
            result = f"✅ カレンダーを更新しました:\n\n"
            result += f"🆔 カレンダーID: {calendar_id}\n"
            result += f"📝 タイトル: {updated_calendar.get('summary', '')}\n"
            if updated_calendar.get("description"):
                result += f"📄 説明: {updated_calendar.get('description')}\n"
            if updated_calendar.get("location"):
                result += f"📍 場所: {updated_calendar.get('location')}\n"
            result += f"🌍 タイムゾーン: {updated_calendar.get('timeZone', '')}\n"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "カレンダー更新")
        except Exception as e:
            return f"🌐 ネットワークエラー: カレンダー更新に失敗しました\n\n💬 詳細: {str(e)}"
    
    @tool(
        name="delete_calendar",
        description="指定したカレンダーを削除します。カレンダーIDは必須。削除は取り消せず、カレンダー内の全イベントも削除されるため注意。プライマリカレンダーは削除不可。削除成功メッセージを返します。",
        input_schema={
            "type": "object",
            "properties": {
                "calendar_id": {
                    "type": "string",
                    "description": "削除するカレンダーのID（primary以外）"
                }
            },
            "required": ["calendar_id"]
        },
        category="calendar",
        tags=["google", "calendar", "delete"]
    )
    async def delete_calendar(self, calendar_id: str) -> str:
        """カレンダーを削除"""
        try:
            if calendar_id == "primary":
                return "❌ エラー: プライマリカレンダーは削除できません。"
            
            url = f"{self.BASE_URL}/calendars/{calendar_id}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(url, headers=self._get_headers())
                response.raise_for_status()
            
            return f"✅ カレンダー（ID: {calendar_id}）を削除しました。"
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "カレンダー削除")
        except Exception as e:
            return f"🌐 ネットワークエラー: カレンダー削除に失敗しました\n\n💬 詳細: {str(e)}"
    
    # ==================== 空き時間検索 ====================
    
    @tool(
        name="check_freebusy",
        description="指定した期間における複数カレンダーの空き時間を検索します。会議調整や予定調整に便利。カレンダーID（カンマ区切り）と期間（開始・終了日時）を指定。各カレンダーの忙しい時間帯を返します。",
        input_schema={
            "type": "object",
            "properties": {
                "calendar_ids": {
                    "type": "string",
                    "description": "カレンダーID（カンマ区切り、例: primary,user@example.com）"
                },
                "time_min": {
                    "type": "string",
                    "description": "検索開始日時（ISO 8601形式、例: 2024-12-25T09:00:00Z）"
                },
                "time_max": {
                    "type": "string",
                    "description": "検索終了日時（ISO 8601形式、例: 2024-12-25T18:00:00Z）"
                }
            },
            "required": ["calendar_ids", "time_min", "time_max"]
        },
        category="calendar",
        tags=["google", "calendar", "freebusy", "availability"]
    )
    async def check_freebusy(self, calendar_ids: str, time_min: str, time_max: str) -> str:
        """空き時間を検索"""
        try:
            calendar_list = [{"id": cid.strip()} for cid in calendar_ids.split(",") if cid.strip()]
            
            if not calendar_list:
                return "❌ バリデーションエラー: 有効なカレンダーIDを指定してください。"
            
            request_body = {
                "timeMin": time_min,
                "timeMax": time_max,
                "items": calendar_list
            }
            
            url = f"{self.BASE_URL}/freeBusy"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=request_body, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            calendars = data.get("calendars", {})
            
            result = f"📅 空き時間検索結果:\n\n"
            result += f"🕐 検索期間: {time_min} 〜 {time_max}\n\n"
            
            for calendar_id, calendar_data in calendars.items():
                busy_times = calendar_data.get("busy", [])
                errors = calendar_data.get("errors", [])
                
                result += f"【{calendar_id}】\n"
                
                if errors:
                    result += "  ❌ エラー: "
                    for error in errors:
                        result += f"{error.get('reason', '不明なエラー')} "
                    result += "\n\n"
                    continue
                
                if not busy_times:
                    result += "  ✅ 完全に空いています\n\n"
                else:
                    result += f"  ⏰ 予定あり（{len(busy_times)}件）:\n"
                    for busy in busy_times:
                        start = busy.get("start", "")
                        end = busy.get("end", "")
                        
                        # 時刻をフォーマット
                        try:
                            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
                            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
                            start_str = start_dt.strftime("%Y/%m/%d %H:%M")
                            end_str = end_dt.strftime("%H:%M")
                            result += f"    • {start_str} 〜 {end_str}\n"
                        except:
                            result += f"    • {start} 〜 {end}\n"
                    result += "\n"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "空き時間検索")
        except Exception as e:
            return f"🌐 ネットワークエラー: 空き時間検索に失敗しました\n\n💬 詳細: {str(e)}"
    
    # ==================== カラー管理 ====================
    
    @tool(
        name="get_colors",
        description="Google Calendarで利用可能なカラーパレットを取得します。イベントやカレンダーに設定できる色の一覧（IDと色コード）を表示。色の視覚的な整理に使用。",
        input_schema={
            "type": "object",
            "properties": {},
            "required": []
        },
        category="calendar",
        tags=["google", "calendar", "colors", "palette"]
    )
    async def get_colors(self) -> str:
        """利用可能なカラーを取得"""
        try:
            url = f"{self.BASE_URL}/colors"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
            
            event_colors = data.get("event", {})
            calendar_colors = data.get("calendar", {})
            
            result = "🎨 利用可能なカラー:\n\n"
            
            if event_colors:
                result += "【イベント用カラー】\n"
                for color_id, color_info in sorted(event_colors.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
                    background = color_info.get("background", "")
                    foreground = color_info.get("foreground", "")
                    result += f"  ID {color_id}: 背景 {background} / 文字 {foreground}\n"
                result += "\n"
            
            if calendar_colors:
                result += "【カレンダー用カラー】\n"
                for color_id, color_info in sorted(calendar_colors.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
                    background = color_info.get("background", "")
                    foreground = color_info.get("foreground", "")
                    result += f"  ID {color_id}: 背景 {background} / 文字 {foreground}\n"
            
            return result
        
        except httpx.HTTPStatusError as e:
            return self._handle_http_error(e, "カラー取得")
        except Exception as e:
            return f"🌐 ネットワークエラー: カラー取得に失敗しました\n\n💬 詳細: {str(e)}"

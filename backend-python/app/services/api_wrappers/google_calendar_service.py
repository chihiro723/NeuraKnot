"""
Google Calendar APIサービス
カレンダーイベントの取得・作成・更新・削除
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging
import httpx
from app.services.base import BaseService, tool

logger = logging.getLogger(__name__)


class GoogleCalendarService(BaseService):
    """Google Calendar API ラッパーサービス"""

    SERVICE_TYPE = "api_wrapper"
    SERVICE_NAME = "Google Calendar"
    SERVICE_DESCRIPTION = "Googleカレンダーのイベント管理（取得・作成・更新・削除）"
    SERVICE_ICON = ""  # アイコンなし（フロントエンドで統一されたアイコンを使用）

    BASE_URL = "https://www.googleapis.com/calendar/v3"

    def _register_tools(self):
        """ツールを登録"""
        # @toolデコレータが付与されたメソッドを自動登録
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
                    "title": "アクセストークン",
                    "description": "Google Calendar API OAuth 2.0 アクセストークン",
                    "minLength": 1
                }
            },
            "required": ["access_token"]
        }

    def _get_headers(self) -> Dict[str, str]:
        """
        HTTPヘッダーを取得

        Returns:
            認証ヘッダー
        """
        if not self.auth or "access_token" not in self.auth:
            raise ValueError("アクセストークンが設定されていません")

        return {
            "Authorization": f"Bearer {self.auth['access_token']}",
            "Content-Type": "application/json",
        }

    @property
    def calendar_id(self) -> str:
        """カレンダーIDを取得（デフォルト: primary）"""
        return "primary"

    @tool(
        name="get_today_events",
        description="今日のカレンダーイベントを取得します",
        input_schema={
            "type": "object",
            "properties": {},
            "required": []
        },
        category="calendar",
        tags=["google", "calendar", "events", "today"],
    )
    async def get_today_events(self) -> str:
        """
        今日のイベント一覧を取得

        Returns:
            イベント一覧（JSON文字列）
        """
        try:
            # 今日の開始時刻と終了時刻
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)

            time_min = today_start.isoformat() + "Z"
            time_max = today_end.isoformat() + "Z"

            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events"
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "orderBy": "startTime",
                "singleEvents": "true",
                "maxResults": 50,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            events = data.get("items", [])
            if not events:
                return "今日の予定はありません。"

            # イベント情報を整形
            result = "📅 今日の予定:\n\n"
            for event in events:
                start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date"))
                summary = event.get("summary", "タイトルなし")
                location = event.get("location", "")
                description = event.get("description", "")

                # 時刻をフォーマット
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
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            return f"エラー: カレンダーの取得に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error getting today's events: {e}", exc_info=True)
            return f"エラー: {str(e)}"

    @tool(
        name="get_upcoming_events",
        description="今後のカレンダーイベントを指定した日数分取得します",
        category="calendar",
        tags=["google", "calendar", "events", "upcoming"],
        input_schema={
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "取得する日数（1〜30日）",
                }
            },
            "required": ["days"],
        },
    )
    async def get_upcoming_events(self, days: int = 7) -> str:
        """
        今後のイベントを取得

        Args:
            days: 取得する日数（デフォルト: 7日）

        Returns:
            イベント一覧（JSON文字列）
        """
        try:
            if days < 1 or days > 30:
                return "エラー: 日数は1〜30の範囲で指定してください。"

            # 現在時刻と指定日数後の時刻
            time_min = datetime.now().isoformat() + "Z"
            time_max = (datetime.now() + timedelta(days=days)).isoformat() + "Z"

            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events"
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "orderBy": "startTime",
                "singleEvents": "true",
                "maxResults": 100,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            events = data.get("items", [])
            if not events:
                return f"今後{days}日間の予定はありません。"

            # イベント情報を整形
            result = f"📅 今後{days}日間の予定:\n\n"
            current_date = None

            for event in events:
                start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date"))
                summary = event.get("summary", "タイトルなし")
                location = event.get("location", "")

                # 日付でグルーピング
                if "T" in start:
                    event_datetime = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    event_date = event_datetime.date()
                    time_str = event_datetime.strftime("%H:%M")
                else:
                    event_date = datetime.fromisoformat(start).date()
                    time_str = "終日"

                if current_date != event_date:
                    current_date = event_date
                    date_str = event_date.strftime("%Y年%m月%d日 (%a)")
                    result += f"\n【{date_str}】\n"

                result += f"  • {time_str} - {summary}"
                if location:
                    result += f" ({location})"
                result += "\n"

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            return f"エラー: カレンダーの取得に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error getting upcoming events: {e}", exc_info=True)
            return f"エラー: {str(e)}"

    @tool(
        name="create_event",
        description="新しいカレンダーイベントを作成します",
        category="calendar",
        tags=["google", "calendar", "create", "event"],
        input_schema={
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "イベントのタイトル",
                },
                "start_datetime": {
                    "type": "string",
                    "description": "開始日時（ISO 8601形式、例: 2024-12-25T10:00:00）",
                },
                "end_datetime": {
                    "type": "string",
                    "description": "終了日時（ISO 8601形式、例: 2024-12-25T11:00:00）",
                },
                "description": {
                    "type": "string",
                    "description": "イベントの説明（オプション）",
                },
                "location": {
                    "type": "string",
                    "description": "場所（オプション）",
                },
            },
            "required": ["summary", "start_datetime", "end_datetime"],
        },
    )
    async def create_event(
        self,
        summary: str,
        start_datetime: str,
        end_datetime: str,
        description: str = "",
        location: str = "",
    ) -> str:
        """
        イベントを作成

        Args:
            summary: イベントのタイトル
            start_datetime: 開始日時（ISO 8601形式）
            end_datetime: 終了日時（ISO 8601形式）
            description: イベントの説明（オプション）
            location: 場所（オプション）

        Returns:
            作成結果メッセージ
        """
        try:
            # イベントデータを構築
            event_data = {
                "summary": summary,
                "start": {
                    "dateTime": start_datetime,
                    "timeZone": "Asia/Tokyo",
                },
                "end": {
                    "dateTime": end_datetime,
                    "timeZone": "Asia/Tokyo",
                },
            }

            if description:
                event_data["description"] = description
            if location:
                event_data["location"] = location

            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=event_data, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            event_id = data.get("id")
            html_link = data.get("htmlLink")

            result = f"✅ イベントを作成しました:\n"
            result += f"タイトル: {summary}\n"
            result += f"開始: {start_datetime}\n"
            result += f"終了: {end_datetime}\n"
            if location:
                result += f"場所: {location}\n"
            result += f"\nイベントID: {event_id}\n"
            result += f"URL: {html_link}"

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            return f"エラー: イベントの作成に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error creating event: {e}", exc_info=True)
            return f"エラー: {str(e)}"

    @tool(
        name="get_event_details",
        description="指定したイベントの詳細情報を取得します",
        category="calendar",
        tags=["google", "calendar", "event", "details"],
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "イベントID",
                }
            },
            "required": ["event_id"],
        },
    )
    async def get_event_details(self, event_id: str) -> str:
        """
        イベント詳細を取得

        Args:
            event_id: イベントID

        Returns:
            イベント詳細情報
        """
        try:
            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events/{event_id}"

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
            result += f"タイトル: {summary}\n"
            result += f"開始: {start}\n"
            result += f"終了: {end}\n"
            if location:
                result += f"場所: {location}\n"
            if description:
                result += f"説明: {description}\n"
            result += f"作成者: {creator}\n"

            if attendees:
                result += f"\n参加者:\n"
                for attendee in attendees:
                    email = attendee.get("email", "")
                    response_status = attendee.get("responseStatus", "needsAction")
                    status_icon = {
                        "accepted": "✅",
                        "declined": "❌",
                        "tentative": "❓",
                        "needsAction": "⏳",
                    }.get(response_status, "")
                    result += f"  {status_icon} {email}\n"

            result += f"\nURL: {html_link}"

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            elif e.response.status_code == 404:
                return "エラー: 指定されたイベントが見つかりません。"
            return f"エラー: イベント詳細の取得に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error getting event details: {e}", exc_info=True)
            return f"エラー: {str(e)}"

    @tool(
        name="update_event",
        description="既存のカレンダーイベントを更新します",
        category="calendar",
        tags=["google", "calendar", "update", "event"],
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "イベントID",
                },
                "summary": {
                    "type": "string",
                    "description": "新しいタイトル（オプション）",
                },
                "start_datetime": {
                    "type": "string",
                    "description": "新しい開始日時（ISO 8601形式、オプション）",
                },
                "end_datetime": {
                    "type": "string",
                    "description": "新しい終了日時（ISO 8601形式、オプション）",
                },
                "description": {
                    "type": "string",
                    "description": "新しい説明（オプション）",
                },
                "location": {
                    "type": "string",
                    "description": "新しい場所（オプション）",
                },
            },
            "required": ["event_id"],
        },
    )
    async def update_event(
        self,
        event_id: str,
        summary: str = "",
        start_datetime: str = "",
        end_datetime: str = "",
        description: str = "",
        location: str = "",
    ) -> str:
        """
        イベントを更新

        Args:
            event_id: イベントID
            summary: 新しいタイトル（オプション）
            start_datetime: 新しい開始日時（オプション）
            end_datetime: 新しい終了日時（オプション）
            description: 新しい説明（オプション）
            location: 新しい場所（オプション）

        Returns:
            更新結果メッセージ
        """
        try:
            # 既存のイベントを取得
            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events/{event_id}"

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
                        "timeZone": "Asia/Tokyo",
                    }
                if end_datetime:
                    event_data["end"] = {
                        "dateTime": end_datetime,
                        "timeZone": "Asia/Tokyo",
                    }
                if description:
                    event_data["description"] = description
                if location:
                    event_data["location"] = location

                # イベントを更新
                response = await client.put(url, json=event_data, headers=self._get_headers())
                response.raise_for_status()
                updated_event = response.json()

            result = f"✅ イベントを更新しました:\n"
            result += f"イベントID: {event_id}\n"
            result += f"タイトル: {updated_event.get('summary', '')}\n"
            result += f"開始: {updated_event.get('start', {}).get('dateTime', '')}\n"
            result += f"終了: {updated_event.get('end', {}).get('dateTime', '')}\n"

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            elif e.response.status_code == 404:
                return "エラー: 指定されたイベントが見つかりません。"
            return f"エラー: イベントの更新に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error updating event: {e}", exc_info=True)
            return f"エラー: {str(e)}"

    @tool(
        name="delete_event",
        description="指定したカレンダーイベントを削除します",
        category="calendar",
        tags=["google", "calendar", "delete", "event"],
        input_schema={
            "type": "object",
            "properties": {
                "event_id": {
                    "type": "string",
                    "description": "削除するイベントのID",
                }
            },
            "required": ["event_id"],
        },
    )
    async def delete_event(self, event_id: str) -> str:
        """
        イベントを削除

        Args:
            event_id: イベントID

        Returns:
            削除結果メッセージ
        """
        try:
            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events/{event_id}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(url, headers=self._get_headers())
                response.raise_for_status()

            return f"✅ イベント（ID: {event_id}）を削除しました。"

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            elif e.response.status_code == 404:
                return "エラー: 指定されたイベントが見つかりません。"
            elif e.response.status_code == 410:
                return "エラー: イベントは既に削除されています。"
            return f"エラー: イベントの削除に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error deleting event: {e}", exc_info=True)
            return f"エラー: {str(e)}"

    @tool(
        name="search_events",
        description="キーワードでカレンダーイベントを検索します",
        category="calendar",
        tags=["google", "calendar", "search"],
        input_schema={
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "検索キーワード",
                }
            },
            "required": ["keyword"],
        },
    )
    async def search_events(self, keyword: str) -> str:
        """
        イベントを検索

        Args:
            keyword: 検索キーワード

        Returns:
            検索結果
        """
        try:
            url = f"{self.BASE_URL}/calendars/{self.calendar_id}/events"
            params = {
                "q": keyword,
                "orderBy": "startTime",
                "singleEvents": "true",
                "maxResults": 20,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()

            events = data.get("items", [])
            if not events:
                return f"「{keyword}」に一致するイベントは見つかりませんでした。"

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
                result += f"\n  ID: {event_id}\n\n"

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Calendar API error: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 401:
                return "エラー: アクセストークンが無効です。再認証してください。"
            return f"エラー: 検索に失敗しました（ステータスコード: {e.response.status_code}）"
        except Exception as e:
            logger.error(f"Error searching events: {e}", exc_info=True)
            return f"エラー: {str(e)}"


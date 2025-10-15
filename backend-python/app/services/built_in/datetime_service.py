"""
日時関連サービス

現在時刻取得、日付計算、日数計算などの機能を提供
"""

import datetime
import pytz
from typing import Optional

from app.services.base import BaseService, tool


class DateTimeService(BaseService):
    """日時関連ツールを提供するサービス"""
    
    SERVICE_NAME = "日時サービス"
    SERVICE_DESCRIPTION = "現在時刻の取得、日付計算、日数計算などの日時関連機能"
    SERVICE_ICON = "⏰"
    SERVICE_TYPE = "built_in"
    
    def _register_tools(self):
        """ツールを登録"""
        # @toolデコレータが付与されたメソッドを自動登録
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="get_current_time",
        description="現在の日時（日本時間）を取得します",
        input_schema={
            "type": "object",
            "properties": {},
            "required": []
        },
        category="datetime",
        tags=["time", "clock", "now"]
    )
    def get_current_time(self) -> str:
        """現在の日時（日本時間）を取得"""
        jst = pytz.timezone('Asia/Tokyo')
        now = datetime.datetime.now(jst)
        return f"現在の日時（日本時間）: {now.strftime('%Y年%m月%d日 %H:%M:%S')}"
    
    @tool(
        name="calculate_date",
        description="指定した日数後/前の日付を計算します",
        input_schema={
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "日数（正の数で未来、負の数で過去）"
                },
                "from_date": {
                    "type": "string",
                    "description": "基準日（YYYY-MM-DD形式、省略時は今日）"
                }
            },
            "required": ["days"]
        },
        category="datetime",
        tags=["date", "calculation", "future", "past"]
    )
    def calculate_date(self, days: int, from_date: Optional[str] = None) -> str:
        """指定した日数後/前の日付を計算"""
        try:
            if from_date:
                base_date = datetime.datetime.strptime(from_date, "%Y-%m-%d")
            else:
                jst = pytz.timezone('Asia/Tokyo')
                base_date = datetime.datetime.now(jst)
            
            result_date = base_date + datetime.timedelta(days=days)
            
            direction = "後" if days > 0 else "前"
            return f"{abs(days)}日{direction}: {result_date.strftime('%Y年%m月%d日 (%A)')}"
        except ValueError:
            return "エラー: 日付形式が正しくありません（YYYY-MM-DD形式で指定してください）"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="days_between",
        description="2つの日付間の日数を計算します",
        input_schema={
            "type": "object",
            "properties": {
                "date1": {
                    "type": "string",
                    "description": "開始日（YYYY-MM-DD形式）"
                },
                "date2": {
                    "type": "string",
                    "description": "終了日（YYYY-MM-DD形式）"
                }
            },
            "required": ["date1", "date2"]
        },
        category="datetime",
        tags=["date", "calculation", "difference"]
    )
    def days_between(self, date1: str, date2: str) -> str:
        """2つの日付間の日数を計算"""
        try:
            d1 = datetime.datetime.strptime(date1, "%Y-%m-%d")
            d2 = datetime.datetime.strptime(date2, "%Y-%m-%d")
            diff = (d2 - d1).days
            
            return f"{date1} から {date2} まで: {abs(diff)}日間（{diff}日）"
        except ValueError:
            return "エラー: 日付形式が正しくありません（YYYY-MM-DD形式で指定してください）"
        except Exception as e:
            return f"エラー: {str(e)}"














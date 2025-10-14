"""
OpenWeather API サービス

天気情報の取得（認証不要・無料API）
"""

import httpx
from typing import Optional

from app.services.base import BaseService, tool


class OpenWeatherService(BaseService):
    """OpenWeather API サービス（認証不要）"""
    
    SERVICE_NAME = "OpenWeather"
    SERVICE_DESCRIPTION = "世界中の天気情報、予報を取得（認証不要の無料API）"
    SERVICE_ICON = "🌤️"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://wttr.in"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="get_weather",
        description="指定した都市の現在の天気情報を取得します",
        input_schema={
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "都市名（例: Tokyo, London, New York）"
                },
                "lang": {
                    "type": "string",
                    "description": "言語コード（ja/en、デフォルト: ja）",
                    "enum": ["ja", "en"]
                }
            },
            "required": ["city"]
        },
        category="weather",
        tags=["weather", "forecast", "temperature"]
    )
    async def get_weather(self, city: str, lang: str = "ja") -> str:
        """指定した都市の現在の天気情報を取得"""
        try:
            async with httpx.AsyncClient() as client:
                # wttr.in APIを使用（認証不要）
                params = {
                    "format": "3",  # 簡潔なフォーマット
                    "lang": lang
                }
                response = await client.get(
                    f"{self.BASE_URL}/{city}",
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()
                
                return f"{city}の天気:\n{response.text}"
                
        except httpx.HTTPStatusError as e:
            return f"エラー: 天気情報の取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="get_detailed_weather",
        description="指定した都市の詳細な天気情報を取得します",
        input_schema={
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "都市名（例: Tokyo, London, New York）"
                },
                "lang": {
                    "type": "string",
                    "description": "言語コード（ja/en、デフォルト: ja）",
                    "enum": ["ja", "en"]
                }
            },
            "required": ["city"]
        },
        category="weather",
        tags=["weather", "forecast", "detailed"]
    )
    async def get_detailed_weather(self, city: str, lang: str = "ja") -> str:
        """指定した都市の詳細な天気情報を取得"""
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "lang": lang
                }
                response = await client.get(
                    f"{self.BASE_URL}/{city}",
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()
                
                return f"{city}の詳細天気:\n{response.text}"
                
        except httpx.HTTPStatusError as e:
            return f"エラー: 天気情報の取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"






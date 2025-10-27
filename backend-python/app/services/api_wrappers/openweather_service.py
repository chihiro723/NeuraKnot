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
    SERVICE_DESCRIPTION = "世界中の天気情報、予報を取得"
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
        import logging
        import asyncio
        logger = logging.getLogger(__name__)

        # リトライ設定
        max_retries = 3
        retry_delay = 2  # 秒

        for attempt in range(max_retries):
            try:
                # タイムアウトを30秒に延長（ネットワークが遅い環境用）
                timeout = httpx.Timeout(30.0, connect=15.0)

                async with httpx.AsyncClient(timeout=timeout) as client:
                    # wttr.in APIを使用（認証不要）
                    params = {
                        "format": "3",  # 簡潔なフォーマット
                        "lang": lang
                    }
                    url = f"{self.BASE_URL}/{city}"
                    logger.info(f"[WEATHER] Requesting (attempt {attempt + 1}/{max_retries}): {url} with params: {params}")

                    response = await client.get(
                        url,
                        params=params
                    )
                    response.raise_for_status()

                    logger.info(f"[WEATHER] Successfully retrieved weather for {city}")
                    return f"{city}の天気:\n{response.text}"

            except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as e:
                logger.warning(f"[WEATHER] Network error on attempt {attempt + 1}/{max_retries}: {type(e).__name__}")
                if attempt < max_retries - 1:
                    logger.info(f"[WEATHER] Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    # 最後の試行でも失敗した場合、モックデータを返す
                    logger.error(f"[WEATHER] All retry attempts failed for {city}")
                    return f"{city}の天気:\n⛅️ 曇り時々晴れ +18°C (モックデータ - ネットワーク接続エラーのため)"

            except httpx.HTTPStatusError as e:
                error_msg = f"エラー: 天気情報の取得に失敗しました - HTTP {e.response.status_code}"
                logger.error(f"[WEATHER] HTTPStatusError: {error_msg}")
                return error_msg
            except Exception as e:
                error_msg = f"エラー: {type(e).__name__}: {str(e)}"
                logger.error(f"[WEATHER] Unexpected error: {error_msg}")
                return error_msg

        # ループを抜けた場合（通常は到達しない）
        return f"{city}の天気:\n⛅️ 曇り時々晴れ +18°C (モックデータ - ネットワーク接続エラーのため)"

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
        import logging
        import asyncio
        logger = logging.getLogger(__name__)

        # リトライ設定
        max_retries = 3
        retry_delay = 2  # 秒

        mock_response = f"""{city}の詳細天気 (モックデータ - ネットワーク接続エラーのため):

天気: ⛅️ 曇り時々晴れ
気温: 18°C (体感温度: 17°C)
湿度: 65%
風速: 3.2 m/s
降水確率: 20%

※ 実際の天気情報ではありません。ネットワーク接続が回復次第、正確な情報を取得できます。"""

        for attempt in range(max_retries):
            try:
                # タイムアウトを30秒に延長（ネットワークが遅い環境用）
                timeout = httpx.Timeout(30.0, connect=15.0)

                async with httpx.AsyncClient(timeout=timeout) as client:
                    params = {
                        "lang": lang
                    }
                    url = f"{self.BASE_URL}/{city}"
                    logger.info(f"[WEATHER] Requesting detailed (attempt {attempt + 1}/{max_retries}): {url} with params: {params}")

                    response = await client.get(
                        url,
                        params=params
                    )
                    response.raise_for_status()

                    logger.info(f"[WEATHER] Successfully retrieved detailed weather for {city}")
                    return f"{city}の詳細天気:\n{response.text}"

            except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as e:
                logger.warning(f"[WEATHER] Network error on attempt {attempt + 1}/{max_retries}: {type(e).__name__}")
                if attempt < max_retries - 1:
                    logger.info(f"[WEATHER] Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    # 最後の試行でも失敗した場合、モックデータを返す
                    logger.error(f"[WEATHER] All retry attempts failed for {city}")
                    return mock_response

            except httpx.HTTPStatusError as e:
                error_msg = f"エラー: 天気情報の取得に失敗しました - HTTP {e.response.status_code}"
                logger.error(f"[WEATHER] HTTPStatusError: {error_msg}")
                return error_msg
            except Exception as e:
                error_msg = f"エラー: {type(e).__name__}: {str(e)}"
                logger.error(f"[WEATHER] Unexpected error: {error_msg}")
                return error_msg

        # ループを抜けた場合（通常は到達しない）
        return mock_response






"""
Exchange Rate API サービス

為替レート情報の取得（認証不要・無料API）
"""

import httpx
from typing import Optional

from app.services.base import BaseService, tool


class ExchangeRateService(BaseService):
    """Exchange Rate API サービス（認証不要）"""
    
    SERVICE_NAME = "為替レート"
    SERVICE_DESCRIPTION = "世界の通貨の為替レート、通貨変換を取得（認証不要の無料API）"
    SERVICE_ICON = "💱"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://api.exchangerate-api.com/v4/latest"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="get_exchange_rates",
        description="指定した基準通貨の為替レートを取得します",
        input_schema={
            "type": "object",
            "properties": {
                "base_currency": {
                    "type": "string",
                    "description": "基準通貨（例: USD, EUR, JPY）"
                }
            },
            "required": ["base_currency"]
        },
        category="finance",
        tags=["currency", "exchange", "rate"]
    )
    async def get_exchange_rates(self, base_currency: str) -> str:
        """指定した基準通貨の為替レートを取得"""
        try:
            base_currency = base_currency.upper()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{base_currency}",
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                rates = data.get("rates", {})
                
                # 主要通貨のレートを表示
                major_currencies = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY"]
                result = f"{base_currency} の為替レート（{data.get('date', 'N/A')}時点）:\n"
                
                for currency in major_currencies:
                    if currency in rates and currency != base_currency:
                        result += f"  {currency}: {rates[currency]:.4f}\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            return f"エラー: 為替レートの取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="convert_currency",
        description="通貨を変換します",
        input_schema={
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "description": "金額"
                },
                "from_currency": {
                    "type": "string",
                    "description": "変換元の通貨（例: USD, EUR, JPY）"
                },
                "to_currency": {
                    "type": "string",
                    "description": "変換先の通貨（例: USD, EUR, JPY）"
                }
            },
            "required": ["amount", "from_currency", "to_currency"]
        },
        category="finance",
        tags=["currency", "exchange", "conversion"]
    )
    async def convert_currency(self, amount: float, from_currency: str, to_currency: str) -> str:
        """通貨を変換"""
        try:
            from_currency = from_currency.upper()
            to_currency = to_currency.upper()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{from_currency}",
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                rates = data.get("rates", {})
                
                if to_currency not in rates:
                    return f"エラー: 通貨コード '{to_currency}' が見つかりません"
                
                rate = rates[to_currency]
                converted_amount = amount * rate
                
                return f"{amount} {from_currency} = {converted_amount:.2f} {to_currency}\n(レート: 1 {from_currency} = {rate:.4f} {to_currency})"
                
        except httpx.HTTPStatusError as e:
            return f"エラー: 為替レートの取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"














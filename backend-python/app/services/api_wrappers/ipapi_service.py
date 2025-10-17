"""
IP API サービス

IPアドレス情報の取得（認証不要・無料API）
"""

import httpx
from typing import Optional

from app.services.base import BaseService, tool


class IPApiService(BaseService):
    """IP API サービス（認証不要）"""
    
    SERVICE_NAME = "IP情報"
    SERVICE_DESCRIPTION = "IPアドレスの位置情報、ISP情報を取得"
    SERVICE_ICON = "🌐"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "http://ip-api.com/json"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="get_ip_info",
        description="IPアドレスの位置情報、ISP情報を取得します",
        input_schema={
            "type": "object",
            "properties": {
                "ip_address": {
                    "type": "string",
                    "description": "IPアドレス（省略時は自身のIPアドレス）"
                }
            },
            "required": []
        },
        category="network",
        tags=["ip", "location", "network"]
    )
    async def get_ip_info(self, ip_address: Optional[str] = None) -> str:
        """IPアドレスの位置情報、ISP情報を取得"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.BASE_URL}/{ip_address}" if ip_address else self.BASE_URL
                params = {
                    "fields": "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query"
                }
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("status") == "fail":
                    return f"エラー: {data.get('message', '不明なエラー')}"
                
                result = f"""IP情報:
  IPアドレス: {data.get('query', 'N/A')}
  国: {data.get('country', 'N/A')} ({data.get('countryCode', 'N/A')})
  地域: {data.get('regionName', 'N/A')} ({data.get('region', 'N/A')})
  都市: {data.get('city', 'N/A')}
  郵便番号: {data.get('zip', 'N/A')}
  緯度/経度: {data.get('lat', 'N/A')}, {data.get('lon', 'N/A')}
  タイムゾーン: {data.get('timezone', 'N/A')}
  ISP: {data.get('isp', 'N/A')}
  組織: {data.get('org', 'N/A')}
  AS: {data.get('as', 'N/A')}"""
                
                return result
                
        except httpx.HTTPStatusError as e:
            return f"エラー: IP情報の取得に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"






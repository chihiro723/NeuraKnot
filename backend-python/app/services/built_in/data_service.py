"""
データ変換サービス

JSON整形、Base64エンコード/デコード、URLエンコード/デコードなどの機能を提供
"""

import json
import base64
from urllib.parse import quote, unquote

from app.services.base import BaseService, tool


class DataService(BaseService):
    """データ変換ツールを提供するサービス"""
    
    SERVICE_NAME = "データ変換サービス"
    SERVICE_DESCRIPTION = "JSON整形、Base64・URLエンコーディングなどのデータ変換機能"
    SERVICE_ICON = "🔄"
    SERVICE_TYPE = "built_in"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="format_json",
        description="JSON文字列を整形します",
        input_schema={
            "type": "object",
            "properties": {
                "json_string": {
                    "type": "string",
                    "description": "整形対象のJSON文字列"
                }
            },
            "required": ["json_string"]
        },
        category="data",
        tags=["json", "format", "pretty"]
    )
    def format_json(self, json_string: str) -> str:
        """JSON文字列を整形"""
        try:
            parsed = json.loads(json_string)
            formatted = json.dumps(parsed, ensure_ascii=False, indent=2)
            return f"整形されたJSON:\n{formatted}"
        except json.JSONDecodeError as e:
            return f"エラー: JSONの解析に失敗しました - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="base64_encode",
        description="テキストをBase64エンコードします",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "エンコード対象のテキスト"
                }
            },
            "required": ["text"]
        },
        category="data",
        tags=["base64", "encode", "encoding"]
    )
    def base64_encode(self, text: str) -> str:
        """テキストをBase64エンコード"""
        try:
            encoded = base64.b64encode(text.encode('utf-8')).decode('utf-8')
            return f"Base64エンコード結果:\n{encoded}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="base64_decode",
        description="Base64文字列をデコードします",
        input_schema={
            "type": "object",
            "properties": {
                "encoded_text": {
                    "type": "string",
                    "description": "デコード対象のBase64文字列"
                }
            },
            "required": ["encoded_text"]
        },
        category="data",
        tags=["base64", "decode", "decoding"]
    )
    def base64_decode(self, encoded_text: str) -> str:
        """Base64文字列をデコード"""
        try:
            decoded = base64.b64decode(encoded_text).decode('utf-8')
            return f"Base64デコード結果:\n{decoded}"
        except Exception as e:
            return f"エラー: デコードに失敗しました - {str(e)}"
    
    @tool(
        name="url_encode",
        description="テキストをURLエンコードします",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "エンコード対象のテキスト"
                }
            },
            "required": ["text"]
        },
        category="data",
        tags=["url", "encode", "encoding"]
    )
    def url_encode(self, text: str) -> str:
        """テキストをURLエンコード"""
        try:
            encoded = quote(text)
            return f"URLエンコード結果:\n{encoded}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="url_decode",
        description="URLエンコードされたテキストをデコードします",
        input_schema={
            "type": "object",
            "properties": {
                "encoded_text": {
                    "type": "string",
                    "description": "デコード対象のテキスト"
                }
            },
            "required": ["encoded_text"]
        },
        category="data",
        tags=["url", "decode", "decoding"]
    )
    def url_decode(self, encoded_text: str) -> str:
        """URLエンコードされたテキストをデコード"""
        try:
            decoded = unquote(encoded_text)
            return f"URLデコード結果:\n{decoded}"
        except Exception as e:
            return f"エラー: {str(e)}"













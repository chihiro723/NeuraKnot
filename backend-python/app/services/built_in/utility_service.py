"""
ユーティリティサービス

UUID生成、ハッシュ化、温度変換、長さ変換などの機能を提供
"""

import uuid
import hashlib
from typing import Optional

from app.services.base import BaseService, tool


class UtilityService(BaseService):
    """ユーティリティツールを提供するサービス"""
    
    SERVICE_NAME = "ユーティリティサービス"
    SERVICE_DESCRIPTION = "UUID生成、ハッシュ化、単位変換などの便利機能"
    SERVICE_ICON = "🛠️"
    SERVICE_TYPE = "built_in"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="generate_uuid",
        description="ユニークなUUID（v4）を生成します",
        input_schema={
            "type": "object",
            "properties": {},
            "required": []
        },
        category="utility",
        tags=["uuid", "generate", "identifier"]
    )
    def generate_uuid(self) -> str:
        """ユニークなUUID（v4）を生成"""
        return f"生成されたUUID: {str(uuid.uuid4())}"
    
    @tool(
        name="hash_text",
        description="テキストのハッシュ値を生成します",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "ハッシュ化対象のテキスト"
                },
                "algorithm": {
                    "type": "string",
                    "description": "ハッシュアルゴリズム（md5/sha1/sha256/sha512）",
                    "enum": ["md5", "sha1", "sha256", "sha512"]
                }
            },
            "required": ["text"]
        },
        category="utility",
        tags=["hash", "security", "crypto"]
    )
    def hash_text(self, text: str, algorithm: str = "sha256") -> str:
        """テキストのハッシュ値を生成"""
        try:
            algorithm = algorithm.lower()
            
            if algorithm == "md5":
                hash_obj = hashlib.md5(text.encode('utf-8'))
            elif algorithm == "sha1":
                hash_obj = hashlib.sha1(text.encode('utf-8'))
            elif algorithm == "sha256":
                hash_obj = hashlib.sha256(text.encode('utf-8'))
            elif algorithm == "sha512":
                hash_obj = hashlib.sha512(text.encode('utf-8'))
            else:
                return "エラー: 未対応のアルゴリズムです（md5/sha1/sha256/sha512のいずれかを指定）"
            
            return f"{algorithm.upper()}ハッシュ:\n{hash_obj.hexdigest()}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="convert_temperature",
        description="温度を変換します",
        input_schema={
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "description": "温度の値"
                },
                "from_unit": {
                    "type": "string",
                    "description": "変換元の単位（C/F/K）",
                    "enum": ["C", "F", "K", "c", "f", "k"]
                },
                "to_unit": {
                    "type": "string",
                    "description": "変換先の単位（C/F/K）",
                    "enum": ["C", "F", "K", "c", "f", "k"]
                }
            },
            "required": ["value", "from_unit", "to_unit"]
        },
        category="utility",
        tags=["temperature", "conversion", "unit"]
    )
    def convert_temperature(self, value: float, from_unit: str, to_unit: str) -> str:
        """温度を変換"""
        try:
            from_unit = from_unit.upper()
            to_unit = to_unit.upper()
            
            # まず摂氏に変換
            if from_unit == 'C':
                celsius = value
            elif from_unit == 'F':
                celsius = (value - 32) * 5/9
            elif from_unit == 'K':
                celsius = value - 273.15
            else:
                return "エラー: 未対応の単位です（C/F/Kのいずれかを指定）"
            
            # 目的の単位に変換
            if to_unit == 'C':
                result = celsius
            elif to_unit == 'F':
                result = celsius * 9/5 + 32
            elif to_unit == 'K':
                result = celsius + 273.15
            else:
                return "エラー: 未対応の単位です（C/F/Kのいずれかを指定）"
            
            return f"{value}{from_unit} = {result:.2f}{to_unit}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="convert_length",
        description="長さを変換します",
        input_schema={
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "description": "長さの値"
                },
                "from_unit": {
                    "type": "string",
                    "description": "変換元の単位（m/km/cm/mm/mile/yard/feet/inch）"
                },
                "to_unit": {
                    "type": "string",
                    "description": "変換先の単位（m/km/cm/mm/mile/yard/feet/inch）"
                }
            },
            "required": ["value", "from_unit", "to_unit"]
        },
        category="utility",
        tags=["length", "conversion", "unit"]
    )
    def convert_length(self, value: float, from_unit: str, to_unit: str) -> str:
        """長さを変換"""
        try:
            # メートルへの変換係数
            to_meter = {
                'm': 1,
                'km': 1000,
                'cm': 0.01,
                'mm': 0.001,
                'mile': 1609.34,
                'yard': 0.9144,
                'feet': 0.3048,
                'inch': 0.0254
            }
            
            from_unit = from_unit.lower()
            to_unit = to_unit.lower()
            
            if from_unit not in to_meter or to_unit not in to_meter:
                return f"エラー: 未対応の単位です（対応単位: {', '.join(to_meter.keys())}）"
            
            # メートルに変換してから目的の単位に変換
            meters = value * to_meter[from_unit]
            result = meters / to_meter[to_unit]
            
            return f"{value}{from_unit} = {result:.4f}{to_unit}"
        except Exception as e:
            return f"エラー: {str(e)}"




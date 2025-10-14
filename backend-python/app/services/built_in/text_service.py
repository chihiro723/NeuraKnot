"""
テキスト処理サービス

文字数カウント、大文字小文字変換、検索、置換などの機能を提供
"""

import re
from typing import Optional

from app.services.base import BaseService, tool


class TextService(BaseService):
    """テキスト処理ツールを提供するサービス"""
    
    SERVICE_NAME = "テキストサービス"
    SERVICE_DESCRIPTION = "文字数カウント、大文字小文字変換、検索、置換などのテキスト処理機能"
    SERVICE_ICON = "📝"
    SERVICE_TYPE = "built_in"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="count_characters",
        description="テキストの文字数をカウントします",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "カウント対象のテキスト"
                },
                "include_spaces": {
                    "type": "boolean",
                    "description": "スペースを含めるか（デフォルト: true）"
                }
            },
            "required": ["text"]
        },
        category="text",
        tags=["count", "characters", "length"]
    )
    def count_characters(self, text: str, include_spaces: bool = True) -> str:
        """テキストの文字数をカウント"""
        total_chars = len(text)
        chars_no_space = len(text.replace(' ', '').replace('\n', '').replace('\t', ''))
        lines = len(text.split('\n'))
        words = len(text.split())
        
        result = f"""文字数カウント結果:
  総文字数: {total_chars}文字
  空白を除く: {chars_no_space}文字
  単語数: {words}語
  行数: {lines}行"""
        
        return result
    
    @tool(
        name="text_case",
        description="テキストの大文字/小文字を変換します",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "変換対象のテキスト"
                },
                "case_type": {
                    "type": "string",
                    "description": "変換タイプ（upper/lower/title/capitalize）",
                    "enum": ["upper", "lower", "title", "capitalize"]
                }
            },
            "required": ["text", "case_type"]
        },
        category="text",
        tags=["case", "upper", "lower", "transform"]
    )
    def text_case(self, text: str, case_type: str) -> str:
        """テキストの大文字/小文字を変換"""
        try:
            case_type = case_type.lower()
            
            if case_type == "upper":
                return text.upper()
            elif case_type == "lower":
                return text.lower()
            elif case_type == "title":
                return text.title()
            elif case_type == "capitalize":
                return text.capitalize()
            else:
                return f"エラー: 未対応の変換タイプです（upper/lower/title/capitalizeのいずれかを指定してください）"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="search_text",
        description="テキスト内の文字列を検索します（正規表現対応）",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "検索対象のテキスト"
                },
                "pattern": {
                    "type": "string",
                    "description": "検索パターン（正規表現可）"
                },
                "case_sensitive": {
                    "type": "boolean",
                    "description": "大文字小文字を区別するか（デフォルト: false）"
                }
            },
            "required": ["text", "pattern"]
        },
        category="text",
        tags=["search", "regex", "find"]
    )
    def search_text(self, text: str, pattern: str, case_sensitive: bool = False) -> str:
        """テキスト内の文字列を検索"""
        try:
            flags = 0 if case_sensitive else re.IGNORECASE
            matches = re.findall(pattern, text, flags)
            
            if matches:
                return f"検索結果: {len(matches)}件の一致が見つかりました\n一致: {', '.join(matches[:10])}" + \
                       ("..." if len(matches) > 10 else "")
            else:
                return "検索結果: 一致する文字列が見つかりませんでした"
        except re.error as e:
            return f"エラー: 正規表現が正しくありません - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="replace_text",
        description="テキスト内の文字列を置換します",
        input_schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "対象テキスト"
                },
                "find": {
                    "type": "string",
                    "description": "検索文字列"
                },
                "replace": {
                    "type": "string",
                    "description": "置換文字列"
                }
            },
            "required": ["text", "find", "replace"]
        },
        category="text",
        tags=["replace", "substitute", "transform"]
    )
    def replace_text(self, text: str, find: str, replace: str) -> str:
        """テキスト内の文字列を置換"""
        try:
            result = text.replace(find, replace)
            count = text.count(find)
            
            return f"置換完了: {count}箇所を置換しました\n\n{result}"
        except Exception as e:
            return f"エラー: {str(e)}"




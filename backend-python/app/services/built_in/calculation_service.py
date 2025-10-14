"""
計算・数学サービス

数式計算、統計計算、パーセンテージ計算などの機能を提供
"""

import statistics
from typing import List

from app.services.base import BaseService, tool


class CalculationService(BaseService):
    """計算・数学ツールを提供するサービス"""
    
    SERVICE_NAME = "計算サービス"
    SERVICE_DESCRIPTION = "数式計算、統計計算、パーセンテージ計算などの数学機能"
    SERVICE_ICON = "🔢"
    SERVICE_TYPE = "built_in"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @tool(
        name="calculate",
        description="簡単な数式を計算します",
        input_schema={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "計算式（例: '2 + 3 * 4'）"
                }
            },
            "required": ["expression"]
        },
        category="calculation",
        tags=["math", "arithmetic", "expression"]
    )
    def calculate(self, expression: str) -> str:
        """簡単な数式を計算"""
        try:
            # 安全な計算のため、使用可能な文字を制限
            allowed_chars = set('0123456789+-*/.() ')
            if not all(c in allowed_chars for c in expression):
                return "エラー: 使用できない文字が含まれています（数字と+-*/().スペースのみ使用可能）"
            
            result = eval(expression)
            return f"計算結果: {expression} = {result}"
            
        except ZeroDivisionError:
            return "エラー: ゼロ除算が発生しました"
        except SyntaxError:
            return "エラー: 数式の構文が正しくありません"
        except Exception as e:
            return f"計算エラー: {str(e)}"
    
    @tool(
        name="calculate_statistics",
        description="数値リストの統計情報を計算します",
        input_schema={
            "type": "object",
            "properties": {
                "numbers": {
                    "type": "string",
                    "description": "カンマ区切りの数値リスト（例: '1,2,3,4,5'）"
                }
            },
            "required": ["numbers"]
        },
        category="calculation",
        tags=["math", "statistics", "analysis"]
    )
    def calculate_statistics(self, numbers: str) -> str:
        """数値リストの統計情報を計算"""
        try:
            num_list = [float(x.strip()) for x in numbers.split(',')]
            
            if not num_list:
                return "エラー: 数値が指定されていません"
            
            result = {
                "合計": sum(num_list),
                "平均": statistics.mean(num_list),
                "中央値": statistics.median(num_list),
                "最大値": max(num_list),
                "最小値": min(num_list),
                "データ数": len(num_list)
            }
            
            if len(num_list) >= 2:
                result["標準偏差"] = statistics.stdev(num_list)
            
            output = "統計情報:\n"
            for key, value in result.items():
                if isinstance(value, float):
                    output += f"  {key}: {value:.2f}\n"
                else:
                    output += f"  {key}: {value}\n"
            
            return output.strip()
            
        except ValueError:
            return "エラー: 数値として解釈できない値が含まれています"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="percentage",
        description="パーセンテージを計算します",
        input_schema={
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "description": "値"
                },
                "total": {
                    "type": "number",
                    "description": "全体"
                }
            },
            "required": ["value", "total"]
        },
        category="calculation",
        tags=["math", "percentage", "ratio"]
    )
    def percentage(self, value: float, total: float) -> str:
        """パーセンテージを計算"""
        try:
            if total == 0:
                return "エラー: 全体が0のためパーセンテージを計算できません"
            
            percentage = (value / total) * 100
            return f"{value} / {total} = {percentage:.2f}%"
        except Exception as e:
            return f"エラー: {str(e)}"




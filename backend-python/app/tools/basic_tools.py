"""
基本ツール定義
日時、計算、テキスト処理、データ変換など20個のツール
"""
from langchain_core.tools import tool
import datetime
import pytz
import json
import uuid
import base64
import hashlib
import re
import statistics
from urllib.parse import quote, unquote
from typing import List

# ========================================
# 日時関連ツール
# ========================================

@tool
def get_current_time_tool() -> str:
    """現在の日時（日本時間）を取得するツール"""
    jst = pytz.timezone('Asia/Tokyo')
    now = datetime.datetime.now(jst)
    return f"現在の日時（日本時間）: {now.strftime('%Y年%m月%d日 %H:%M:%S')}"

@tool
def calculate_date_tool(days: int, from_date: str = "") -> str:
    """
    指定した日数後/前の日付を計算するツール
    
    Args:
        days: 日数（正の数で未来、負の数で過去）
        from_date: 基準日（YYYY-MM-DD形式、省略時は今日）
    """
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

@tool
def days_between_tool(date1: str, date2: str) -> str:
    """
    2つの日付間の日数を計算するツール
    
    Args:
        date1: 開始日（YYYY-MM-DD形式）
        date2: 終了日（YYYY-MM-DD形式）
    """
    try:
        d1 = datetime.datetime.strptime(date1, "%Y-%m-%d")
        d2 = datetime.datetime.strptime(date2, "%Y-%m-%d")
        diff = (d2 - d1).days
        
        return f"{date1} から {date2} まで: {abs(diff)}日間（{diff}日）"
    except ValueError:
        return "エラー: 日付形式が正しくありません（YYYY-MM-DD形式で指定してください）"
    except Exception as e:
        return f"エラー: {str(e)}"

# ========================================
# 計算・数学ツール
# ========================================

@tool
def calculate_tool(expression: str) -> str:
    """
    簡単な数式を計算するツール
    
    Args:
        expression: 計算式（例: "2 + 3 * 4"）
    """
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

@tool
def statistics_tool(numbers: str) -> str:
    """
    数値リストの統計情報を計算するツール
    
    Args:
        numbers: カンマ区切りの数値リスト（例: "1,2,3,4,5"）
    """
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

@tool
def percentage_tool(value: float, total: float) -> str:
    """
    パーセンテージを計算するツール
    
    Args:
        value: 値
        total: 全体
    """
    try:
        if total == 0:
            return "エラー: 全体が0のためパーセンテージを計算できません"
        
        percentage = (value / total) * 100
        return f"{value} / {total} = {percentage:.2f}%"
    except Exception as e:
        return f"エラー: {str(e)}"

# ========================================
# テキスト処理ツール
# ========================================

@tool
def count_characters_tool(text: str, include_spaces: bool = True) -> str:
    """
    テキストの文字数をカウントするツール
    
    Args:
        text: カウント対象のテキスト
        include_spaces: スペースを含めるか（デフォルト: True）
    """
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

@tool
def text_case_tool(text: str, case_type: str) -> str:
    """
    テキストの大文字/小文字を変換するツール
    
    Args:
        text: 変換対象のテキスト
        case_type: 変換タイプ（upper/lower/title/capitalize）
    """
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

@tool
def search_text_tool(text: str, pattern: str, case_sensitive: bool = False) -> str:
    """
    テキスト内の文字列を検索するツール（正規表現対応）
    
    Args:
        text: 検索対象のテキスト
        pattern: 検索パターン（正規表現可）
        case_sensitive: 大文字小文字を区別するか（デフォルト: False）
    """
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

@tool
def replace_text_tool(text: str, find: str, replace: str) -> str:
    """
    テキスト内の文字列を置換するツール
    
    Args:
        text: 対象テキスト
        find: 検索文字列
        replace: 置換文字列
    """
    try:
        result = text.replace(find, replace)
        count = text.count(find)
        
        return f"置換完了: {count}箇所を置換しました\n\n{result}"
    except Exception as e:
        return f"エラー: {str(e)}"

# ========================================
# データ変換ツール
# ========================================

@tool
def format_json_tool(json_string: str) -> str:
    """
    JSON文字列を整形するツール
    
    Args:
        json_string: 整形対象のJSON文字列
    """
    try:
        parsed = json.loads(json_string)
        formatted = json.dumps(parsed, ensure_ascii=False, indent=2)
        return f"整形されたJSON:\n{formatted}"
    except json.JSONDecodeError as e:
        return f"エラー: JSONの解析に失敗しました - {str(e)}"
    except Exception as e:
        return f"エラー: {str(e)}"

@tool
def base64_encode_tool(text: str) -> str:
    """
    テキストをBase64エンコードするツール
    
    Args:
        text: エンコード対象のテキスト
    """
    try:
        encoded = base64.b64encode(text.encode('utf-8')).decode('utf-8')
        return f"Base64エンコード結果:\n{encoded}"
    except Exception as e:
        return f"エラー: {str(e)}"

@tool
def base64_decode_tool(encoded_text: str) -> str:
    """
    Base64文字列をデコードするツール
    
    Args:
        encoded_text: デコード対象のBase64文字列
    """
    try:
        decoded = base64.b64decode(encoded_text).decode('utf-8')
        return f"Base64デコード結果:\n{decoded}"
    except Exception as e:
        return f"エラー: デコードに失敗しました - {str(e)}"

@tool
def url_encode_tool(text: str) -> str:
    """
    テキストをURLエンコードするツール
    
    Args:
        text: エンコード対象のテキスト
    """
    try:
        encoded = quote(text)
        return f"URLエンコード結果:\n{encoded}"
    except Exception as e:
        return f"エラー: {str(e)}"

@tool
def url_decode_tool(encoded_text: str) -> str:
    """
    URLエンコードされたテキストをデコードするツール
    
    Args:
        encoded_text: デコード対象のテキスト
    """
    try:
        decoded = unquote(encoded_text)
        return f"URLデコード結果:\n{decoded}"
    except Exception as e:
        return f"エラー: {str(e)}"

# ========================================
# セキュリティ・ユーティリティツール
# ========================================

@tool
def generate_uuid_tool() -> str:
    """ユニークなUUID（v4）を生成するツール"""
    return f"生成されたUUID: {str(uuid.uuid4())}"

@tool
def hash_text_tool(text: str, algorithm: str = "sha256") -> str:
    """
    テキストのハッシュ値を生成するツール
    
    Args:
        text: ハッシュ化対象のテキスト
        algorithm: ハッシュアルゴリズム（md5/sha1/sha256/sha512）
    """
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

# ========================================
# 単位変換ツール
# ========================================

@tool
def convert_temperature_tool(value: float, from_unit: str, to_unit: str) -> str:
    """
    温度を変換するツール
    
    Args:
        value: 温度の値
        from_unit: 変換元の単位（C/F/K）
        to_unit: 変換先の単位（C/F/K）
    """
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

@tool
def convert_length_tool(value: float, from_unit: str, to_unit: str) -> str:
    """
    長さを変換するツール
    
    Args:
        value: 長さの値
        from_unit: 変換元の単位（m/km/cm/mm/mile/yard/feet/inch）
        to_unit: 変換先の単位（m/km/cm/mm/mile/yard/feet/inch）
    """
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

# ========================================
# ツールリストを取得する関数
# ========================================

def get_basic_tools():
    """全ての基本ツールのリストを返す"""
    return [
        # 日時関連
        get_current_time_tool,
        calculate_date_tool,
        days_between_tool,
        
        # 計算・数学
        calculate_tool,
        statistics_tool,
        percentage_tool,
        
        # テキスト処理
        count_characters_tool,
        text_case_tool,
        search_text_tool,
        replace_text_tool,
        
        # データ変換
        format_json_tool,
        base64_encode_tool,
        base64_decode_tool,
        url_encode_tool,
        url_decode_tool,
        
        # セキュリティ・ユーティリティ
        generate_uuid_tool,
        hash_text_tool,
        
        # 単位変換
        convert_temperature_tool,
        convert_length_tool,
    ]


"""
Brave Search API サービス

Braveの全機能を網羅：Web検索、ニュース検索、動画検索、画像検索、AI要約
要認証：Brave Search API Key
プラン：Web/ニュース/動画（無料）、画像/AI要約（有料プランのみ）
"""

import httpx
from typing import Optional, Dict, Any, Literal

from app.services.base import BaseService, tool


class BraveSearchService(BaseService):
    """Brave Search API サービス - 包括的な検索機能（要APIキー）"""
    
    SERVICE_NAME = "Brave Search"
    SERVICE_DESCRIPTION = "Brave Search APIによる検索: Web/ニュース/動画（無料）、画像/AI要約（有料プランのみ）"
    SERVICE_ICON = "🔍"
    SERVICE_TYPE = "api_wrapper"
    
    BASE_URL = "https://api.search.brave.com/res/v1"
    
    def _register_tools(self):
        """ツールを登録"""
        for name in dir(self):
            if not name.startswith('_'):
                method = getattr(self, name)
                if hasattr(method, '_tool_metadata'):
                    self._add_tool(name, method._tool_metadata)
    
    @classmethod
    def get_auth_schema(cls) -> Dict[str, Any]:
        """認証情報スキーマ"""
        return {
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "description": "Brave Search API キー",
                    "minLength": 1
                }
            },
            "required": ["api_key"]
        }
    
    def _get_headers(self) -> Dict[str, str]:
        """共通HTTPヘッダーを取得"""
        return {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.auth["api_key"]
        }
    
    @tool(
        name="web_search",
        description="Brave独自インデックスによるWeb検索。最新情報や詳細な調査に最適。言語/地域/期間/セーフサーチのフィルタリング対応。検索結果にはタイトル、URL、概要が含まれ、画像/動画/ニュース検索の前の基本調査として使用。SEOスパムを削減した高品質な結果を取得。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "検索クエリ（キーワードや質問文）"
                },
                "count": {
                    "type": "integer",
                    "description": "取得する結果数（1-20、デフォルト: 10）",
                    "minimum": 1,
                    "maximum": 20
                },
                "country": {
                    "type": "string",
                    "description": "国コード（例: JP=日本、US=アメリカ、GB=イギリス）。指定国の結果を優先"
                },
                "lang": {
                    "type": "string",
                    "description": "検索言語コード（例: ja、en、fr）。指定言語のページを優先",
                    "default": "ja"
                },
                "freshness": {
                    "type": "string",
                    "description": "期間フィルタ: pd=過去24時間、pw=過去1週間、pm=過去1ヶ月、py=過去1年。最新情報を取得したい場合に指定",
                    "enum": ["pd", "pw", "pm", "py"]
                },
                "safesearch": {
                    "type": "string",
                    "description": "セーフサーチレベル: strict=厳格、moderate=標準、off=オフ（デフォルト: moderate）",
                    "enum": ["strict", "moderate", "off"]
                }
            },
            "required": ["query"]
        },
        category="search",
        tags=["web", "search", "internet", "research"]
    )
    async def web_search(
        self, 
        query: str, 
        count: int = 10,
        country: Optional[str] = None,
        lang: str = "ja",
        freshness: Optional[Literal["pd", "pw", "pm", "py"]] = None,
        safesearch: Literal["strict", "moderate", "off"] = "moderate"
    ) -> str:
        """拡張Web検索 - フィルタリング対応"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                params: Dict[str, Any] = {
                    "q": query,
                    "count": min(count, 20),
                    "lang": lang,
                    "safesearch": safesearch
                }
                
                if country:
                    params["country"] = country
                if freshness:
                    params["freshness"] = freshness
                
                response = await client.get(
                    f"{self.BASE_URL}/web/search",
                    headers=self._get_headers(),
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                web_results = data.get("web", {}).get("results", [])
                
                if not web_results:
                    return f"検索クエリ「{query}」に対する結果が見つかりませんでした"
                
                # フィルタ情報を追加
                filter_info = []
                if country:
                    filter_info.append(f"国: {country}")
                if lang:
                    filter_info.append(f"言語: {lang}")
                if freshness:
                    freshness_map = {"pd": "過去24時間", "pw": "過去1週間", "pm": "過去1ヶ月", "py": "過去1年"}
                    filter_info.append(f"期間: {freshness_map[freshness]}")
                
                result = f"検索クエリ「{query}」の結果（{len(web_results)}件）"
                if filter_info:
                    result += f" [フィルタ: {', '.join(filter_info)}]"
                result += ":\n\n"
                
                for i, item in enumerate(web_results, 1):
                    title = item.get("title", "タイトルなし")
                    url = item.get("url", "")
                    description = item.get("description", "")
                    age = item.get("age", "")
                    
                    result += f"{i}. {title}\n"
                    result += f"   URL: {url}\n"
                    if description:
                        result += f"   概要: {description}\n"
                    if age:
                        result += f"   公開: {age}\n"
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 429:
                return "エラー: レート制限を超えました。しばらく待ってから再試行してください"
            elif e.response.status_code == 422:
                try:
                    error_detail = e.response.json()
                    return f"エラー: パラメータが不正です (422) - {error_detail}"
                except:
                    return f"エラー: パラメータが不正です (422) - {e.response.text}"
            return f"エラー: 検索に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"

    @tool(
        name="image_search",
        description="【有料プランのみ】画像専用検索。写真、イラスト、図表、ロゴなどビジュアルコンテンツを検索。各結果には画像URL、タイトル、ソースページ、サムネイル、解像度情報が含まれる。視覚的な情報が必要な場合や、デザイン参考、商品画像、説明図表の検索に最適。※無料プランでは利用不可",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "画像検索クエリ（探したい画像の説明）"
                },
                "count": {
                    "type": "integer",
                    "description": "取得する画像数（1-150、デフォルト: 20）",
                    "minimum": 1,
                    "maximum": 150
                },
                "safesearch": {
                    "type": "string",
                    "description": "セーフサーチレベル: strict=厳格、moderate=標準、off=オフ（デフォルト: moderate）",
                    "enum": ["strict", "moderate", "off"]
                }
            },
            "required": ["query"]
        },
        category="search",
        tags=["image", "search", "visual", "picture"]
    )
    async def image_search(
        self, 
        query: str, 
        count: int = 20,
        safesearch: Literal["strict", "moderate", "off"] = "moderate"
    ) -> str:
        """画像検索を実行"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": query,
                    "count": min(count, 150),
                    "safesearch": safesearch
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/images/search",
                    headers=self._get_headers(),
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                image_results = data.get("results", [])
                
                if not image_results:
                    return f"検索クエリ「{query}」に対する画像が見つかりませんでした"
                
                result = f"画像検索「{query}」の結果（{len(image_results)}件）:\n\n"
                
                for i, item in enumerate(image_results, 1):
                    title = item.get("title", "タイトルなし")
                    url = item.get("url", "")
                    thumbnail_url = item.get("thumbnail", {}).get("src", "")
                    source = item.get("source", "")
                    properties = item.get("properties", {})
                    width = properties.get("width", "不明")
                    height = properties.get("height", "不明")
                    
                    result += f"{i}. {title}\n"
                    result += f"   画像URL: {url}\n"
                    result += f"   サムネイル: {thumbnail_url}\n"
                    result += f"   解像度: {width}×{height}\n"
                    if source:
                        result += f"   ソース: {source}\n"
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 422:
                return "エラー: 画像検索は無料プランでは利用できません。Brave Search APIの有料プランへのアップグレードが必要です。"
            elif e.response.status_code == 429:
                return "エラー: レート制限を超えました。しばらく待ってから再試行してください"
            return f"エラー: 画像検索に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="video_search",
        description="動画専用検索。YouTube、Vimeo等の動画コンテンツを検索。各結果には動画タイトル、URL、サムネイル、再生時間、公開日、説明が含まれる。チュートリアル、解説動画、レビュー、エンタメ動画など、動画形式の情報を探す場合に使用。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "動画検索クエリ（探したい動画の内容）"
                },
                "count": {
                    "type": "integer",
                    "description": "取得する動画数（1-20、デフォルト: 10）",
                    "minimum": 1,
                    "maximum": 20
                },
                "safesearch": {
                    "type": "string",
                    "description": "セーフサーチレベル: strict=厳格、moderate=標準、off=オフ（デフォルト: moderate）",
                    "enum": ["strict", "moderate", "off"]
                }
            },
            "required": ["query"]
        },
        category="search",
        tags=["video", "search", "youtube", "media"]
    )
    async def video_search(
        self, 
        query: str, 
        count: int = 10,
        safesearch: Literal["strict", "moderate", "off"] = "moderate"
    ) -> str:
        """動画検索を実行"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": query,
                    "count": min(count, 20),
                    "safesearch": safesearch
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/videos/search",
                    headers=self._get_headers(),
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                video_results = data.get("results", [])
                
                if not video_results:
                    return f"検索クエリ「{query}」に対する動画が見つかりませんでした"
                
                result = f"動画検索「{query}」の結果（{len(video_results)}件）:\n\n"
                
                for i, item in enumerate(video_results, 1):
                    title = item.get("title", "タイトルなし")
                    url = item.get("url", "")
                    description = item.get("description", "")
                    age = item.get("age", "")
                    duration = item.get("duration", "")
                    thumbnail = item.get("thumbnail", {}).get("src", "")
                    
                    result += f"{i}. {title}\n"
                    result += f"   URL: {url}\n"
                    if duration:
                        result += f"   再生時間: {duration}\n"
                    if age:
                        result += f"   公開: {age}\n"
                    if description:
                        result += f"   説明: {description}\n"
                    if thumbnail:
                        result += f"   サムネイル: {thumbnail}\n"
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 429:
                return "エラー: レート制限を超えました。しばらく待ってから再試行してください"
            return f"エラー: 動画検索に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="news_search",
        description="ニュース記事専用検索。最新ニュース、報道、プレスリリース、時事情報を検索。各結果には記事タイトル、URL、概要、公開日、ソースメディアが含まれる。時事問題、最新動向、速報、業界ニュースなど、ジャーナリスティックな情報源が必要な場合に使用。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "ニュース検索クエリ（探したいニュースのトピック）"
                },
                "count": {
                    "type": "integer",
                    "description": "取得する記事数（1-20、デフォルト: 10）",
                    "minimum": 1,
                    "maximum": 20
                },
                "freshness": {
                    "type": "string",
                    "description": "期間フィルタ: pd=過去24時間、pw=過去1週間、pm=過去1ヶ月（デフォルト: pw）",
                    "enum": ["pd", "pw", "pm"]
                }
            },
            "required": ["query"]
        },
        category="search",
        tags=["news", "search", "article", "journalism"]
    )
    async def news_search(
        self, 
        query: str, 
        count: int = 10,
        freshness: Literal["pd", "pw", "pm"] = "pw"
    ) -> str:
        """ニュース検索を実行"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": query,
                    "count": min(count, 20),
                    "freshness": freshness
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/news/search",
                    headers=self._get_headers(),
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                
                data = response.json()
                news_results = data.get("results", [])
                
                if not news_results:
                    return f"検索クエリ「{query}」に対するニュースが見つかりませんでした"
                
                freshness_map = {"pd": "過去24時間", "pw": "過去1週間", "pm": "過去1ヶ月"}
                result = f"ニュース検索「{query}」の結果（{len(news_results)}件、期間: {freshness_map[freshness]}）:\n\n"
                
                for i, item in enumerate(news_results, 1):
                    title = item.get("title", "タイトルなし")
                    url = item.get("url", "")
                    description = item.get("description", "")
                    age = item.get("age", "")
                    source = item.get("source", {}).get("name", "")
                    
                    result += f"{i}. {title}\n"
                    result += f"   URL: {url}\n"
                    if source:
                        result += f"   メディア: {source}\n"
                    if age:
                        result += f"   公開: {age}\n"
                    if description:
                        result += f"   概要: {description}\n"
                    result += "\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 429:
                return "エラー: レート制限を超えました。しばらく待ってから再試行してください"
            return f"エラー: ニュース検索に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"
    
    @tool(
        name="summarizer_search",
        description="【有料プランのみ】AI要約付き検索。検索クエリに対して、複数のWeb情報源を自動収集・統合し、簡潔な要約と出典リストを提供。リサーチや情報整理の時間を大幅短縮。複雑なトピック、多角的な情報が必要な質問、包括的な理解が必要な場合に最適。通常のweb_searchより高度で統合的な回答を取得。※無料プランでは利用不可",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "要約検索クエリ（知りたい内容や質問）"
                },
                "entity_info": {
                    "type": "boolean",
                    "description": "エンティティ情報を含めるか（人物、企業、場所等の詳細情報。デフォルト: true）"
                }
            },
            "required": ["query"]
        },
        category="search",
        tags=["summarizer", "search", "ai", "research"]
    )
    async def summarizer_search(
        self, 
        query: str,
        entity_info: bool = True
    ) -> str:
        """AI要約付き検索を実行"""
        if not self.auth or "api_key" not in self.auth:
            return "エラー: APIキーが設定されていません"
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": query,
                    "entity_info": str(entity_info).lower()
                }
                
                response = await client.get(
                    f"{self.BASE_URL}/summarizer/search",
                    headers=self._get_headers(),
                    params=params,
                    timeout=30.0  # 要約は時間がかかる可能性があるため長めに設定
                )
                response.raise_for_status()
                
                data = response.json()
                
                # 要約の取得
                summary = data.get("summary", [])
                if not summary:
                    return f"検索クエリ「{query}」に対する要約情報が見つかりませんでした"
                
                result = f"要約検索「{query}」の結果:\n\n"
                
                # 要約テキスト
                result += "【要約】\n"
                for item in summary:
                    text = item.get("text", "")
                    if text:
                        result += f"{text}\n"
                result += "\n"
                
                # エンティティ情報
                if entity_info:
                    entities = data.get("entities", [])
                    if entities:
                        result += "【関連エンティティ】\n"
                        for entity in entities[:5]:  # 上位5件
                            title = entity.get("title", "")
                            description = entity.get("description", "")
                            if title:
                                result += f"- {title}"
                                if description:
                                    result += f": {description}"
                                result += "\n"
                        result += "\n"
                
                # 出典情報
                results = data.get("results", [])
                if results:
                    result += "【出典】\n"
                    for i, source in enumerate(results[:10], 1):  # 上位10件
                        title = source.get("title", "タイトルなし")
                        url = source.get("url", "")
                        result += f"{i}. {title}\n   {url}\n"
                
                return result.strip()
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return "エラー: APIキーが無効です"
            elif e.response.status_code == 422:
                return "エラー: AI要約検索は無料プランでは利用できません。Brave Search APIの有料プランへのアップグレードが必要です。"
            elif e.response.status_code == 429:
                return "エラー: レート制限を超えました。しばらく待ってから再試行してください"
            return f"エラー: 要約検索に失敗しました - {e.response.status_code}"
        except httpx.RequestError as e:
            return f"エラー: リクエストエラー - {str(e)}"
        except Exception as e:
            return f"エラー: {str(e)}"














"""
サービスレジストリ

全てのサービスを登録・管理するシングルトンクラス
"""

from typing import Dict, List, Type, Optional
from app.services.base import BaseService

# サービスのインポート
from app.services.built_in import (
    DateTimeService,
    CalculationService,
    TextService,
    DataService,
    UtilityService,
)
from app.services.api_wrappers import (
    OpenWeatherService,
    IPApiService,
    ExchangeRateService,
    BraveSearchService,
    NotionService,
    SlackService,
    GoogleCalendarService,
)


class ServiceRegistry:
    """
    サービスレジストリ（シングルトン）
    
    全てのサービスクラスを登録し、動的にツール情報を取得できるようにする
    """
    
    _instance: Optional['ServiceRegistry'] = None
    _services: Dict[str, Type[BaseService]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_services()
        return cls._instance
    
    def _initialize_services(self):
        """全サービスを自動登録"""
        # Built-inサービス
        self.register(DateTimeService)
        self.register(CalculationService)
        self.register(TextService)
        self.register(DataService)
        self.register(UtilityService)
        
        # API Wrappersサービス
        self.register(OpenWeatherService)
        self.register(IPApiService)
        self.register(ExchangeRateService)
        self.register(BraveSearchService)
        self.register(NotionService)
        self.register(SlackService)
        self.register(GoogleCalendarService)
    
    def register(self, service_class: Type[BaseService]):
        """
        サービスクラスを登録
        
        Args:
            service_class: 登録するサービスクラス
        """
        class_name = service_class.__name__
        self._services[class_name] = service_class
    
    def get_service_class(self, class_name: str) -> Optional[Type[BaseService]]:
        """
        サービスクラスを取得
        
        Args:
            class_name: サービスクラス名
            
        Returns:
            サービスクラス、見つからない場合はNone
        """
        return self._services.get(class_name)
    
    def list_all_services(self) -> List[Dict]:
        """
        全サービスのメタデータを取得
        
        Returns:
            サービスメタデータのリスト
        """
        services = []
        for class_name, service_class in self._services.items():
            services.append({
                "class_name": class_name,
                "name": service_class.SERVICE_NAME,
                "description": service_class.SERVICE_DESCRIPTION,
                "icon": service_class.SERVICE_ICON,
                "type": service_class.SERVICE_TYPE,
                "config_schema": service_class.get_config_schema(),
                "auth_schema": service_class.get_auth_schema(),
            })
        return services
    
    def get_service_tools(self, class_name: str) -> List[Dict]:
        """
        指定したサービスのツール一覧を取得
        
        Args:
            class_name: サービスクラス名
            
        Returns:
            ツールメタデータのリスト、サービスが見つからない場合は空リスト
        """
        service_class = self.get_service_class(class_name)
        if not service_class:
            return []
        
        # サービスのインスタンスを作成（認証情報なし）
        instance = service_class()
        return [tool.dict() for tool in instance.get_tools()]
    
    def create_service_instance(
        self,
        class_name: str,
        config: Optional[dict] = None,
        auth: Optional[dict] = None
    ) -> Optional[BaseService]:
        """
        サービスのインスタンスを作成
        
        Args:
            class_name: サービスクラス名
            config: サービス設定
            auth: 認証情報
            
        Returns:
            サービスインスタンス、見つからない場合はNone
        """
        service_class = self.get_service_class(class_name)
        if not service_class:
            return None
        
        return service_class(config=config, auth=auth)


# グローバルなレジストリインスタンス
registry = ServiceRegistry()


def get_registry() -> ServiceRegistry:
    """
    レジストリインスタンスを取得
    
    Returns:
        ServiceRegistryのシングルトンインスタンス
    """
    return registry













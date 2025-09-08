from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# 環境変数を読み込み
load_dotenv()

app = FastAPI(
    title="BridgeSpeak AI Server",
    description="シンプルなテストサーバー",
    version="1.0.0"
)

@app.get("/")
async def read_root():
    return {"message": "BridgeSpeak AI Server が正常に動作しています！"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "encryption_key_set": bool(os.getenv("ENCRYPTION_KEY")),
        "jwt_secret_set": bool(os.getenv("JWT_SECRET_KEY"))
    }

@app.get("/env-check")
async def env_check():
    """環境変数の設定状況を確認"""
    return {
        "ENVIRONMENT": os.getenv("ENVIRONMENT"),
        "API_HOST": os.getenv("API_HOST"),
        "API_PORT": os.getenv("API_PORT"),
        "SUPABASE_URL_SET": bool(os.getenv("SUPABASE_URL")) and os.getenv("SUPABASE_URL") != "your_supabase_url",
        "OPENAI_API_KEY_SET": bool(os.getenv("OPENAI_API_KEY")) and os.getenv("OPENAI_API_KEY") != "your_openai_api_key",
        "ENCRYPTION_KEY_SET": bool(os.getenv("ENCRYPTION_KEY")) and os.getenv("ENCRYPTION_KEY") != "your_fernet_encryption_key",
        "JWT_SECRET_KEY_SET": bool(os.getenv("JWT_SECRET_KEY")) and os.getenv("JWT_SECRET_KEY") != "your_jwt_secret",
        "REDIS_URL": os.getenv("REDIS_URL"),
        "LOG_LEVEL": os.getenv("LOG_LEVEL"),
        "ALLOWED_ORIGINS": os.getenv("ALLOWED_ORIGINS")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
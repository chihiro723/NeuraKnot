#!/bin/bash

# API動作確認スクリプト

BASE_URL="http://localhost:8080"

echo "🚀 NeuraKnot API 動作確認開始"
echo "=================================="

# ヘルスチェック
echo "1. ヘルスチェック"
echo "------------------"
curl -s "$BASE_URL/health" | jq '.' || echo "❌ ヘルスチェック失敗"
echo ""

# ユーザー登録
echo "2. ユーザー登録"
echo "----------------"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$SIGNUP_RESPONSE" | jq '.' || echo "❌ ユーザー登録失敗"
echo ""

# 重複登録テスト
echo "3. 重複登録テスト"
echo "------------------"
curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq '.' || echo "❌ 重複登録テスト失敗"
echo ""

# ユーザーログイン
echo "4. ユーザーログイン"
echo "-------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.' || echo "❌ ユーザーログイン失敗"
echo ""

# 間違ったパスワードでログイン
echo "5. 間違ったパスワードでログイン"
echo "------------------------------"
curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }' | jq '.' || echo "❌ 間違ったパスワードテスト失敗"
echo ""

# 存在しないユーザーでログイン
echo "6. 存在しないユーザーでログイン"
echo "------------------------------"
curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "password123"
  }' | jq '.' || echo "❌ 存在しないユーザーテスト失敗"
echo ""

echo "✅ API動作確認完了"
echo "=================================="

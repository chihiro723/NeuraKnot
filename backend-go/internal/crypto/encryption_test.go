package crypto

import (
	"crypto/rand"
	"encoding/base64"
	"io"
	"testing"
)

func generateTestKey() string {
	key := make([]byte, 32)
	io.ReadFull(rand.Reader, key)
	return base64.StdEncoding.EncodeToString(key)
}

func TestNewEncryptionService(t *testing.T) {
	tests := []struct {
		name      string
		keyBase64 string
		wantErr   bool
	}{
		{
			name:      "Valid 32-byte key",
			keyBase64: generateTestKey(),
			wantErr:   false,
		},
		{
			name:      "Empty key",
			keyBase64: "",
			wantErr:   true,
		},
		{
			name:      "Too short key",
			keyBase64: base64.StdEncoding.EncodeToString([]byte("short")),
			wantErr:   true,
		},
		{
			name:      "Invalid base64",
			keyBase64: "not-valid-base64!!!",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, err := NewEncryptionService(tt.keyBase64)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewEncryptionService() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && service == nil {
				t.Error("Expected non-nil service for valid key")
			}
		})
	}
}

func TestEncryptDecrypt(t *testing.T) {
	// テスト用のマスターキーを生成
	keyBase64 := generateTestKey()

	service, err := NewEncryptionService(keyBase64)
	if err != nil {
		t.Fatalf("Failed to create service: %v", err)
	}

	// テストデータ
	tests := []struct {
		name      string
		plaintext string
	}{
		{"Simple API key", "sk-1234567890abcdef"},
		{"Long Slack token", "xoxb-1234567890-1234567890-abcdefghijklmnopqrstuvwx"},
		{"Unicode", "日本語のAPIキー🔑"},
		{"Special chars", "key!@#$%^&*()_+-=[]{}|;:',.<>?/~`"},
		{"Very long key", string(make([]byte, 1000))},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 暗号化
			ciphertext, nonce, err := service.Encrypt(tt.plaintext)
			if err != nil {
				t.Fatalf("Encrypt failed: %v", err)
			}

			// Nonce長の確認
			if len(nonce) != 12 {
				t.Errorf("Nonce size = %d, want 12", len(nonce))
			}

			// 暗号文が平文と異なることを確認
			if string(ciphertext) == tt.plaintext {
				t.Error("Ciphertext should not equal plaintext")
			}

			// 復号化
			decrypted, err := service.Decrypt(ciphertext, nonce)
			if err != nil {
				t.Fatalf("Decrypt failed: %v", err)
			}

			// 復号化結果が元の平文と一致するか確認
			if decrypted != tt.plaintext {
				t.Errorf("Decrypted = %q, want %q", decrypted, tt.plaintext)
			}
		})
	}
}

func TestEncryptEmptyString(t *testing.T) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)

	_, _, err := service.Encrypt("")
	if err == nil {
		t.Error("Encrypt with empty string should fail")
	}
}

func TestDecryptWithWrongNonce(t *testing.T) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)

	plaintext := "secret-api-key"
	ciphertext, _, _ := service.Encrypt(plaintext)

	// 異なるNonceで復号化を試みる
	wrongNonce := make([]byte, 12)
	io.ReadFull(rand.Reader, wrongNonce)

	_, err := service.Decrypt(ciphertext, wrongNonce)
	if err == nil {
		t.Error("Decrypt with wrong nonce should fail")
	}
}

func TestDecryptWithInvalidNonceSize(t *testing.T) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)

	plaintext := "secret-api-key"
	ciphertext, _, _ := service.Encrypt(plaintext)

	// 不正なサイズのNonce
	wrongNonce := make([]byte, 10) // 12バイトでなければならない

	_, err := service.Decrypt(ciphertext, wrongNonce)
	if err == nil {
		t.Error("Decrypt with invalid nonce size should fail")
	}
}

func TestDecryptWithTamperedCiphertext(t *testing.T) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)

	plaintext := "secret-api-key"
	ciphertext, nonce, _ := service.Encrypt(plaintext)

	// 暗号文を改ざん
	ciphertext[0] ^= 0xFF

	_, err := service.Decrypt(ciphertext, nonce)
	if err == nil {
		t.Error("Decrypt with tampered ciphertext should fail (GCM authentication)")
	}
}

func TestEncryptDecryptBase64(t *testing.T) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)

	plaintext := "xoxb-slack-api-key-123456"

	// Base64形式で暗号化
	ciphertextB64, nonceB64, err := service.EncryptToBase64(plaintext)
	if err != nil {
		t.Fatalf("EncryptToBase64 failed: %v", err)
	}

	// Base64であることを確認
	if _, err := base64.StdEncoding.DecodeString(ciphertextB64); err != nil {
		t.Error("Ciphertext is not valid Base64")
	}
	if _, err := base64.StdEncoding.DecodeString(nonceB64); err != nil {
		t.Error("Nonce is not valid Base64")
	}

	// Base64形式から復号化
	decrypted, err := service.DecryptFromBase64(ciphertextB64, nonceB64)
	if err != nil {
		t.Fatalf("DecryptFromBase64 failed: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("Decrypted = %q, want %q", decrypted, plaintext)
	}
}

func TestMultipleEncryptionsProduceDifferentCiphertexts(t *testing.T) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)

	plaintext := "same-api-key"

	// 同じ平文を2回暗号化
	ciphertext1, nonce1, _ := service.Encrypt(plaintext)
	ciphertext2, nonce2, _ := service.Encrypt(plaintext)

	// Nonceが異なることを確認（ランダム生成されるため）
	if string(nonce1) == string(nonce2) {
		t.Error("Two encryptions produced the same nonce (should be random)")
	}

	// 暗号文も異なることを確認
	if string(ciphertext1) == string(ciphertext2) {
		t.Error("Two encryptions produced the same ciphertext")
	}

	// どちらも正しく復号化できることを確認
	decrypted1, _ := service.Decrypt(ciphertext1, nonce1)
	decrypted2, _ := service.Decrypt(ciphertext2, nonce2)

	if decrypted1 != plaintext || decrypted2 != plaintext {
		t.Error("Failed to decrypt one or both ciphertexts")
	}
}

// ベンチマーク
func BenchmarkEncrypt(b *testing.B) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)
	plaintext := "sk-1234567890abcdef1234567890abcdef"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _, _ = service.Encrypt(plaintext)
	}
}

func BenchmarkDecrypt(b *testing.B) {
	keyBase64 := generateTestKey()
	service, _ := NewEncryptionService(keyBase64)
	plaintext := "sk-1234567890abcdef1234567890abcdef"
	ciphertext, nonce, _ := service.Encrypt(plaintext)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.Decrypt(ciphertext, nonce)
	}
}

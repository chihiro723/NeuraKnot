package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// EncryptionService はAES-256-GCMを使った暗号化サービス
type EncryptionService struct {
	masterKey []byte
}

// NewEncryptionService は暗号化サービスを初期化
// keyBase64: Base64エンコードされた32バイトのマスターキー
func NewEncryptionService(keyBase64 string) (*EncryptionService, error) {
	// Base64デコード
	key, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode master key: %w", err)
	}

	// 32バイト（256ビット）であることを確認
	if len(key) != 32 {
		return nil, fmt.Errorf("master key must be 32 bytes, got %d bytes", len(key))
	}

	return &EncryptionService{masterKey: key}, nil
}

// Encrypt はAES-256-GCMで平文を暗号化
// 戻り値: (暗号文, Nonce, エラー)
func (s *EncryptionService) Encrypt(plaintext string) ([]byte, []byte, error) {
	if plaintext == "" {
		return nil, nil, errors.New("plaintext cannot be empty")
	}

	// AESブロック暗号を作成
	block, err := aes.NewCipher(s.masterKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// GCMモードで暗号化（認証タグ付き）
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// ランダムなNonceを生成（12バイト）
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// 暗号化実行
	// GCM.Seal は暗号文に認証タグを自動追加
	ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)

	return ciphertext, nonce, nil
}

// Decrypt はAES-256-GCMで暗号文を復号化
func (s *EncryptionService) Decrypt(ciphertext []byte, nonce []byte) (string, error) {
	if len(ciphertext) == 0 {
		return "", errors.New("ciphertext cannot be empty")
	}

	if len(nonce) == 0 {
		return "", errors.New("nonce cannot be empty")
	}

	// AESブロック暗号を作成
	block, err := aes.NewCipher(s.masterKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	// GCMモードで復号化
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Nonceサイズの検証
	if len(nonce) != gcm.NonceSize() {
		return "", fmt.Errorf("invalid nonce size: got %d, want %d", len(nonce), gcm.NonceSize())
	}

	// 復号化実行（認証タグも検証）
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// EncryptToBase64 はAPIキーを暗号化してBase64エンコードで返す（オプション）
// フロントエンドやAPI経由で暗号化データを扱う場合に便利
func (s *EncryptionService) EncryptToBase64(plaintext string) (ciphertextB64 string, nonceB64 string, err error) {
	ciphertext, nonce, err := s.Encrypt(plaintext)
	if err != nil {
		return "", "", err
	}

	return base64.StdEncoding.EncodeToString(ciphertext),
		base64.StdEncoding.EncodeToString(nonce),
		nil
}

// DecryptFromBase64 はBase64エンコードされた暗号文を復号化（オプション）
func (s *EncryptionService) DecryptFromBase64(ciphertextB64 string, nonceB64 string) (string, error) {
	var err error

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(nonceB64)
	if err != nil {
		return "", fmt.Errorf("failed to decode nonce: %w", err)
	}

	return s.Decrypt(ciphertext, nonce)
}

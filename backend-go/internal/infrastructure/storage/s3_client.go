package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client S3/MinIOクライアント
type S3Client struct {
	client     *s3.Client
	bucketName string
	baseURL    string
}

// NewS3Client S3クライアントを作成
func NewS3Client(bucketName, region, endpoint, baseURL, accessKeyID, secretAccessKey string) (*S3Client, error) {
	var cfg aws.Config
	var err error

	if endpoint != "" {
		// MinIO（開発環境）の設定
		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:               endpoint,
				HostnameImmutable: true,
				SigningRegion:     region,
			}, nil
		})

		cfg, err = config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(region),
			config.WithEndpointResolverWithOptions(customResolver),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				accessKeyID,
				secretAccessKey,
				"",
			)),
		)
	} else {
		// AWS S3（本番環境）の設定
		cfg, err = config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(region),
		)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		// MinIO用の設定
		if endpoint != "" {
			o.UsePathStyle = true
		}
	})

	return &S3Client{
		client:     client,
		bucketName: bucketName,
		baseURL:    baseURL,
	}, nil
}

// UploadAvatar アバター画像をアップロード
// userType: "users" または "agents"
// entityID: ユーザーIDまたはエージェントID
// file: アップロードするファイル
// contentType: Content-Type (例: "image/jpeg")
// 返り値: 画像のURL
func (c *S3Client) UploadAvatar(ctx context.Context, userType, entityID string, file io.Reader, contentType string) (string, error) {
	// 拡張子を決定
	ext := "jpg"
	if strings.Contains(contentType, "png") {
		ext = "png"
	} else if strings.Contains(contentType, "webp") {
		ext = "webp"
	}

	// S3のキーを生成
	key := fmt.Sprintf("avatars/%s/%s/avatar.%s", userType, entityID, ext)

	// S3にアップロード
	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// URLを生成
	url := fmt.Sprintf("%s/%s", c.baseURL, key)
	return url, nil
}

// DeleteAvatar アバター画像を削除
func (c *S3Client) DeleteAvatar(ctx context.Context, avatarURL string) error {
	// URLからキーを抽出
	key := strings.TrimPrefix(avatarURL, c.baseURL+"/")
	if key == avatarURL {
		// baseURLが含まれていない場合はエラー
		return fmt.Errorf("invalid avatar URL: %s", avatarURL)
	}

	// S3から削除
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete from S3: %w", err)
	}

	return nil
}

// GetObjectURL オブジェクトのURLを取得（公開バケットの場合）
func (c *S3Client) GetObjectURL(key string) string {
	return fmt.Sprintf("%s/%s", c.baseURL, key)
}

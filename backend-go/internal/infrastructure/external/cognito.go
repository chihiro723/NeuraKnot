package external

import (
	"backend-go/internal/domain/user"
	"backend-go/internal/infrastructure/config"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	cognitoidentityprovider "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/jwk"
	"github.com/lestrrat-go/jwx/jwt"
)

// CognitoService Cognito認証サービス実装
type CognitoService struct {
	region         string
	userPoolID     string
	clientID       string
	clientSecret   string
	jwksURL        string
	jwks           jwk.Set
	client         *cognitoidentityprovider.Client
	userRepository user.UserRepository
}

// NewCognitoService Cognitoサービスを作成
func NewCognitoService(cfg *config.Config, userRepository user.UserRepository) (*CognitoService, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(context.TODO(),
		awsconfig.WithRegion(cfg.Cognito.Region),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := cognitoidentityprovider.NewFromConfig(awsCfg)
	jwksURL := fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", cfg.Cognito.Region, cfg.Cognito.UserPoolID)

	// JWKSを取得
	jwks, err := jwk.Fetch(context.TODO(), jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	return &CognitoService{
		region:         cfg.Cognito.Region,
		userPoolID:     cfg.Cognito.UserPoolID,
		clientID:       cfg.Cognito.ClientID,
		clientSecret:   cfg.Cognito.ClientSecret,
		jwksURL:        jwksURL,
		jwks:           jwks,
		client:         client,
		userRepository: userRepository,
	}, nil
}

// computeSecretHash SECRET_HASHを計算
// SECRET_HASH = Base64(HMAC-SHA256(username + clientId, clientSecret))
func (c *CognitoService) computeSecretHash(username string) string {
	if c.clientSecret == "" {
		return ""
	}

	mac := hmac.New(sha256.New, []byte(c.clientSecret))
	mac.Write([]byte(username + c.clientID))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// ValidateToken トークンを検証
func (c *CognitoService) ValidateToken(ctx context.Context, token string) (*user.AuthResult, error) {
	// JWTトークンを解析
	parsedToken, err := jwt.ParseString(token, jwt.WithKeySet(c.jwks))
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// トークンの有効性を確認
	if err := jwt.Validate(parsedToken); err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// cognitoUserIDを取得（標準クレーム: sub）
	cognitoUserID := parsedToken.Subject()
	if cognitoUserID == "" {
		return nil, fmt.Errorf("invalid token: missing sub claim")
	}

	// データベースからユーザー情報を取得
	userObj, err := c.userRepository.GetByCognitoUserID(ctx, cognitoUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user from database: %w", err)
	}

	// トークンの有効期限を取得（標準クレーム）
	expiresIn := int64(0)
	if exp := parsedToken.Expiration(); !exp.IsZero() {
		expiresIn = exp.Unix() - time.Now().Unix()
	}

	return &user.AuthResult{
		User:         userObj,
		AccessToken:  token,
		RefreshToken: "", // リフレッシュトークンは別途管理
		ExpiresIn:    expiresIn,
	}, nil
}

// SignUp ユーザー登録
func (c *CognitoService) SignUp(ctx context.Context, email, password, displayName string) (*user.AuthResult, error) {
	input := &cognitoidentityprovider.SignUpInput{
		ClientId: aws.String(c.clientID),
		Username: aws.String(email),
		Password: aws.String(password),
		UserAttributes: []types.AttributeType{
			{
				Name:  aws.String("email"),
				Value: aws.String(email),
			},
			{
				Name:  aws.String("name"),
				Value: aws.String(displayName),
			},
		},
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	if c.clientSecret != "" {
		input.SecretHash = aws.String(c.computeSecretHash(email))
	}

	result, err := c.client.SignUp(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to sign up: %w", err)
	}

	// ユーザーエンティティを作成
	// 新しいUUIDを生成
	userID, err := user.NewUserID(uuid.New().String())
	if err != nil {
		return nil, fmt.Errorf("failed to generate user ID: %w", err)
	}
	userEmail, err := user.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	userObj, err := user.NewUser(userID, *result.UserSub, userEmail, displayName)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user.AuthResult{
		User:         userObj,
		AccessToken:  "", // 確認が必要な場合は空
		RefreshToken: "",
		ExpiresIn:    0,
	}, nil
}

// SignIn ユーザーログイン
func (c *CognitoService) SignIn(ctx context.Context, email, password string) (*user.AuthResult, error) {
	authParams := map[string]string{
		"USERNAME": email, // メールアドレスをusernameとして使用
		"PASSWORD": password,
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	if c.clientSecret != "" {
		authParams["SECRET_HASH"] = c.computeSecretHash(email)
	}

	input := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow:       types.AuthFlowTypeUserPasswordAuth,
		ClientId:       aws.String(c.clientID),
		AuthParameters: authParams,
	}

	result, err := c.client.InitiateAuth(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to sign in: %w", err)
	}

	authResult := result.AuthenticationResult
	if authResult == nil {
		return nil, fmt.Errorf("authentication result is nil")
	}

	// SignInでは、AuthResultにUserを含めずにトークンのみを返す
	// 実際のユーザー情報はUsecaseレイヤーでDBから取得する
	return &user.AuthResult{
		User:         nil, // Usecaseレイヤーで設定
		AccessToken:  *authResult.AccessToken,
		RefreshToken: *authResult.RefreshToken,
		ExpiresIn:    int64(authResult.ExpiresIn),
	}, nil
}

// ConfirmSignUp ユーザー登録確認
func (c *CognitoService) ConfirmSignUp(ctx context.Context, email, confirmationCode string) error {
	input := &cognitoidentityprovider.ConfirmSignUpInput{
		ClientId:         aws.String(c.clientID),
		Username:         aws.String(email), // メールアドレスをusernameとして使用
		ConfirmationCode: aws.String(confirmationCode),
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	if c.clientSecret != "" {
		input.SecretHash = aws.String(c.computeSecretHash(email))
	}

	_, err := c.client.ConfirmSignUp(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to confirm sign up: %w", err)
	}

	return nil
}

// ForgotPassword パスワードリセット要求
func (c *CognitoService) ForgotPassword(ctx context.Context, email string) error {
	input := &cognitoidentityprovider.ForgotPasswordInput{
		ClientId: aws.String(c.clientID),
		Username: aws.String(email), // メールアドレスをusernameとして使用
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	if c.clientSecret != "" {
		input.SecretHash = aws.String(c.computeSecretHash(email))
	}

	_, err := c.client.ForgotPassword(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to initiate forgot password: %w", err)
	}

	return nil
}

// ConfirmForgotPassword パスワードリセット確認
func (c *CognitoService) ConfirmForgotPassword(ctx context.Context, email, confirmationCode, newPassword string) error {
	input := &cognitoidentityprovider.ConfirmForgotPasswordInput{
		ClientId:         aws.String(c.clientID),
		Username:         aws.String(email), // メールアドレスをusernameとして使用
		ConfirmationCode: aws.String(confirmationCode),
		Password:         aws.String(newPassword),
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	if c.clientSecret != "" {
		input.SecretHash = aws.String(c.computeSecretHash(email))
	}

	_, err := c.client.ConfirmForgotPassword(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to confirm forgot password: %w", err)
	}

	return nil
}

// RefreshToken リフレッシュトークンで新しいアクセストークンを取得
func (c *CognitoService) RefreshToken(ctx context.Context, refreshToken string) (*user.AuthResult, error) {
	// リフレッシュトークンから username を取得する必要がある
	// しかし、Cognitoのリフレッシュフローでは USERNAME は不要
	input := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeRefreshTokenAuth,
		ClientId: aws.String(c.clientID),
		AuthParameters: map[string]string{
			"REFRESH_TOKEN": refreshToken,
		},
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	// REFRESH_TOKEN_AUTH の場合、USERNAMEなしでSECRET_HASHを計算することはできない
	// そのため、REFRESH_TOKEN_AUTH では SECRET_HASH は不要

	result, err := c.client.InitiateAuth(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	authResult := result.AuthenticationResult
	if authResult == nil {
		return nil, fmt.Errorf("authentication result is nil")
	}

	// リフレッシュトークンは返されない場合があるので、元のトークンを保持
	newRefreshToken := refreshToken
	if authResult.RefreshToken != nil {
		newRefreshToken = *authResult.RefreshToken
	}

	return &user.AuthResult{
		User:         nil, // Usecaseレイヤーで設定
		AccessToken:  *authResult.AccessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(authResult.ExpiresIn),
	}, nil
}

// SignOut ログアウト（グローバルサインアウト）
func (c *CognitoService) SignOut(ctx context.Context, accessToken string) error {
	input := &cognitoidentityprovider.GlobalSignOutInput{
		AccessToken: aws.String(accessToken),
	}

	_, err := c.client.GlobalSignOut(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to sign out: %w", err)
	}

	return nil
}

// getUserInfo ユーザー情報を取得
func (c *CognitoService) getUserInfo(ctx context.Context, accessToken string) (*user.UserInfo, error) {
	input := &cognitoidentityprovider.GetUserInput{
		AccessToken: aws.String(accessToken),
	}

	result, err := c.client.GetUser(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	userInfo := &user.UserInfo{
		CognitoUserID: *result.Username,
	}

	// 属性から情報を取得
	for _, attr := range result.UserAttributes {
		switch *attr.Name {
		case "email":
			userInfo.Email = *attr.Value
		case "name":
			userInfo.DisplayName = *attr.Value
		case "cognito:user_status":
			userInfo.Status = *attr.Value
		}
	}

	return userInfo, nil
}

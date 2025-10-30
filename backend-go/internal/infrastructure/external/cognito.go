package external

import (
	"backend-go/internal/domain/user"
	"backend-go/internal/infrastructure/config"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
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
	jwksFetched    bool
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

	fmt.Printf("[COGNITO INIT] Region: %s, UserPoolID: %s, ClientID: %s\n", cfg.Cognito.Region, cfg.Cognito.UserPoolID, cfg.Cognito.ClientID)
	fmt.Printf("[COGNITO INIT] JWKS URL: %s\n", jwksURL)
	fmt.Printf("[COGNITO INIT] JWKS fetch will be deferred until first token validation\n")

	return &CognitoService{
		region:         cfg.Cognito.Region,
		userPoolID:     cfg.Cognito.UserPoolID,
		clientID:       cfg.Cognito.ClientID,
		clientSecret:   cfg.Cognito.ClientSecret,
		jwksURL:        jwksURL,
		jwks:           nil,
		jwksFetched:    false,
		client:         client,
		userRepository: userRepository,
	}, nil
}

// ensureJWKS JWKSを遅延取得
func (c *CognitoService) ensureJWKS(ctx context.Context) error {
	if c.jwksFetched {
		return nil
	}

	fmt.Printf("[COGNITO] Fetching JWKS from: %s\n", c.jwksURL)
	jwks, err := jwk.Fetch(ctx, c.jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	c.jwks = jwks
	c.jwksFetched = true
	fmt.Printf("[COGNITO] JWKS fetched successfully\n")
	return nil
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
	var err error

	// JWKSを遅延取得
	if err = c.ensureJWKS(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure JWKS: %w", err)
	}

	// JWTトークンを解析
	parsedToken, err := jwt.ParseString(token, jwt.WithKeySet(c.jwks))
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// トークンの有効性を確認
	if err = jwt.Validate(parsedToken); err != nil {
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
	var err error

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
		// Cognitoの特定エラーを検出して適切なエラーメッセージを返す
		var usernameExistsErr *types.UsernameExistsException
		var invalidPasswordErr *types.InvalidPasswordException
		var invalidParameterErr *types.InvalidParameterException

		if errors.As(err, &usernameExistsErr) {
			return nil, fmt.Errorf("このメールアドレスは既に登録されています")
		}
		if errors.As(err, &invalidPasswordErr) {
			return nil, fmt.Errorf("パスワードは8文字以上で、大文字、小文字、数字、記号を含む必要があります")
		}
		if errors.As(err, &invalidParameterErr) {
			return nil, fmt.Errorf("入力された情報に問題があります")
		}
		return nil, fmt.Errorf("アカウント作成に失敗しました")
	}

	// ユーザーエンティティを作成
	// 新しいUUIDを生成
	var userID user.UserID
	var userEmail user.Email
	var userObj *user.User

	userID, err = user.NewUserID(uuid.New().String())
	if err != nil {
		return nil, fmt.Errorf("failed to generate user ID: %w", err)
	}
	userEmail, err = user.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	userObj, err = user.NewUser(userID, *result.UserSub, userEmail, displayName)
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
		// Cognitoの特定エラーを検出して適切なエラーメッセージを返す
		var awsErr *types.UserNotConfirmedException
		var notAuthErr *types.NotAuthorizedException
		var userNotFoundErr *types.UserNotFoundException

		if errors.As(err, &awsErr) {
			return nil, fmt.Errorf("メールアドレスが未確認です。確認コードを入力してください")
		}
		if errors.As(err, &userNotFoundErr) {
			return nil, fmt.Errorf("このメールアドレスは登録されていません")
		}
		if errors.As(err, &notAuthErr) {
			return nil, fmt.Errorf("メールアドレスまたはパスワードが正しくありません")
		}
		return nil, fmt.Errorf("ログインに失敗しました")
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
		var codeMismatchErr *types.CodeMismatchException
		var expiredCodeErr *types.ExpiredCodeException
		var notFoundErr *types.UserNotFoundException

		if errors.As(err, &codeMismatchErr) {
			return fmt.Errorf("確認コードが間違っています")
		}
		if errors.As(err, &expiredCodeErr) {
			return fmt.Errorf("確認コードの有効期限が切れています")
		}
		if errors.As(err, &notFoundErr) {
			return fmt.Errorf("ユーザーが見つかりません")
		}
		return fmt.Errorf("アカウント確認に失敗しました")
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
		var notFoundErr *types.UserNotFoundException
		var limitExceededErr *types.LimitExceededException

		if errors.As(err, &notFoundErr) {
			return fmt.Errorf("このメールアドレスは登録されていません")
		}
		if errors.As(err, &limitExceededErr) {
			return fmt.Errorf("リセット要求の回数が上限に達しました。しばらく時間をおいてから再試行してください")
		}
		return fmt.Errorf("パスワードリセットの開始に失敗しました")
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
		var codeMismatchErr *types.CodeMismatchException
		var expiredCodeErr *types.ExpiredCodeException
		var notFoundErr *types.UserNotFoundException
		var invalidPasswordErr *types.InvalidPasswordException

		if errors.As(err, &codeMismatchErr) {
			return fmt.Errorf("確認コードが間違っています")
		}
		if errors.As(err, &expiredCodeErr) {
			return fmt.Errorf("確認コードの有効期限が切れています")
		}
		if errors.As(err, &notFoundErr) {
			return fmt.Errorf("ユーザーが見つかりません")
		}
		if errors.As(err, &invalidPasswordErr) {
			return fmt.Errorf("パスワードは8文字以上で、大文字、小文字、数字、記号を含む必要があります")
		}
		return fmt.Errorf("パスワードリセットに失敗しました")
	}

	return nil
}

// ResendConfirmationCode 確認コード再送信
func (c *CognitoService) ResendConfirmationCode(ctx context.Context, email string) error {
	input := &cognitoidentityprovider.ResendConfirmationCodeInput{
		ClientId: aws.String(c.clientID),
		Username: aws.String(email),
	}

	// Client Secretが設定されている場合、SECRET_HASHを追加
	if c.clientSecret != "" {
		input.SecretHash = aws.String(c.computeSecretHash(email))
	}

	_, err := c.client.ResendConfirmationCode(ctx, input)
	if err != nil {
		var notFoundErr *types.UserNotFoundException
		var limitExceededErr *types.LimitExceededException
		var invalidParameterErr *types.InvalidParameterException

		if errors.As(err, &notFoundErr) {
			return fmt.Errorf("このメールアドレスは登録されていません")
		}
		if errors.As(err, &limitExceededErr) {
			return fmt.Errorf("再送信の回数が上限に達しました。しばらく時間をおいてから再試行してください")
		}
		if errors.As(err, &invalidParameterErr) {
			return fmt.Errorf("メールアドレスが正しくありません")
		}
		return fmt.Errorf("確認コードの再送信に失敗しました")
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

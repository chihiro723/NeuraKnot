package external

import (
	"fmt"

	"github.com/stripe/stripe-go/v81"
	billingportalsession "github.com/stripe/stripe-go/v81/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/invoice"
	"github.com/stripe/stripe-go/v81/invoiceitem"
	"github.com/stripe/stripe-go/v81/subscription"
)

// StripeClient Stripe APIクライアント
type StripeClient struct {
	apiKey string
}

// NewStripeClient Stripeクライアントを作成
func NewStripeClient(apiKey string) *StripeClient {
	stripe.Key = apiKey
	return &StripeClient{
		apiKey: apiKey,
	}
}

// CreateCustomer 新規顧客を作成
func (c *StripeClient) CreateCustomer(email, name string, metadata map[string]string) (*stripe.Customer, error) {
	params := &stripe.CustomerParams{
		Email: stripe.String(email),
		Name:  stripe.String(name),
	}

	if metadata != nil {
		for k, v := range metadata {
			params.AddMetadata(k, v)
		}
	}

	cust, err := customer.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create customer: %w", err)
	}

	return cust, nil
}

// GetCustomer 顧客情報を取得
func (c *StripeClient) GetCustomer(customerID string) (*stripe.Customer, error) {
	cust, err := customer.Get(customerID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	return cust, nil
}

// UpdateCustomer 顧客情報を更新
func (c *StripeClient) UpdateCustomer(customerID string, params *stripe.CustomerParams) (*stripe.Customer, error) {
	cust, err := customer.Update(customerID, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update customer: %w", err)
	}

	return cust, nil
}

// CreateCheckoutSession Checkout Sessionを作成
func (c *StripeClient) CreateCheckoutSession(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	sess, err := checkoutsession.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create checkout session: %w", err)
	}

	return sess, nil
}

// CreateSubscription サブスクリプションを作成
func (c *StripeClient) CreateSubscription(params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
	sub, err := subscription.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return sub, nil
}

// GetSubscription サブスクリプションを取得
func (c *StripeClient) GetSubscription(subscriptionID string) (*stripe.Subscription, error) {
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get subscription: %w", err)
	}

	return sub, nil
}

// UpdateSubscription サブスクリプションを更新
func (c *StripeClient) UpdateSubscription(subscriptionID string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
	sub, err := subscription.Update(subscriptionID, params)
	if err != nil {
		return nil, fmt.Errorf("failed to update subscription: %w", err)
	}

	return sub, nil
}

// CancelSubscription サブスクリプションをキャンセル
func (c *StripeClient) CancelSubscription(subscriptionID string, cancelAtPeriodEnd bool) (*stripe.Subscription, error) {
	params := &stripe.SubscriptionParams{}

	if cancelAtPeriodEnd {
		params.CancelAtPeriodEnd = stripe.Bool(true)
		sub, err := subscription.Update(subscriptionID, params)
		if err != nil {
			return nil, fmt.Errorf("failed to schedule cancellation: %w", err)
		}
		return sub, nil
	}

	// 即座にキャンセル
	sub, err := subscription.Cancel(subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel subscription: %w", err)
	}

	return sub, nil
}

// CreateInvoiceItem 請求項目を追加
func (c *StripeClient) CreateInvoiceItem(customerID string, amount int64, currency, description string) (*stripe.InvoiceItem, error) {
	params := &stripe.InvoiceItemParams{
		Customer:    stripe.String(customerID),
		Amount:      stripe.Int64(amount),
		Currency:    stripe.String(currency),
		Description: stripe.String(description),
	}

	item, err := invoiceitem.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create invoice item: %w", err)
	}

	return item, nil
}

// CreateInvoice 請求書を作成
func (c *StripeClient) CreateInvoice(customerID string) (*stripe.Invoice, error) {
	params := &stripe.InvoiceParams{
		Customer: stripe.String(customerID),
	}

	inv, err := invoice.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create invoice: %w", err)
	}

	return inv, nil
}

// FinalizeInvoice 請求書を確定
func (c *StripeClient) FinalizeInvoice(invoiceID string) (*stripe.Invoice, error) {
	inv, err := invoice.FinalizeInvoice(invoiceID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to finalize invoice: %w", err)
	}

	return inv, nil
}

// CreateBillingPortalSession Customer Portalセッションを作成
func (c *StripeClient) CreateBillingPortalSession(customerID, returnURL string) (*stripe.BillingPortalSession, error) {
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	}

	sess, err := billingportalsession.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create billing portal session: %w", err)
	}

	return sess, nil
}

// ListSubscriptions 顧客のサブスクリプション一覧を取得
func (c *StripeClient) ListSubscriptions(customerID string) ([]*stripe.Subscription, error) {
	params := &stripe.SubscriptionListParams{}
	params.Filters.AddFilter("customer", "", customerID)

	iter := subscription.List(params)
	var subs []*stripe.Subscription

	for iter.Next() {
		subs = append(subs, iter.Subscription())
	}

	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("failed to list subscriptions: %w", err)
	}

	return subs, nil
}

"use server";

import { cookies } from "next/headers";

const BACKEND_GO_URL = process.env.BACKEND_GO_URL || "http://localhost:8080";

/**
 * プラン情報を取得（認証不要）
 */
export async function getTiers() {
  try {
    const response = await fetch(`${BACKEND_GO_URL}/api/v1/billing/tiers`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch tiers: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching tiers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * トークン使用量を取得（認証必要）
 */
export async function getUsage() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "No access token",
      };
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/billing/usage`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch usage: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log("[getUsage] Response data:", data);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching usage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Stripe Checkout Sessionを作成（認証必要）
 */
export async function createCheckoutSession(
  tier: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "No access token",
      };
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/billing/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tier,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to create checkout session: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Stripe Billing Portal Sessionを作成（認証必要）
 */
export async function createBillingPortalSession(returnUrl: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "No access token",
      };
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/billing/portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        return_url: returnUrl,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to create billing portal session: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * サブスクリプションプランを変更（認証必要）
 */
export async function changeSubscriptionPlan(tier: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "No access token",
      };
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/billing/subscription/change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tier,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to change subscription plan: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error changing subscription plan:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * サブスクリプションを解約（認証必要）
 */
export async function cancelSubscription() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return {
        success: false,
        error: "No access token",
      };
    }

    const response = await fetch(`${BACKEND_GO_URL}/api/v1/billing/subscription/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to cancel subscription: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

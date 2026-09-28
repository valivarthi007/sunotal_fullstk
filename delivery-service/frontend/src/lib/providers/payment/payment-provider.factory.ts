import { IPaymentProvider } from "./payment-provider.interface";
import { MockPaymentProvider } from "./mock-payment.provider";
import { RazorpayPaymentProvider } from "./razorpay-payment.provider";

let currentProvider: IPaymentProvider | null = null;

/**
 * Payment Provider Factory (Dependency Inversion / Factory Pattern)
 * Resolves the configured payment provider dynamically based on environment config.
 * To switch to live Razorpay or Stripe in production, set VITE_PAYMENT_PROVIDER=razorpay / stripe
 * or provide VITE_RAZORPAY_KEY_ID.
 */
export function getPaymentProvider(): IPaymentProvider {
  if (currentProvider) return currentProvider;

  const providerType = (import.meta.env.VITE_PAYMENT_PROVIDER || "").toLowerCase();
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  if (providerType === "razorpay" || (razorpayKey && razorpayKey !== "" && providerType !== "mock")) {
    currentProvider = new RazorpayPaymentProvider(razorpayKey);
  } else {
    currentProvider = new MockPaymentProvider();
  }

  return currentProvider;
}

export function setPaymentProvider(provider: IPaymentProvider): void {
  currentProvider = provider;
}

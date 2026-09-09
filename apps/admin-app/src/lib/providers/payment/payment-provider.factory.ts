import { IPaymentProvider } from "./payment-provider.interface";
import { MockPaymentProvider } from "./mock-payment.provider";

let currentProvider: IPaymentProvider | null = null;

/**
 * Payment Provider Factory (Dependency Inversion / Factory Pattern)
 * Resolves the configured payment provider dynamically based on environment config.
 * To switch to live Razorpay or Stripe in production, set VITE_PAYMENT_PROVIDER=razorpay / stripe
 * and register the provider implementation here.
 */
export function getPaymentProvider(): IPaymentProvider {
  if (currentProvider) return currentProvider;

  const providerType = import.meta.env.VITE_PAYMENT_PROVIDER || "mock";

  switch (providerType.toLowerCase()) {
    case "mock":
    default:
      currentProvider = new MockPaymentProvider();
      break;
  }

  return currentProvider;
}

export function setPaymentProvider(provider: IPaymentProvider): void {
  currentProvider = provider;
}

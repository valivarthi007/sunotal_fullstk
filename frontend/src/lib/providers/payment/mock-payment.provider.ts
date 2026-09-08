import { IPaymentProvider, PaymentRequest, PaymentResponse, PaymentMethodType } from "./payment-provider.interface";
import { verifyPayment as verifyPaymentApi } from "../../api-client";

/**
 * MockPaymentProvider - Default Zero-Cost Strategy Implementation for POC Testing
 * Supports instant UPI QR code simulation, simulated 3D-Secure Card OTP, NetBanking, and COD.
 */
export class MockPaymentProvider implements IPaymentProvider {
  readonly id = "mock";
  readonly name = "Interactive Mock Payment Gateway";

  async initialize(): Promise<boolean> {
    return true;
  }

  getSupportedMethods(): PaymentMethodType[] {
    return ["upi_qr", "upi_vpa", "card", "netbanking", "cod"];
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Fast processing for smooth UX
    await new Promise((resolve) => setTimeout(resolve, 50));

    const timestamp = new Date().toISOString();
    const mockPaymentId = `PAY-MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transactionRef = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Try verifying on backend if API client is available
    try {
      await verifyPaymentApi({
        razorpay_order_id: `ORD-${request.orderId}`,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: "mock_verified_signature_poc",
        orderId: request.orderId,
      });
    } catch (err) {
      console.warn("Backend payment verification API ping failed, continuing with mock response:", err);
    }

    return {
      success: true,
      paymentId: mockPaymentId,
      transactionRef,
      method: request.method,
      amount: request.amount,
      timestamp,
    };
  }

  async verifyPayment(paymentId: string, orderId: number): Promise<boolean> {
    if (!paymentId) return false;
    try {
      await verifyPaymentApi({
        razorpay_order_id: `ORD-${orderId}`,
        razorpay_payment_id: paymentId,
        razorpay_signature: "mock_verified_signature_poc",
        orderId,
      });
      return true;
    } catch {
      return true; // Fallback success for POC
    }
  }
}

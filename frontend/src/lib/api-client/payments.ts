import { customFetch } from "./custom-fetch";

export interface VerifyPaymentPayload {
  orderId: number;
  paymentMethod: "card" | "upi" | "netbanking" | "po";
  paymentId?: string;
  otp?: string;
  amount: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  paymentId: string;
  status: string;
  timestamp: string;
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
  return customFetch<VerifyPaymentResponse>("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

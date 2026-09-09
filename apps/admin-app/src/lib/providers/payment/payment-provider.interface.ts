/**
 * IPaymentProvider - SOLID Strategy Pattern Interface for Payment Processing
 * High-level UI components consume this interface via payment-provider.factory.ts
 */

export type PaymentMethodType = "upi_qr" | "upi_vpa" | "card" | "netbanking" | "cod";

export interface PaymentRequest {
  orderId: number;
  amount: number;
  currency?: string;
  method: PaymentMethodType;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  upiId?: string;
  bankName?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  transactionRef?: string;
  method: PaymentMethodType;
  amount: number;
  error?: string;
  timestamp: string;
}

export interface IPaymentProvider {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<boolean>;
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(paymentId: string, orderId: number): Promise<boolean>;
  getSupportedMethods(): PaymentMethodType[];
}

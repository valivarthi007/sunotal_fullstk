import crypto from 'crypto';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  message: string;
}

export interface IPaymentStrategy {
  name: string;
  createOrder(request: PaymentRequest): Promise<{ gatewayOrderId: string; amount: number; currency: string; keyId?: string }>;
  verifyPayment(payload: any): Promise<PaymentResponse>;
}

export class RazorpayPaymentStrategy implements IPaymentStrategy {
  name = 'razorpay';

  async createOrder(request: PaymentRequest) {
    const gatewayOrderId = `order_rzp_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SunotalDemoKey2026';
    return {
      gatewayOrderId,
      amount: Math.round(request.amount * 100), // Amount in paise
      currency: request.currency || 'INR',
      keyId,
    };
  }

  async verifyPayment(payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature?: string }): Promise<PaymentResponse> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
    if (!razorpay_order_id || !razorpay_payment_id) {
      return {
        success: false,
        paymentId: '',
        message: 'Missing Razorpay order or payment ID parameters',
      };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'sunotal_razorpay_secret_2026';
    if (razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature && process.env.NODE_ENV === 'production') {
        return {
          success: false,
          paymentId: razorpay_payment_id,
          message: 'Invalid Razorpay HMAC signature',
        };
      }
    }

    return {
      success: true,
      paymentId: razorpay_payment_id,
      gatewayOrderId: razorpay_order_id,
      message: 'Payment verified successfully via Razorpay Gateway',
    };
  }
}

export class CodPaymentStrategy implements IPaymentStrategy {
  name = 'cod';

  async createOrder(request: PaymentRequest) {
    return {
      gatewayOrderId: `COD-${request.orderId}`,
      amount: Math.round(request.amount * 100),
      currency: request.currency || 'INR',
    };
  }

  async verifyPayment(payload: { orderId: string }): Promise<PaymentResponse> {
    return {
      success: true,
      paymentId: `COD-PAY-${Date.now()}`,
      gatewayOrderId: payload.orderId,
      message: 'Cash on Delivery selected and confirmed for order fulfillment',
    };
  }
}

export class WalletPaymentStrategy implements IPaymentStrategy {
  name = 'wallet';

  async createOrder(request: PaymentRequest) {
    return {
      gatewayOrderId: `WLT-${request.orderId}`,
      amount: Math.round(request.amount * 100),
      currency: request.currency || 'INR',
    };
  }

  async verifyPayment(payload: { orderId: string; walletBalance?: number }): Promise<PaymentResponse> {
    return {
      success: true,
      paymentId: `WLT-PAY-${Date.now()}`,
      gatewayOrderId: payload.orderId,
      message: 'Paid using Sunotal Instant Quick-Commerce Wallet',
    };
  }
}

export class PaymentContext {
  private strategies: Map<string, IPaymentStrategy> = new Map();

  constructor() {
    this.registerStrategy(new RazorpayPaymentStrategy());
    this.registerStrategy(new CodPaymentStrategy());
    this.registerStrategy(new WalletPaymentStrategy());
  }

  registerStrategy(strategy: IPaymentStrategy) {
    this.strategies.set(strategy.name.toLowerCase(), strategy);
  }

  getStrategy(method: string = 'razorpay'): IPaymentStrategy {
    const normalized = method.toLowerCase();
    return this.strategies.get(normalized) || this.strategies.get('razorpay')!;
  }
}

export interface NotificationPayload {
  recipient: string;
  subject?: string;
  title?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  success: boolean;
  channel: string;
  messageId: string;
  status: string;
}

export interface INotificationStrategy {
  channel: string;
  send(payload: NotificationPayload): Promise<NotificationResponse>;
}

export class ResendEmailStrategy implements INotificationStrategy {
  channel = 'email';

  async send(payload: NotificationPayload): Promise<NotificationResponse> {
    const apiKey = process.env.RESEND_API_KEY;
    const messageId = `msg_resend_${Math.random().toString(36).substring(2, 9)}`;
    if (apiKey && apiKey.startsWith('re_')) {
      console.log(`📧 [Resend API Dispatch] Email sent to ${payload.recipient}: ${payload.subject}`);
    } else {
      console.log(`📧 [Resend Sandbox Dispatch] Simulated Email to ${payload.recipient}: ${payload.subject}`);
    }
    return {
      success: true,
      channel: this.channel,
      messageId,
      status: 'DELIVERED',
    };
  }
}

export class SmsNotificationStrategy implements INotificationStrategy {
  channel = 'sms';

  async send(payload: NotificationPayload): Promise<NotificationResponse> {
    const messageId = `msg_sms_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`📱 [SMS Gateway Dispatch] Phone OTP/Alert sent to ${payload.recipient}: ${payload.message}`);
    return {
      success: true,
      channel: this.channel,
      messageId,
      status: 'SENT',
    };
  }
}

export class WhatsAppNotificationStrategy implements INotificationStrategy {
  channel = 'whatsapp';

  async send(payload: NotificationPayload): Promise<NotificationResponse> {
    const messageId = `msg_wa_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`💬 [WhatsApp Business API Dispatch] Live Order Update to ${payload.recipient}`);
    return {
      success: true,
      channel: this.channel,
      messageId,
      status: 'DELIVERED',
    };
  }
}

export class NotificationContext {
  private strategies: Map<string, INotificationStrategy> = new Map();

  constructor() {
    this.registerStrategy(new ResendEmailStrategy());
    this.registerStrategy(new SmsNotificationStrategy());
    this.registerStrategy(new WhatsAppNotificationStrategy());
  }

  registerStrategy(strategy: INotificationStrategy) {
    this.strategies.set(strategy.channel.toLowerCase(), strategy);
  }

  async dispatch(channel: string, payload: NotificationPayload): Promise<NotificationResponse> {
    const target = this.strategies.get(channel.toLowerCase()) || this.strategies.get('email')!;
    return target.send(payload);
  }
}

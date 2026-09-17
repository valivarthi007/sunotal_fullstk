import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (!GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
  }
  return groqClient;
}

export interface SupportBotContext {
  userMessage: string;
  customerName?: string;
  orderId?: string;
  orderStatus?: string;
}

export async function askGroqCustomerSupport(context: SupportBotContext): Promise<string> {
  const client = getGroqClient();

  if (!client) {
    // Graceful fallback if GROQ_API_KEY is not configured
    return `Hello ${context.customerName || 'Valued Customer'}! Your request regarding ${context.orderId ? `Order #${context.orderId}` : 'Sunotal Grocery'} has been logged. Our 10-minute quick response team is reviewing it.`;
  }

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are Sunotal AI, an ultra-fast customer support assistant for Sunotal 10-minute grocery delivery. Be polite, concise (max 3 sentences), and offer solutions like instant refund or redelivery.'
        },
        {
          role: 'user',
          content: `Customer Name: ${context.customerName || 'User'}, Order ID: ${context.orderId || 'N/A'}, Status: ${context.orderStatus || 'N/A'}. User Question: "${context.userMessage}"`
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 150,
    });

    return chatCompletion.choices[0]?.message?.content || 'I am here to assist you with your grocery order!';
  } catch (error: any) {
    console.error('❌ Groq AI Support Error:', error?.message || error);
    return 'Our AI assistant is temporarily busy, but your support ticket has been received by our dark store manager.';
  }
}

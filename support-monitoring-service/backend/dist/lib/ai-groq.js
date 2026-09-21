export async function askGroqCustomerSupport(params) {
    const apiKey = process.env.GROQ_API_KEY;
    const { userMessage, customerName = 'valued customer', orderId, orderStatus } = params;
    if (apiKey && apiKey.startsWith('gsk_')) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        {
                            role: 'system',
                            content: `You are Sunotal AI, the ultra-fast 10-minute quick-commerce grocery delivery assistant. Be polite, concise, extremely helpful, and empathetic. Customer Name: ${customerName}. Order ID: ${orderId || 'N/A'}. Order Status: ${orderStatus || 'N/A'}.`,
                        },
                        {
                            role: 'user',
                            content: userMessage,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 300,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;
                if (text)
                    return text.trim();
            }
        }
        catch (e) {
            console.warn('⚠️ [Groq AI Support] API request error, falling back to smart rule engine:', e.message);
        }
    }
    // Smart Context-Aware Fallback Assistant Rule Engine
    const msg = userMessage.toLowerCase();
    if (msg.includes('order') || msg.includes('where') || msg.includes('status') || msg.includes('track')) {
        if (orderId) {
            return `Hi ${customerName}! Your order ${orderId} is currently ${orderStatus || 'being picked at our dark store'} and is on track for sub-10 minute delivery! You can view live GPS rider movements in your tracking map.`;
        }
        return `Hi ${customerName}! You can check your live order picking status and rider telemetry anytime under the Active Orders tab on your home screen.`;
    }
    if (msg.includes('refund') || msg.includes('money') || msg.includes('cancel')) {
        return `Hi ${customerName}, for order cancellations or instant refunds, our automated system credits your wallet or original payment method within 15 minutes of item return validation.`;
    }
    if (msg.includes('damaged') || msg.includes('missing') || msg.includes('quality')) {
        return `We deeply apologize! If an item is missing or damaged, please tap "Request Instant Replacement" in your order details, and our nearest dark store hub will dispatch a replacement rider immediately.`;
    }
    return `Hello ${customerName}! Thank you for reaching out to Sunotal 10-Minute Grocery Support. How can I assist you with your items, delivery ETA, or payments today?`;
}

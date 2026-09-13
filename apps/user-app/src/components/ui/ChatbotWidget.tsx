import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, ShoppingCart, Clock, ShieldCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/lib/cart-context';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    productName?: string;
    price?: number;
  };
}

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { addItem } = useCart();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: "👋 Hi! I'm SunoBot, your AI Grocery & Support Assistant. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputMessage.trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      let botText = "I'm here to assist! You can check your active orders, browse 10-minute fresh delivery products, or request recipe recommendations.";
      let suggestedAction: ChatMessage['suggestedAction'] | undefined = undefined;

      const lower = query.toLowerCase();

      if (lower.includes('track') || lower.includes('order') || lower.includes('status')) {
        botText = "📦 Order #1002 is OUT FOR DELIVERY! Rider Vikram is 1.2 km away and estimated to arrive in 3 minutes (10-minute guarantee active).";
      } else if (lower.includes('recipe') || lower.includes('cook') || lower.includes('paneer') || lower.includes('spinach')) {
        botText = "🥗 Great choice! For Palak Paneer, I recommend fresh organic spinach, fresh cottage cheese, garlic, and heavy cream.";
        suggestedAction = {
          label: "Add Fresh Paneer (200g - ₹90) to Cart",
          productName: "Fresh Organic Paneer 200g",
          price: 90
        };
      } else if (lower.includes('refund') || lower.includes('missing') || lower.includes('damage')) {
        botText = "🛡️ We apologize if an item was missing or damaged. Refunds are instantly credited to your Sunotal Wallet within 2 minutes of claim submit.";
      } else if (lower.includes('store') || lower.includes('delivery') || lower.includes('area') || lower.includes('fast')) {
        botText = "⚡ Your location is within 1.8km of Dark Store #DS-HYD-04. All orders placed now qualify for 10-minute express delivery!";
      }

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 900);
  };

  const handleAddSuggested = (action: NonNullable<ChatMessage['suggestedAction']>) => {
    if (action.productName && action.price) {
      addItem({
        id: `bot-p-${Date.now()}`,
        name: action.productName,
        price: action.price,
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop&q=80',
        weight: '200g',
        category: 'Dairy'
      });
      const botConfirm: ChatMessage = {
        id: String(Date.now()),
        sender: 'bot',
        text: `✅ Added ${action.productName} to your cart!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botConfirm]);
    }
  };

  const quickChips = [
    "📦 Track Order #1002",
    "🥗 Recipe Ideas",
    "⚡ 10-Min Delivery Area",
    "🛡️ Refund Policy"
  ];

  return (
    <div id="sunobot-widget" className="fixed bottom-6 right-6 z-40">
      {/* Trigger Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-white/20 group"
          title="Open SunoBot AI Assistant"
        >
          <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400"></span>
          </span>
        </button>
      )}

      {/* Chat Window Box */}
      {isOpen && (
        <div className="flex flex-col w-[360px] sm:w-[400px] h-[520px] bg-card border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-700 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-800 rounded-xl">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  SunoBot AI <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                </h4>
                <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-emerald-200 hover:text-white rounded-full hover:bg-emerald-600/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-muted/20 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl space-y-1.5 shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-card text-foreground border rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  
                  {msg.suggestedAction && (
                    <button
                      onClick={() => handleAddSuggested(msg.suggestedAction!)}
                      className="mt-1 flex items-center gap-1.5 w-full text-left px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg font-semibold border border-emerald-500/30 transition-colors text-[11px]"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{msg.suggestedAction.label}</span>
                    </button>
                  )}

                  <span className={`block text-[9px] ${msg.sender === 'user' ? 'text-emerald-100' : 'text-muted-foreground'} text-right`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-muted-foreground text-[11px] font-medium p-1">
                <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>SunoBot is typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2 bg-muted/40 border-t flex gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-2.5 py-1 bg-card hover:bg-emerald-500/10 text-foreground border rounded-full font-medium transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-card border-t flex items-center gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask SunoBot anything..."
              className="text-xs h-9 rounded-xl border-muted focus-visible:ring-emerald-500"
            />
            <Button
              size="sm"
              onClick={() => handleSendMessage()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 w-9 p-0 rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

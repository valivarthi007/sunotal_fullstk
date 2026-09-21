import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface AiSupportChatModalProps {
  onClose: () => void;
  orderId?: string;
}

export const AiSupportChatModal: React.FC<AiSupportChatModalProps> = ({ onClose, orderId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! I am Sunotal AI, your 10-minute grocery assistant powered by Groq Llama-3.1 LLM. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickChips = [
    'Where is my 10-minute order?',
    'I have a missing/damaged item',
    'How does instant refund work?',
    'Change delivery address',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/support/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: query,
          customerName: 'Valued Customer',
          orderId,
          orderStatus: 'In-Transit (Dark Store Hub #01)',
        }),
      });

      const data = await res.json();
      const botText = data.botResponse || 'Our support team is reviewing your request. Your order is safe!';

      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: 'Your order is currently being fulfilled by our nearest dark store hub and will arrive under 10 minutes!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              Groq AI Grocery Support
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                ONLINE
              </span>
            </h4>
            <p className="text-xs text-slate-400">Sub-Second Smart Order Assistance</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'
              }`}
            >
              <p>{msg.text}</p>
              <span
                className={`block text-[9px] mt-1 text-right ${
                  msg.sender === 'user' ? 'text-slate-900/70 font-bold' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400 animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 bg-slate-900/90 border-t border-slate-800/60 flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 border border-slate-700/70 text-slate-300 text-[11px] px-3 py-1 rounded-full transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask AI about your groceries or delivery..."
          className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !input.trim()}
          className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

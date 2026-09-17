import React, { useState } from "react";
import { Bot, Send, X, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
  sender: "user" | "ai";
  text: string;
  time: string;
}

export function AiSupportChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "👋 Hi! I am Sunotal AI Assistant (powered by Groq Cloud). How can I help with your 10-minute grocery order?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: Message = {
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: userText }),
      });

      const data = await res.json();
      const botText = data.botResponse || "Thank you! Our support team is reviewing your grocery request.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      toast.error("Failed to reach AI Assistant");
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Our AI assistant is temporarily busy, but your request has been logged.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="p-4 bg-emerald-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>Sunotal AI Support</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </h3>
            <p className="text-[10px] text-emerald-100">Powered by Groq Cloud Llama-3.1</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 h-72 overflow-y-auto bg-slate-950/90 text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-600 text-white rounded-br-xs"
                  : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-xs"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Sunotal AI is typing...</span>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask AI support..."
          className="h-9 text-xs bg-slate-800 border-slate-700 text-white rounded-xl placeholder:text-slate-500"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="icon"
          className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

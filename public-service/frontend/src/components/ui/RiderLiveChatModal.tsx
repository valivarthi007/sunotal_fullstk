import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Phone,
  ShieldCheck,
  Check,
  CheckCheck,
  Bike,
  Sparkles,
  User,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";

export interface ChatMessage {
  id: number;
  orderId: string;
  senderRole: "user" | "rider" | "system";
  senderId: string;
  senderName: string;
  message: string;
  messageType?: "text" | "quick_reply" | "location";
  isRead: boolean;
  createdAt: string;
}

interface RiderLiveChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | number;
  orderNumber?: string;
  riderName?: string;
  riderPhone?: string;
  riderVehicle?: string;
  currentUserRole?: "user" | "rider";
  currentUserName?: string;
  currentUserId?: string;
}

export function RiderLiveChatModal({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  riderName = "Assigned Express Rider",
  riderPhone = "",
  riderVehicle = "Electric Delivery EV",
  currentUserRole = "user",
  currentUserName = "Customer",
  currentUserId = "1",
}: RiderLiveChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const cleanOrderId = String(orderId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!cleanOrderId) return;
    try {
      const res = await fetch(`/api/chat/messages/${cleanOrderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch {
      // fallback local storage
      const stored = localStorage.getItem(`sunotal_chat_${cleanOrderId}`);
      if (stored) {
        try { setMessages(JSON.parse(stored)); } catch {}
      }
    }
  };

  // Initial load & 3-second live polling
  useEffect(() => {
    if (open && cleanOrderId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [open, cleanOrderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputMessage).trim();
    if (!content) return;

    if (!textToSend) setInputMessage("");

    const payload = {
      orderId: cleanOrderId,
      senderRole: currentUserRole,
      senderId: currentUserId,
      senderName: currentUserName,
      message: content,
      messageType: "text",
    };

    // Optimistic UI update
    const tempMsg: ChatMessage = {
      id: Date.now(),
      orderId: cleanOrderId,
      senderRole: currentUserRole,
      senderId: currentUserId,
      senderName: currentUserName,
      message: content,
      messageType: "text",
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempMsg.id ? data.message : m))
          );
        }
      }
    } catch {
      // Cache locally
      const stored = localStorage.getItem(`sunotal_chat_${cleanOrderId}`);
      let existing: ChatMessage[] = [];
      if (stored) {
        try { existing = JSON.parse(stored); } catch {}
      }
      const updated = [...existing, tempMsg];
      localStorage.setItem(`sunotal_chat_${cleanOrderId}`, JSON.stringify(updated));
    }
  };

  const quickReplies = currentUserRole === "user" ? [
    "🚪 Call me when near gate",
    "🏢 Please leave with security",
    "🔔 Ring bell twice",
    "🤫 Don't ring bell (Baby sleeping)",
    "📍 Delivering to flat 402",
  ] : [
    "🛵 I am 2 minutes away!",
    "🚪 Arrived at your main gate",
    "📍 Please confirm flat number",
    "✅ Handed over your package!",
  ];

  const targetName = currentUserRole === "user" ? riderName : "Customer";
  const targetSub = currentUserRole === "user" ? `Delivery Partner (${riderVehicle})` : "Active Order Customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-border/80 shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
        {/* WhatsApp Style Top Bar Header */}
        <div className="bg-emerald-800 text-white p-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold border-2 border-emerald-500 shadow-sm text-sm">
                {targetName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-emerald-800 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm leading-none">{targetName}</h3>
                <Badge variant="secondary" className="bg-emerald-950/60 text-emerald-300 text-[9px] px-1.5 py-0 border-none font-normal">
                  WhatsApp Live
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-200/90 mt-0.5 font-medium flex items-center gap-1">
                <Bike className="w-3 h-3" /> {targetSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`tel:${riderPhone}`}
              className="p-2 rounded-full hover:bg-emerald-700/60 text-white transition-colors"
              title="Call Rider Directly"
            >
              <Phone className="w-4 h-4" />
            </a>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-emerald-700/60 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Background Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] dark:bg-slate-950/90 relative">
          {/* Order Info Badge */}
          <div className="text-center my-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Order #{orderNumber || cleanOrderId.slice(-6)} • Encrypted Direct Live Chat
            </span>
          </div>

          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                💬
              </div>
              <p className="text-xs font-semibold">Start live chat with {targetName}</p>
              <p className="text-[10px] text-slate-400">Tap quick suggestions below or type your message.</p>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.senderRole === currentUserRole;
            const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[82%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs shadow-sm relative ${
                    isMe
                      ? "bg-[#dcf8c6] dark:bg-emerald-950 text-slate-900 dark:text-emerald-100 rounded-tr-none border border-emerald-200 dark:border-emerald-800"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                      {msg.senderName} ({msg.senderRole === "rider" ? "🛵 Rider" : "Customer"})
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    <span>{timeStr}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Preset Quick Reply Chips */}
        <div className="bg-slate-100 dark:bg-slate-900 px-3 py-2 border-t border-border/50 overflow-x-auto no-scrollbar flex gap-1.5 shrink-0">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950 transition-colors whitespace-nowrap shadow-xs"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Message Input Footer Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-border flex items-center gap-2 shrink-0">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={`Message ${targetName}...`}
            className="rounded-2xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus-visible:ring-emerald-500"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim()}
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 p-0 shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

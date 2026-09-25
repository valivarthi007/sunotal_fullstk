import React, { useState, useEffect } from "react";
import { Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface RaiseGrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole: "user" | "vendor" | "delivery";
  defaultCategory?: string;
  orderId?: string;
  userProfile?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess?: (ticket: any) => void;
}

export function RaiseGrievanceModal({
  isOpen,
  onClose,
  defaultRole,
  defaultCategory = "product",
  orderId = "",
  userProfile,
  onSuccess,
}: RaiseGrievanceModalProps) {
  const [role, setRole] = useState<"user" | "vendor" | "delivery">(defaultRole);
  const [senderName, setSenderName] = useState(userProfile?.name || "");
  const [senderEmail, setSenderEmail] = useState(userProfile?.email || "");
  const [senderPhone, setSenderPhone] = useState(userProfile?.phone || "");
  const [category, setCategory] = useState(defaultCategory);
  const [ticketOrderId, setTicketOrderId] = useState(orderId);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRole(defaultRole);
    if (userProfile?.name) setSenderName(userProfile.name);
    if (userProfile?.email) setSenderEmail(userProfile.email);
    if (userProfile?.phone) setSenderPhone(userProfile.phone);
    if (orderId) setTicketOrderId(orderId);
  }, [defaultRole, userProfile, orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !subject.trim() || !description.trim()) {
      toast.error("Please fill in your name, email, subject, and grievance description");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        role,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim().toLowerCase(),
        senderPhone: senderPhone.trim(),
        category,
        orderId: ticketOrderId.trim(),
        subject: subject.trim(),
        description: description.trim(),
      };

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const ticket = await res.json();
        toast.success(`Grievance Incident #${ticket.ticketId || ticket.id} registered! Support team notified.`);
        if (onSuccess) onSuccess(ticket);
        setSubject("");
        setDescription("");
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit grievance");
      }
    } catch {
      toast.error("Network error while registering grievance ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-white">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" /> Raise Grievance / Report Operational Incident
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Stakeholder Role Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Reported By Stakeholder Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`py-2 px-3 rounded-xl font-bold transition-all border ${
                  role === "user"
                    ? "bg-blue-600 text-white border-blue-500 shadow-md"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                🛒 Customer / User
              </button>
              <button
                type="button"
                onClick={() => setRole("vendor")}
                className={`py-2 px-3 rounded-xl font-bold transition-all border ${
                  role === "vendor"
                    ? "bg-amber-600 text-white border-amber-500 shadow-md"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                🌾 Farmer / Vendor
              </button>
              <button
                type="button"
                onClick={() => setRole("delivery")}
                className={`py-2 px-3 rounded-xl font-bold transition-all border ${
                  role === "delivery"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                🛵 Delivery Partner
              </button>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Your Full Name *</label>
              <Input
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Email Address *</label>
              <Input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Grievance Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 text-xs font-bold"
              >
                <option value="product">📦 Product Quality / Damage</option>
                <option value="payment">💰 Payment / Payout / Refund Delay</option>
                <option value="packaging">🧊 Cold-Chain / Packaging Issue</option>
                <option value="delivery">🛵 Delivery / Route / Safety Incident</option>
                <option value="other">⚠️ Other Operational Grievance</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Related Order / Batch ID (Optional)</label>
              <Input
                value={ticketOrderId}
                onChange={(e) => setTicketOrderId(e.target.value)}
                placeholder="e.g. ORD-9201 or VND-492"
                className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Grievance Subject *</label>
            <Input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Spoiled Dairy Freshness / Payout amount discrepancy"
              className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Detailed Description of Incident *</label>
            <Textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear details regarding the incident, batch condition, or payment calculation error..."
              className="bg-slate-950 border-slate-800 text-white rounded-2xl text-xs min-h-[90px]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs gap-1.5 shadow-lg shadow-rose-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Registering Grievance..." : "Submit Grievance to Support Portal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { LifeBuoy, PhoneCall, Mail, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface GrievanceRedressalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrderId?: string;
}

export const GrievanceRedressalModal: React.FC<GrievanceRedressalModalProps> = ({
  isOpen,
  onClose,
  defaultOrderId = "ORD-2026-8801",
}) => {
  const [orderId, setOrderId] = useState(defaultOrderId);
  const [category, setCategory] = useState("Damaged / Quality Issue");
  const [description, setDescription] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe your query or grievance issue.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const ticketId = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const ticket = {
        ticketId,
        orderId,
        category,
        description,
        status: "In Review",
        sla: "Resolution promised within 2 Hours",
        createdAt: new Date().toLocaleTimeString(),
      };

      // Store ticket in localStorage
      const existing = JSON.parse(localStorage.getItem("sunotal_user_grievances") || "[]");
      localStorage.setItem("sunotal_user_grievances", JSON.stringify([ticket, ...existing]));

      setSubmittedTicket(ticket);
      setSubmitting(false);
      toast.success(`Support Ticket ${ticketId} created!`);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-secondary">
            <LifeBuoy className="w-6 h-6 text-emerald-600" /> Customer Support & Grievance Redressal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Compliant with Indian Consumer Protection (E-Commerce) Rules & IT Regulations.
          </DialogDescription>
        </DialogHeader>

        {submittedTicket ? (
          <div className="space-y-4 py-4 animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-200">Grievance Ticket Registered</h3>
              <p className="font-mono text-xs font-bold text-emerald-600">Ticket Ref: {submittedTicket.ticketId}</p>
              <p className="text-xs text-muted-foreground">{submittedTicket.sla}</p>
            </div>

            <div className="bg-muted/40 p-4 rounded-xl text-xs space-y-2 font-mono border">
              <div className="flex justify-between"><span className="text-muted-foreground">Order Ref:</span><strong>{submittedTicket.orderId}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category:</span><strong>{submittedTicket.category}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><strong className="text-emerald-600 font-bold">{submittedTicket.status}</strong></div>
            </div>

            <Button onClick={() => setSubmittedTicket(null)} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Submit Another Query
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Quick Contact Hotline Bar */}
            <div className="grid grid-cols-2 gap-3">
              <a href="tel:09090007108" className="p-3 bg-card border rounded-xl flex items-center gap-2 hover:border-emerald-600 transition-colors">
                <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left text-xs">
                  <span className="text-[10px] text-muted-foreground block font-semibold">24x7 Helpline</span>
                  <strong className="text-foreground">090900 07108</strong>
                </div>
              </a>
              <a href="mailto:support@sunotal.com" className="p-3 bg-card border rounded-xl flex items-center gap-2 hover:border-emerald-600 transition-colors">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-left text-xs">
                  <span className="text-[10px] text-muted-foreground block font-semibold">Email Desk</span>
                  <strong className="text-foreground">support@sunotal.com</strong>
                </div>
              </a>
            </div>

            {/* Grievance Ticket Form */}
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <div>
                <Label className="text-xs">Order Reference Number</Label>
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-2026-8801"
                  className="h-10 text-xs font-mono mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Issue Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 mt-1 rounded-xl border border-input bg-background px-3 text-xs"
                >
                  <option>Damaged / Quality Issue</option>
                  <option>Missing Items in Package</option>
                  <option>Delivery Delay Inquiry</option>
                  <option>Billing & Payment Query</option>
                  <option>General Support / Feedback</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Description of Grievance <span className="text-destructive">*</span></Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your produce quality or order grievance..."
                  className="mt-1 text-xs rounded-xl"
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20">
                {submitting ? "Submitting..." : "Submit Grievance Ticket"}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

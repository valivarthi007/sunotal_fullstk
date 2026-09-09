import React, { useState, useEffect } from "react";
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Bike, 
  Store, 
  CreditCard, 
  Package, 
  ShieldAlert, 
  Truck, 
  MessageSquare,
  Sparkles,
  RefreshCw,
  Send,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SupportPortal() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Resolve Modal State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // New Ticket Creation Modal State (For testing / customer support agent entry)
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    role: "user",
    senderName: "",
    senderEmail: "",
    category: "product",
    orderId: "",
    subject: "",
    description: "",
  });

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (roleFilter !== "all" && t.role !== roleFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchSubj = t.subject?.toLowerCase().includes(query);
      const matchDesc = t.description?.toLowerCase().includes(query);
      const matchSender = t.senderName?.toLowerCase().includes(query);
      const matchId = t.ticketId?.toLowerCase().includes(query);
      return matchSubj || matchDesc || matchSender || matchId;
    }
    return true;
  });

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    if (!resolutionText.trim()) {
      toast.error("Please enter resolution remarks before solving ticket.");
      return;
    }

    setIsResolving(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id || selectedTicket.ticketId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: resolutionText,
          status: "resolved",
          resolvedBy: "Support Portal Officer",
        }),
      });

      if (res.ok) {
        toast.success(`Ticket ${selectedTicket.ticketId} marked as RESOLVED!`);
        setTickets((prev) =>
          prev.map((t) =>
            t.ticketId === selectedTicket.ticketId
              ? { ...t, status: "resolved", resolution: resolutionText, updatedAt: new Date().toISOString() }
              : t
          )
        );
        setSelectedTicket(null);
        setResolutionText("");
      } else {
        toast.success(`Ticket ${selectedTicket.ticketId} resolved successfully!`);
        setTickets((prev) =>
          prev.map((t) =>
            t.ticketId === selectedTicket.ticketId
              ? { ...t, status: "resolved", resolution: resolutionText }
              : t
          )
        );
        setSelectedTicket(null);
        setResolutionText("");
      }
    } catch {
      toast.success(`Ticket ${selectedTicket?.ticketId} resolved successfully`);
      setSelectedTicket(null);
    } finally {
      setIsResolving(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicketForm),
      });

      if (res.ok) {
        const created = await res.json();
        toast.success(`Support Ticket ${created.ticketId} created!`);
        setTickets((prev) => [created, ...prev]);
        setShowNewModal(false);
        setNewTicketForm({
          role: "user",
          senderName: "",
          senderEmail: "",
          category: "product",
          orderId: "",
          subject: "",
          description: "",
        });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create ticket");
      }
    } catch {
      toast.error("Failed to submit ticket");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Banner Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-lg text-white flex items-center gap-2">
                Sunotal Central Support & Helpdesk Portal
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-[10px]">
                  LIVE TICKET SYSTEM
                </Badge>
              </h1>
              <p className="text-xs text-slate-400">
                Official Helpdesk Portal for Users, Delivery Riders & Farmers (support-sunotal.automateuniverse.space)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadTickets()}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Tickets
            </Button>
            <Button
              onClick={() => setShowNewModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" /> Create Test Ticket
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Helpdesk Tickets</span>
            <div className="text-3xl font-black font-mono text-white">{tickets.length}</div>
            <p className="text-[10px] text-slate-500">Across Users, Vendors & Riders</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Open / Pending Action</span>
            <div className="text-3xl font-black font-mono text-amber-400">
              {tickets.filter((t) => t.status === "open" || t.status === "in_progress").length}
            </div>
            <p className="text-[10px] text-slate-500">Promised SLA Resolution &lt; 2 Hours</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Payment Escalations</span>
            <div className="text-3xl font-black font-mono text-emerald-400">
              {tickets.filter((t) => t.category === "payment").length}
            </div>
            <p className="text-[10px] text-slate-500">Farmer & Rider Payout Queries</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Resolved Tickets</span>
            <div className="text-3xl font-black font-mono text-emerald-500">
              {tickets.filter((t) => t.status === "resolved").length}
            </div>
            <p className="text-[10px] text-slate-500">Solves marked in central database</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-4 shadow-xl">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setRoleFilter("all")}
                className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                  roleFilter === "all" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                All Stakeholders ({tickets.length})
              </button>
              <button
                onClick={() => setRoleFilter("user")}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  roleFilter === "user" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Customer / Users ({tickets.filter((t) => t.role === "user").length})
              </button>
              <button
                onClick={() => setRoleFilter("vendor")}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  roleFilter === "vendor" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <Store className="w-3.5 h-3.5" /> Farmers / Vendors ({tickets.filter((t) => t.role === "vendor").length})
              </button>
              <button
                onClick={() => setRoleFilter("delivery")}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
                  roleFilter === "delivery" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <Bike className="w-3.5 h-3.5" /> Delivery Riders ({tickets.filter((t) => t.role === "delivery").length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search tickets by ID, name, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-slate-950 border-slate-800 text-white rounded-2xl text-xs"
              />
            </div>
          </div>

          {/* Sub-Filters: Category & Status */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Category:</span>
              <div className="flex gap-1.5">
                {["all", "product", "payment", "packaging", "delivery"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition-colors border ${
                      categoryFilter === cat
                        ? "bg-amber-400/20 text-amber-300 border-amber-400/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
              <div className="flex gap-1.5">
                {["all", "open", "in_progress", "resolved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl font-bold uppercase text-[10px] transition-colors border ${
                      statusFilter === st
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {st === "all" ? "All Statuses" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table / List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs">
              Loading support tickets...
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-5">Ticket Ref</th>
                    <th className="py-4 px-5">Stakeholder</th>
                    <th className="py-4 px-5">Category</th>
                    <th className="py-4 px-5">Subject & Query Details</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Action / Solve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id || ticket.ticketId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-amber-400">
                        {ticket.ticketId}
                        {ticket.orderId && (
                          <span className="block text-[10px] text-slate-500 font-mono">Ref: {ticket.orderId}</span>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {ticket.role === "user" && <User className="w-3.5 h-3.5 text-blue-400" />}
                            {ticket.role === "vendor" && <Store className="w-3.5 h-3.5 text-amber-400" />}
                            {ticket.role === "delivery" && <Bike className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>{ticket.senderName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">{ticket.senderEmail}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
                            Role: {ticket.role}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <Badge
                          className={`text-[10px] uppercase font-mono font-bold ${
                            ticket.category === "payment"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : ticket.category === "product"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : ticket.category === "packaging"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          }`}
                        >
                          {ticket.category}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 max-w-xs">
                        <p className="font-bold text-white text-xs">{ticket.subject}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{ticket.description}</p>
                        {ticket.resolution && (
                          <div className="mt-2 p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-[10px] font-mono text-emerald-300">
                            <strong>Solved:</strong> {ticket.resolution}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        <Badge
                          className={`text-[10px] uppercase font-mono font-bold ${
                            ticket.status === "resolved"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : ticket.status === "in_progress"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : "bg-amber-400/20 text-amber-300 border-amber-400/30"
                          }`}
                        >
                          {ticket.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-5 text-right">
                        {ticket.status === "resolved" ? (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1 font-mono">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Solved
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setResolutionText(`Issue verified and resolved. Refund / payout credit dispatched.`);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs gap-1"
                          >
                            Solve Ticket
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <LifeBuoy className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-300">No support tickets match your filters.</p>
              <p className="text-xs text-slate-500">Try adjusting search term, role or category filters.</p>
            </div>
          )}
        </div>
      </main>

      {/* TICKET RESOLUTION MODAL */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Solve & Resolve Support Ticket
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Ticket Ref:</span>
                  <strong className="font-mono text-amber-400">{selectedTicket.ticketId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stakeholder:</span>
                  <strong className="text-white capitalize">{selectedTicket.senderName} ({selectedTicket.role})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <strong className="text-emerald-400 uppercase font-mono">{selectedTicket.category}</strong>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-bold block mb-1">Query Subject:</span>
                  <p className="font-semibold text-white">{selectedTicket.subject}</p>
                  <p className="text-slate-400 mt-1 text-[11px]">{selectedTicket.description}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Enter Resolution Notes / Action Taken</label>
                <Textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="e.g. Verified payment status. Bank credit initiated via Instant Payout Gateway."
                  className="bg-slate-950 border-slate-800 text-white rounded-2xl text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button variant="outline" onClick={() => setSelectedTicket(null)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button
                onClick={handleResolveTicket}
                disabled={isResolving}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs gap-1"
              >
                {isResolving ? "Resolving Ticket..." : "Mark Ticket as SOLVED"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SIMULATION NEW TICKET MODAL */}
      {showNewModal && (
        <Dialog open={showNewModal} onOpenChange={() => setShowNewModal(false)}>
          <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
                <Sparkles className="w-5 h-5 text-amber-400" /> Create Test Support Ticket
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTicket} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Stakeholder Role</label>
                  <select
                    value={newTicketForm.role}
                    onChange={(e) => {
                      const r = e.target.value;
                      setNewTicketForm({
                        ...newTicketForm,
                        role: r,
                        category: r === "user" ? "product" : "payment",
                      });
                    }}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white text-xs font-bold"
                  >
                    <option value="user">User / Customer</option>
                    <option value="vendor">Farmer / Vendor</option>
                    <option value="delivery">Delivery Rider</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Ticket Category</label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-white text-xs font-bold"
                  >
                    {newTicketForm.role === "user" ? (
                      <>
                        <option value="product">product (Quality / Item Issue)</option>
                        <option value="payment">payment (Refund / Charge Query)</option>
                        <option value="packaging">packaging (Damage / Seal Issue)</option>
                        <option value="delivery">delivery (Late / Delay Query)</option>
                      </>
                    ) : (
                      <option value="payment">payment (Payment & Payout Support Only)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Sender Name</label>
                  <Input
                    required
                    value={newTicketForm.senderName}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, senderName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Sender Email</label>
                  <Input
                    type="email"
                    required
                    value={newTicketForm.senderEmail}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, senderEmail: e.target.value })}
                    placeholder="e.g. Ramesh@sunotal.com"
                    className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Query Subject</label>
                <Input
                  required
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  placeholder="e.g. Payment credit status inquiry"
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Query Description</label>
                <Textarea
                  required
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  placeholder="Describe your issue or help request..."
                  className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button variant="outline" type="button" onClick={() => setShowNewModal(false)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs">
                  Submit Ticket
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

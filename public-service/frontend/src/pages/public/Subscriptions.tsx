import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchUserSubscriptions,
  toggleSubscriptionStatus,
  cancelSubscription,
  SubscriptionApi,
} from "@/lib/api-client/subscriptions";
import {
  Calendar,
  Clock,
  Pause,
  Play,
  Trash2,
  Plus,
  Zap,
  CheckCircle2,
  CalendarDays,
  Sun,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "paused">("active");

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await fetchUserSubscriptions();
      setSubscriptions(data);
    } catch {
      toast.error("Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await toggleSubscriptionStatus(id, newStatus);
    toast.success(`Subscription ${newStatus === "paused" ? "paused" : "resumed"}!`);
    loadSubscriptions();
  };

  const handleCancel = async (id: number, productName: string) => {
    if (!confirm(`Are you sure you want to cancel subscription for ${productName}?`)) return;
    await cancelSubscription(id);
    toast.success(`Cancelled subscription for ${productName}`);
    loadSubscriptions();
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const pausedSubs = subscriptions.filter((s) => s.status === "paused");
  const displaySubs = activeTab === "active" ? activeSubs : pausedSubs;

  const totalDailyExpense = activeSubs.reduce((sum, s) => sum + (Number(s.price) * (s.quantity || 1)), 0);

  // Generate next 7 days preview
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      fullDate: d,
    };
  });

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="space-y-2 relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sun className="w-3.5 h-3.5" /> Sunotal Daily Morning Express
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Daily Recurring Subscriptions</h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Fresh farm milk, eggs, bread & daily produce delivered to your doorstep every morning between 6:00 AM - 8:00 AM. Zero delivery charges!
            </p>
          </div>

          <div className="flex items-center gap-4 relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Active Daily Budget</p>
              <p className="text-2xl font-black text-white">{fmt(totalDailyExpense)} <span className="text-xs font-normal opacity-80">/day</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-md">
              {activeSubs.length}
            </div>
          </div>
        </div>

        {/* Next 7 Days Delivery Preview Bar */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>Upcoming Delivery Schedule (Next 7 Days)</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Guaranteed 6-8 AM Delivery</span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-1 overflow-x-auto no-scrollbar">
            {next7Days.map((d, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-center border flex flex-col items-center justify-between transition-all ${
                  activeSubs.length > 0
                    ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                    : "bg-muted/40 border-border"
                }`}
              >
                <p className="text-[10px] uppercase font-bold text-muted-foreground">{d.dayName}</p>
                <p className="text-lg font-black text-foreground my-0.5">{d.dateNum}</p>
                <p className="text-[10px] text-emerald-600 font-bold">{activeSubs.length} Items</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Tabs & List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "active"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Active Subscriptions ({activeSubs.length})
              </button>
              <button
                onClick={() => setActiveTab("paused")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "paused"
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Paused ({pausedSubs.length})
              </button>
            </div>

            <Link href="/products?category=Dairy%2C%20Bread%20%26%20Eggs">
              <Button size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add New Subscription
              </Button>
            </Link>
          </div>

          {/* Subscriptions Grid / List */}
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading subscriptions...</div>
          ) : displaySubs.length === 0 ? (
            <div className="text-center py-12 px-4 bg-card border border-dashed border-border/80 rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto font-bold text-2xl">
                🥛
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  {activeTab === "active" ? "No Active Subscriptions" : "No Paused Subscriptions"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Subscribe to daily fresh milk, brown eggs, artisan bread, or organic produce and get them delivered every morning without ordering manually!
                </p>
              </div>
              <Link href="/products?category=Dairy%2C%20Bread%20%26%20Eggs">
                <Button className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  Browse Daily Essentials <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displaySubs.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg ${
                            sub.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60"
                              : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60"
                          }`}
                        >
                          {sub.status === "active" ? "● Active Daily Delivery" : "⏸ Paused"}
                        </Badge>
                        <h4 className="font-extrabold text-base text-foreground mt-1.5 line-clamp-1">{sub.productName}</h4>
                      </div>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        {fmt(Number(sub.price) * (sub.quantity || 1))} <span className="text-[10px] text-muted-foreground font-normal">/day</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-accent/30 p-3 rounded-2xl border border-border/40">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Frequency</span>
                        <span className="font-bold text-foreground capitalize flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-emerald-600" /> {sub.frequency}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Delivery Slot</span>
                        <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-emerald-600" /> {sub.deliverySlot || "6:00 AM - 7:30 AM"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(sub.id, sub.status)}
                      className={`rounded-xl font-bold text-xs gap-1.5 flex-1 ${
                        sub.status === "active"
                          ? "border-amber-400/50 text-amber-700 hover:bg-amber-50"
                          : "border-emerald-500/50 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {sub.status === "active" ? <><Pause className="w-3.5 h-3.5" /> Pause Subscription</> : <><Play className="w-3.5 h-3.5" /> Resume Subscription</>}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(sub.id, sub.productName)}
                      className="rounded-xl text-destructive hover:bg-destructive/10 text-xs px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

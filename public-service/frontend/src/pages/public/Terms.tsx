import React, { useState } from "react";
import { PublicLayout } from "../../components/layout/PublicLayout";
import { Link } from "wouter";
import { 
  Scale, 
  ShoppingBag, 
  Truck, 
  RotateCcw, 
  ShieldAlert, 
  FileText, 
  HelpCircle, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  ChevronRight,
  ArrowUpRight,
  BadgeCheck,
  CreditCard
} from "lucide-react";

export function Terms() {
  const [activeSection, setActiveSection] = useState("terms-overview");

  const sections = [
    { id: "terms-overview", label: "1. Agreement & Eligibility" },
    { id: "hyperlocal", label: "2. 10-Min Quick Delivery" },
    { id: "pricing", label: "3. Pricing & Payments" },
    { id: "fssai", label: "4. FSSAI & Quality Guarantee" },
    { id: "cancellations", label: "5. Returns & Instant Refunds" },
    { id: "prohibited", label: "6. User Conduct & Anti-Fraud" },
    { id: "liability", label: "7. Liability & Indemnity" },
    { id: "jurisdiction", label: "8. Governing Law & Jurisdiction" }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background text-foreground">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
              <Scale className="w-4 h-4" /> Legal & Operations Framework
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Terms of Service & Delivery Standards
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
              Official service conditions governing Sunotal quick-commerce grocery delivery, farm-fresh produce quality guarantees, doorstep returns, and customer rights.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
              <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Updated: October 1, 2026
              </span>
              <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> FSSAI Lic. No: 10124999000123
              </span>
            </div>
          </div>
        </section>

        {/* Content & Sidebar Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sticky Navigation Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border/60 rounded-2xl p-4 shadow-sm space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2 mb-1">
                  Terms Index
                </p>
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeSection === sec.id
                        ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    }`}
                  >
                    <span>{sec.label}</span>
                    {activeSection === sec.id && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}

                <div className="pt-4 mt-4 border-t border-border/60 space-y-2">
                  <Link href="/privacy" className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5">
                    Privacy Policy <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/support" className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                    Help & Support <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Main Terms Content */}
            <main className="lg:col-span-3 space-y-10 text-sm leading-relaxed text-foreground/90">

              {/* 1. Agreement & Eligibility */}
              <section id="terms-overview" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">1. User Agreement & Service Eligibility</h2>
                    <p className="text-xs text-muted-foreground">Contractual terms between user and Sunotal Farms</p>
                  </div>
                </div>
                <p>
                  Welcome to Sunotal Farms (<strong>"Sunotal", "Platform"</strong>), operated by <strong>Sunotal Farms Private Limited</strong>. By registering, browsing, placing an order, or utilizing our quick-commerce delivery application, you explicitly agree to be bound by these Terms of Service.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                  <li><strong>Age Eligibility:</strong> You must be at least 18 years of age or accessing under the supervision of a parent/legal guardian under Indian law.</li>
                  <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your mobile number OTP authentication and for all activities originating from your account.</li>
                </ul>
              </section>

              {/* 2. 10-Min Quick Delivery */}
              <section id="hyperlocal" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">2. Hyperlocal Express Delivery Standards</h2>
                    <p className="text-xs text-muted-foreground">10 to 30 minute delivery fulfillment</p>
                  </div>
                </div>
                <p>
                  Sunotal operates a network of micro-fulfillment hubs (dark stores) across Vijayawada, NTR District, and Andhra Pradesh to deliver farm-fresh vegetables, fruits, dairy, and daily essentials within promised slot windows (typically 10–25 minutes).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3.5 border rounded-2xl bg-accent/30 space-y-1">
                    <span className="font-bold text-foreground block">🛵 Delivery Partner Protocol</span>
                    Riders undergo safety training and identity verification. They deliver directly to your specified doorstep or gated security check post.
                  </div>
                  <div className="p-3.5 border rounded-2xl bg-accent/30 space-y-1">
                    <span className="font-bold text-foreground block">⛈️ Weather & Force Majeure</span>
                    Delivery timelines may be extended during heavy monsoon rainfall, road blockages, civic restrictions, or extreme weather events.
                  </div>
                </div>
              </section>

              {/* 3. Pricing & Payments */}
              <section id="pricing" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">3. Pricing, Taxes & Payment Gateway</h2>
                    <p className="text-xs text-muted-foreground">Transparent pricing in Indian Rupees (₹)</p>
                  </div>
                </div>
                <p>
                  All product prices listed on Sunotal are in <strong>Indian Rupees (₹)</strong> and include applicable Goods and Services Tax (GST).
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                  <li><strong>Daily Market Indexing:</strong> Prices of fresh vegetables and fruits are dynamically updated each morning in accordance with regional APMC farm-gate market rates.</li>
                  <li><strong>Accepted Payment Modes:</strong> UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, Credit/Debit Cards via Razorpay, Sunotal Wallet Balance, and Cash on Delivery (COD).</li>
                  <li><strong>Order Minimums & Handling Fees:</strong> Small delivery handling fees or surge fees may apply during peak rush hours or high-demand weather conditions, clearly disclosed prior to checkout.</li>
                </ul>
              </section>

              {/* 4. FSSAI & Quality Guarantee */}
              <section id="fssai" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">4. FSSAI Compliance & Farm Traceability</h2>
                    <p className="text-xs text-muted-foreground">Food Safety and Standards Authority of India Standards</p>
                  </div>
                </div>
                <p>
                  Sunotal Farms operates under valid <strong>FSSAI License No. 10124999000123</strong>. All fresh produce is sourced directly from audited organic/natural farms, washed using ozone purification, and stored in temperature-controlled cold chains.
                </p>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-600/30 text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Quality & Traceability Commitment:
                  </span>
                  If any produce delivered fails your freshness standard at the time of delivery, you are entitled to an immediate doorstep replacement or instant wallet refund.
                </div>
              </section>

              {/* 5. Returns & Refunds */}
              <section id="cancellations" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">5. Doorstep Returns, Cancellations & Refunds</h2>
                    <p className="text-xs text-muted-foreground">Customer protection & SLA policies</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 border rounded-2xl bg-accent/20">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-1">
                      🥦 Perishable Fresh Produce (Vegetables, Fruits, Dairy, Eggs)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Inspected at doorstep during delivery. If damaged or spoiled, return immediately to rider or upload a photo in our Support Portal within <strong>2 hours</strong> of delivery.
                    </p>
                  </div>

                  <div className="p-4 border rounded-2xl bg-accent/20">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-1">
                      📦 Non-Perishable Staples & Packaged Goods
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Eligible for return/replacement within <strong>24 hours</strong> of delivery if the outer seal is broken, damaged, or past the printed expiry date.
                    </p>
                  </div>

                  <div className="p-4 border rounded-2xl bg-accent/20">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-1">
                      ⚡ Refund Resolution Timeframes (SLA)
                    </h3>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                      <li><strong>Sunotal Wallet Credit:</strong> Instant (available within 60 seconds of approval).</li>
                      <li><strong>UPI / Bank Refund via Razorpay:</strong> Processed within 3 to 5 business days.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 6. User Conduct */}
              <section id="prohibited" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">6. Prohibited Activities & Fraud Policy</h2>
                    <p className="text-xs text-muted-foreground">Zero tolerance for platform abuse</p>
                  </div>
                </div>
                <p>Users must not engage in any of the following activities on Sunotal:</p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                  <li>Creating fake accounts or exploiting promotional discounts, referral codes, or introductory wallet offers.</li>
                  <li>Filing fraudulent non-delivery or damaged item claims.</li>
                  <li>Abusing, harassing, or physically threatening delivery riders or customer support representatives.</li>
                </ul>
                <p className="text-xs text-destructive font-semibold">
                  Violation of these rules will result in immediate account termination, forfeiture of wallet balance, and potential legal action under Indian Penal Code provisions.
                </p>
              </section>

              {/* 7. Liability */}
              <section id="liability" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">7. Limitation of Liability</h2>
                    <p className="text-xs text-muted-foreground">Scope of financial responsibility</p>
                  </div>
                </div>
                <p>
                  To the maximum extent permitted by Indian law, Sunotal Farms Private Limited's aggregate liability for any claim arising out of an order shall strictly not exceed the total price paid by the customer for that specific order.
                </p>
              </section>

              {/* 8. Governing Law */}
              <section id="jurisdiction" className="scroll-mt-28 bg-gradient-to-br from-slate-950 to-emerald-950 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">8. Governing Law & Jurisdiction</h2>
                    <p className="text-xs text-emerald-300">Republic of India Judicial Jurisdiction</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  These Terms of Service are governed by and construed in accordance with the laws of the Republic of India. Any disputes or legal proceedings shall be subject to the exclusive jurisdiction of the competent courts in <strong>Vijayawada / NTR District, Andhra Pradesh, India</strong>.
                </p>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 space-y-2 text-xs">
                  <p className="font-bold text-emerald-400">Sunotal Corporate Headquarters</p>
                  <p className="text-slate-300">Sunotal Farms Private Limited</p>
                  <p className="text-slate-400">76-16-53, Bhavani Puram, Vijayawada, NTR District, Andhra Pradesh - 520012</p>
                  <p className="text-slate-400">Corporate Email: support@sunotal.com | Helpline: +91 90900 07108</p>
                </div>
              </section>

            </main>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

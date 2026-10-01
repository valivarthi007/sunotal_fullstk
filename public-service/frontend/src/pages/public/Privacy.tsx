import React, { useState } from "react";
import { PublicLayout } from "../../components/layout/PublicLayout";
import { Link } from "wouter";
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  UserCheck, 
  Server, 
  FileText, 
  HelpCircle, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";

export function Privacy() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", label: "1. Overview & Framework" },
    { id: "collection", label: "2. Information We Collect" },
    { id: "location", label: "3. Hyperlocal GPS Location" },
    { id: "usage", label: "4. Purpose & Data Usage" },
    { id: "sharing", label: "5. Data Sharing & Disclosure" },
    { id: "security", label: "6. Security & Storage" },
    { id: "rights", label: "7. DPDP Act 2023 User Rights" },
    { id: "grievance", label: "8. Grievance Officer & Contact" }
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
        <section className="relative overflow-hidden border-b bg-emerald-950 text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
              <ShieldCheck className="w-4 h-4" /> Legal & Trust Center
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Privacy Policy & Data Governance
            </h1>
            <p className="text-emerald-100/80 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
              Compliant with the Digital Personal Data Protection Act (DPDP Act 2023), Information Technology Act 2000, and Indian E-Commerce Rules. Transparent, traceably secure farm-fresh delivery.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-200/90">
              <span className="px-3 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/50 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Effective Date: October 1, 2026
              </span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/50 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Sunotal Farms Private Limited
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
                  Policy Contents
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
                  <Link href="/terms" className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5">
                    Terms & Conditions <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/support" className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                    Support & Grievances <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Main Policy Content */}
            <main className="lg:col-span-3 space-y-10 text-sm leading-relaxed text-foreground/90">

              {/* 1. Overview */}
              <section id="overview" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">1. Overview & Governance Framework</h2>
                    <p className="text-xs text-muted-foreground">Sunotal Farms Privacy Assurance</p>
                  </div>
                </div>
                <p>
                  Sunotal Farms Private Limited (<strong>"Sunotal", "We", "Us", or "Our"</strong>) is committed to safeguarding your personal information when you access our quick-commerce web and mobile applications (<strong>"Platform"</strong>).
                </p>
                <p>
                  This Privacy Policy details how we collect, store, process, transfer, and protect your data in strict alignment with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the <strong>Information Technology Act, 2000</strong>, and the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong> of India.
                </p>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-600/30 text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Trust Statement:
                  </span>
                  We do not sell, rent, or trade your personal data or phone numbers to third-party telemarketers under any circumstances.
                </div>
              </section>

              {/* 2. Information We Collect */}
              <section id="collection" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
                    <p className="text-xs text-muted-foreground">Data points required for express order fulfillment</p>
                  </div>
                </div>

                <p>To enable 10–20 minute hyperlocal delivery of fresh produce and groceries, we collect the following categories of data:</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl border bg-accent/30 space-y-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" /> Account Identification
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Full name, mobile phone number (for OTP authentication), email address, and account preferences.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border bg-accent/30 space-y-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> Delivery Address Book
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      House/flat numbers, street locality, landmarks, city, state, pincode, and optional address labels (Home, Office).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border bg-accent/30 space-y-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Lock className="w-4 h-4" /> Payment Telemetry
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Payment mode, transaction IDs, and status via PCI-DSS Compliant gateways (Razorpay, UPI). We <strong>never</strong> store raw debit/credit card numbers or CVVs.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border bg-accent/30 space-y-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Server className="w-4 h-4" /> Technical & Device Logs
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      IP address, browser type, operating system version, crash reports, and session cookies for cart persistence.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Hyperlocal Location */}
              <section id="location" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">3. Real-Time GPS & Location Processing</h2>
                    <p className="text-xs text-muted-foreground">Quick-commerce geographic dispatching</p>
                  </div>
                </div>
                <p>
                  Sunotal relies on precise device GPS location and reverse-geocoding (powered by vector map engines) to identify nearby dark stores/hubs (e.g. Benz Circle, One Town, Autonagar in NTR District/Vijayawada).
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                  <li><strong>Foreground Location:</strong> Captured when you search delivery areas or pin exact doorstep markers on our interactive map.</li>
                  <li><strong>Delivery Tracking:</strong> Assigned delivery riders are provided exact latitude and longitude coordinates strictly during active order fulfillment.</li>
                  <li><strong>Permission Control:</strong> You can disable location access in your browser settings at any time; manual pincode/street entry remains fully available.</li>
                </ul>
              </section>

              {/* 4. Purpose & Data Usage */}
              <section id="usage" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">4. Purpose of Data Processing</h2>
                    <p className="text-xs text-muted-foreground">Lawful grounds under DPDP Act Section 6</p>
                  </div>
                </div>
                <p>We process your data strictly for legitimate operational purposes:</p>
                <div className="space-y-2">
                  {[
                    "Processing, packing, and dispatching farm-fresh produce within promised timeframes.",
                    "Live order tracking and automated WhatsApp / SMS delivery alerts.",
                    "Farm-to-door batch traceability and FSSAI quality audit compliance.",
                    "Processing refunds, wallet credits, and resolving customer support tickets.",
                    "Detecting, preventing, and prosecuting fraudulent transactions or promotional code abuse."
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. Data Sharing */}
              <section id="sharing" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">5. Data Sharing & Third-Party Disclosures</h2>
                    <p className="text-xs text-muted-foreground">Strict necessity-driven data distribution</p>
                  </div>
                </div>
                <p>
                  We share personal data only with verified ecosystem partners required to complete your order:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                  <li><strong>Delivery Partners (Riders):</strong> Granted temporary access to your name, phone number, and address strictly for active delivery execution.</li>
                  <li><strong>Payment Aggregators (Razorpay / Banks):</strong> Secured transmission of transaction amounts and payment signatures.</li>
                  <li><strong>Statutory Authorities:</strong> Disclosed only when mandated by official court orders, law enforcement warrants, or Indian tax/FSSAI compliance requests.</li>
                </ul>
              </section>

              {/* 6. Security */}
              <section id="security" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">6. Security & Data Retention</h2>
                    <p className="text-xs text-muted-foreground">Enterprise encryption standard</p>
                  </div>
                </div>
                <p>
                  We implement industry-grade technical and organizational safeguards including <strong>TLS 1.3 SSL Encryption</strong>, encrypted database backups, and strict RBAC (Role-Based Access Control) for administrative staff.
                </p>
                <p>
                  We retain your personal data only as long as necessary to maintain your account or comply with Indian financial accounting laws (minimum 7 years for invoice records).
                </p>
              </section>

              {/* 7. User Rights */}
              <section id="rights" className="scroll-mt-28 bg-card border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">7. Your Rights Under DPDP Act 2023</h2>
                    <p className="text-xs text-muted-foreground">Empowering customer data autonomy</p>
                  </div>
                </div>
                <p>As a Data Principal under Indian law, you possess the following rights:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 border rounded-xl bg-accent/20">
                    <span className="font-bold text-foreground block mb-1">Right to Access & Summary</span>
                    Seek a summary of personal data processed by Sunotal.
                  </div>
                  <div className="p-3 border rounded-xl bg-accent/20">
                    <span className="font-bold text-foreground block mb-1">Right to Correction & Erasure</span>
                    Update inaccurate details or request deletion of your account.
                  </div>
                  <div className="p-3 border rounded-xl bg-accent/20">
                    <span className="font-bold text-foreground block mb-1">Right of Grievance Redressal</span>
                    Register complaints with our designated Grievance Officer.
                  </div>
                  <div className="p-3 border rounded-xl bg-accent/20">
                    <span className="font-bold text-foreground block mb-1">Right to Nominate</span>
                    Nominate an individual to exercise rights in case of incapacity.
                  </div>
                </div>
              </section>

              {/* 8. Grievance Officer */}
              <section id="grievance" className="scroll-mt-28 bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-800/40 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">8. Grievance Officer & Statutory Contact</h2>
                    <p className="text-xs text-emerald-300">Consumer Protection (E-Commerce) Rules, 2020 Compliance</p>
                  </div>
                </div>

                <p className="text-xs text-emerald-100/90">
                  If you have questions, concerns, or grievances regarding data processing or this policy, please contact our designated Grievance Officer:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-900/40 border border-emerald-700/50 space-y-2">
                    <p className="font-bold text-emerald-400 text-sm">Grievance & Nodal Officer</p>
                    <p className="text-emerald-100 font-semibold">Sunotal Farms Private Limited</p>
                    <div className="flex items-start gap-2 text-emerald-200/80">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>76-16-53, Bhavani Puram, Vijayawada, NTR District, Andhra Pradesh - 520012, India</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-900/40 border border-emerald-700/50 space-y-2">
                    <p className="font-bold text-emerald-400 text-sm">Direct Contact Channels</p>
                    <div className="flex items-center gap-2 text-emerald-200">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <a href="mailto:grievance@sunotal.com" className="underline hover:text-emerald-300">grievance@sunotal.com</a>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-200">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <a href="tel:09090007108" className="hover:text-emerald-300">+91 90900 07108</a>
                    </div>
                    <p className="text-[11px] text-emerald-400/80 pt-1">
                      Response SLA: Acknowledged within 48 hours; resolved within 1 month.
                    </p>
                  </div>
                </div>
              </section>

            </main>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

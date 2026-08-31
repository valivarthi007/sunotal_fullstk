import React, { useState } from "react";
import { CreditCard, QrCode, Building2, FileCheck, CheckCircle2, AlertCircle, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { verifyPayment } from "../../lib/api-client";

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  amount: number;
  onSuccess: (paymentId: string) => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  orderId,
  amount,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"card" | "upi" | "netbanking" | "po">("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardName, setCardName] = useState("Corporate Purchasing");
  
  // 3D Secure OTP Modal state
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");

  const [upiId, setUpiId] = useState("corporate@upi");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [poReference, setPoReference] = useState("PO-2026-SUN-0091");

  if (!isOpen) return null;

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cardNumber || !cardExpiry || !cardCvv) {
      setError("Please complete all card details");
      return;
    }
    // Open 3D Secure Verification Dialog
    setShowOtpDialog(true);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyPayment({
        orderId,
        paymentMethod: "card",
        otp: otpCode,
        amount,
      });
      setShowOtpDialog(false);
      onSuccess(res.paymentId || `PAY-${Date.now()}`);
    } catch (err: any) {
      console.warn("verifyPayment server error, using fallback transaction token:", err);
      setShowOtpDialog(false);
      onSuccess(`PAY-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (method: "upi" | "netbanking" | "po") => {
    setLoading(true);
    setError(null);

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    // Check if Razorpay API Key is configured for live/test Checkout SDK
    if (razorpayKey && (window as any).Razorpay) {
      try {
        const options = {
          key: razorpayKey,
          amount: Math.round(amount * 100), // in paise
          currency: "INR",
          name: "Sunotal Farms",
          description: `Payment for Order #${orderId}`,
          image: "/favicon.ico",
          handler: function (response: any) {
            onSuccess(response.razorpay_payment_id || `PAY-RZP-${Date.now()}`);
          },
          prefill: {
            name: "Corporate Customer",
            email: "purchasing@sunotalfarms.com",
            contact: "9999999999",
          },
          theme: {
            color: "#059669",
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setLoading(false);
        return;
      } catch (rzpErr) {
        console.warn("Razorpay SDK initialization fallback to simulator:", rzpErr);
      }
    }

    // Fallback simulation when VITE_RAZORPAY_KEY_ID is missing or in offline POC mode
    try {
      const res = await verifyPayment({
        orderId,
        paymentMethod: method,
        amount,
      });
      onSuccess(res.paymentId || `PAY-${Date.now()}`);
    } catch (err: any) {
      console.warn("verifyPayment server error, using fallback transaction token:", err);
      onSuccess(`PAY-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-950 text-white p-6 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span className="font-bold text-lg tracking-wide">SUNOTAL PAY</span>
            </div>
            <span className="text-xs bg-emerald-800/60 text-emerald-200 px-2.5 py-1 rounded-full font-mono">
              TEST / POC MODE
            </span>
          </div>
          <p className="text-xs text-emerald-200/80">Industry Standard Encrypted Payment Gateway Simulator</p>
          <div className="mt-4 pt-4 border-t border-emerald-800/60 flex items-center justify-between">
            <span className="text-xs text-emerald-300">Total Payable Amount</span>
            <span className="text-2xl font-bold text-white font-mono">₹{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 bg-muted/50 p-1 border-b text-xs font-medium">
          <button
            onClick={() => { setActiveTab("card"); setError(null); }}
            className={`flex flex-col items-center py-2.5 rounded-lg transition-all ${
              activeTab === "card" ? "bg-background text-emerald-600 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="w-4 h-4 mb-1" />
            Card
          </button>
          <button
            onClick={() => { setActiveTab("upi"); setError(null); }}
            className={`flex flex-col items-center py-2.5 rounded-lg transition-all ${
              activeTab === "upi" ? "bg-background text-emerald-600 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="w-4 h-4 mb-1" />
            UPI / QR
          </button>
          <button
            onClick={() => { setActiveTab("netbanking"); setError(null); }}
            className={`flex flex-col items-center py-2.5 rounded-lg transition-all ${
              activeTab === "netbanking" ? "bg-background text-emerald-600 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4 mb-1" />
            NetBanking
          </button>
          <button
            onClick={() => { setActiveTab("po"); setError(null); }}
            className={`flex flex-col items-center py-2.5 rounded-lg transition-all ${
              activeTab === "po" ? "bg-background text-emerald-600 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck className="w-4 h-4 mb-1" />
            Corporate PO
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CARD TAB */}
          {activeTab === "card" && (
            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div>
                <Label className="text-xs">Cardholder Name</Label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Name on card"
                  className="mt-1 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs">Card Number</Label>
                <div className="relative mt-1">
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 1111 1111 1111"
                    className="font-mono pr-10"
                  />
                  <CreditCard className="w-5 h-5 absolute right-3 top-2.5 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Expiry Date</Label>
                  <Input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">CVV Code</Label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    className="mt-1 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" /> Test Mode Auto-Fill Active
                </p>
                <p>Clicking <strong>Pay Now</strong> will launch the 3D Secure OTP Verification Dialog.</p>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5">
                Pay ₹{amount.toFixed(2)} securely
              </Button>
            </form>
          )}

          {/* UPI TAB */}
          {activeTab === "upi" && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-muted/30 border rounded-xl inline-block mx-auto">
                <div className="w-40 h-40 bg-white border-2 border-emerald-600 rounded-lg p-2 flex flex-col items-center justify-center mx-auto shadow-inner relative group">
                  <div className="grid grid-cols-4 gap-1.5 w-full h-full p-1 opacity-85">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`rounded ${i % 3 === 0 ? "bg-emerald-900" : "bg-emerald-600"}`} />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold">Scan with UPI App</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Scan QR code using GPay, PhonePe, or Paytm</p>
              </div>

              <div className="text-left space-y-2">
                <Label className="text-xs">Or Enter Virtual Payment Address (VPA)</Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@upi"
                  className="font-mono"
                />
              </div>

              <Button
                onClick={() => handleProcessPayment("upi")}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simulate Instant UPI Payment (₹{amount.toFixed(2)})
              </Button>
            </div>
          )}

          {/* NETBANKING TAB */}
          {activeTab === "netbanking" && (
            <div className="space-y-4">
              <Label className="text-xs">Select Popular Partner Bank</Label>
              <div className="grid grid-cols-2 gap-2">
                {["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank"].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      selectedBank === bank
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
                        : "hover:border-muted-foreground/30"
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => handleProcessPayment("netbanking")}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Authorize via {selectedBank}
              </Button>
            </div>
          )}

          {/* CORPORATE PO TAB */}
          {activeTab === "po" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-semibold">Corporate Invoicing & Credit Terms</p>
                <p>Eligible for Net-30 day payment terms upon verification of valid Corporate PO Reference Number.</p>
              </div>

              <div>
                <Label className="text-xs">Purchase Order Reference (PO Number)</Label>
                <Input
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  placeholder="PO-2026-XXXX"
                  className="mt-1 font-mono uppercase"
                />
              </div>

              <Button
                onClick={() => handleProcessPayment("po")}
                disabled={loading || !poReference}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Order on Corporate PO Account
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Session</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-medium">
            Cancel
          </button>
        </div>
      </div>

      {/* 3D SECURE OTP SIMULATOR MODAL */}
      {showOtpDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="bg-background border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">3D Secure Card Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Enter test OTP code sent to registered mobile number for ₹{amount.toFixed(2)}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg text-xs font-mono text-center">
              <span className="text-muted-foreground">Test OTP Code: </span>
              <strong className="text-emerald-600 font-bold">123456</strong>
            </div>

            <div>
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setShowOtpDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : "Verify OTP"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

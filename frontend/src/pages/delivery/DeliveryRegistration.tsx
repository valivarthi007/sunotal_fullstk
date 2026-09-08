import React, { useState } from "react";
import { Bike, ShieldCheck, ArrowRight, CheckCircle2, User, Phone, FileText, MapPin, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeliveryRegistration() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<"ev_bike" | "motorcycle" | "scooter" | "bicycle">("ev_bike");
  const [licenseNo, setLicenseNo] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 p-4 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide">SUNOTAL RIDER</h1>
              <p className="text-[10px] text-emerald-400 font-semibold">10-15 Min Express Delivery Partner</p>
            </div>
          </div>
          <span className="text-[11px] bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2.5 py-1 rounded-full font-mono">
            EARN UP TO ₹35,000/MO
          </span>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-md mx-auto w-full p-4 flex-1 flex flex-col justify-center">
        {submitted ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">Onboarding Application Submitted!</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Welcome to the Sunotal Delivery Fleet. Your documents have been uploaded for verification. You can now access your rider dashboard to accept delivery alerts.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs gap-2 shadow-lg"
            >
              <span>Go to Rider Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-white">Join Sunotal Express Fleet</h2>
              <p className="text-xs text-slate-400">Complete your partner KYC and start earning immediately</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Full Name
                </Label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> Mobile Number (UPI Enabled)
                </Label>
                <Input
                  required
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-amber-400" /> Vehicle Type
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ev_bike", label: "Electric EV Bike ⚡" },
                    { id: "motorcycle", label: "Motorcycle 🏍️" },
                    { id: "scooter", label: "Scooter 🛵" },
                    { id: "bicycle", label: "Bicycle 🚲" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleType(v.id as any)}
                      className={`p-2.5 rounded-xl border text-left font-medium text-xs transition-all ${
                        vehicleType === v.id
                          ? "border-amber-400 bg-amber-400/10 text-amber-300 font-bold"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Driving License / ID Number
                </Label>
                <Input
                  required
                  placeholder="KA-05-2023-1234567"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> City
                  </Label>
                  <Input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" /> Emergency Contact
                  </Label>
                  <Input
                    required
                    placeholder="9988776655"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs shadow-lg transition-all"
                >
                  {loading ? "Submitting Application..." : "Submit Rider Onboarding Form"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 p-3 text-center text-[10px] text-slate-500">
        Sunotal Hyperlocal Express Partner Portal • Powered by CartoDB Voyager Maps Engine
      </footer>
    </div>
  );
}

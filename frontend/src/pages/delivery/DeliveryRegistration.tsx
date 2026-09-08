import React, { useState } from "react";
import { Bike, ArrowRight, CheckCircle2, User, Phone, FileText, MapPin, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";

export default function DeliveryRegistration() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<"ev_bike" | "motorcycle" | "scooter" | "bicycle">("ev_bike");
  const [licenseNo, setLicenseNo] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/delivery/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone,
          vehicleType,
          licenseNo,
          city,
          emergencyPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      toast.success("Delivery partner application submitted!");
      if (data.token) {
        localStorage.setItem("sunotal_delivery_token", data.token);
        localStorage.setItem("sunotal_token", data.token);
      }
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit onboarding form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="py-12 bg-accent/20">
        <div className="container mx-auto px-4 max-w-xl">
          {submitted ? (
            <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-secondary">Rider Registration Successful!</h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                Welcome to Sunotal Express Delivery Partner Fleet. Your profile has been created and logged in. You can now access your rider dashboard to accept express order tasks.
              </p>
              <Button
                onClick={() => setLocation("/delivery")}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs gap-2 shadow-lg shadow-emerald-600/20"
              >
                <span>Go to Rider Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
              <div className="text-center space-y-2 border-b pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Bike className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-secondary">Join Sunotal Express Fleet</h1>
                <p className="text-xs text-muted-foreground">Complete rider onboarding to start accepting 10-min grocery deliveries</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" /> Full Name
                    </Label>
                    <Input
                      required
                      placeholder="Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-foreground font-semibold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> Mobile (UPI Enabled)
                    </Label>
                    <Input
                      required
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground font-semibold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email Address
                    </Label>
                    <Input
                      required
                      type="email"
                      placeholder="rider@sunotal.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-foreground font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" /> Account Password
                    </Label>
                    <Input
                      required
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground font-semibold flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-emerald-600" /> Vehicle Type
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
                        className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all ${
                          vehicleType === v.id
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" /> Driving License / ID Number
                  </Label>
                  <Input
                    required
                    placeholder="KA-05-2023-1234567"
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className="h-10 text-xs rounded-xl uppercase bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-foreground font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> City
                    </Label>
                    <Input
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground font-semibold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> Emergency Contact
                    </Label>
                    <Input
                      required
                      placeholder="9988776655"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="h-10 text-xs rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20"
                  >
                    {loading ? "Submitting Application..." : "Submit Delivery Onboarding Form"}
                  </Button>
                </div>
              </form>

              <div className="pt-3 border-t text-center text-xs space-y-1">
                <p className="text-muted-foreground">Already registered as a delivery partner?</p>
                <Link href="/delivery/login" className="text-emerald-600 font-bold hover:underline">
                  Log in to Delivery Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

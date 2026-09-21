import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegisterUser } from "@workspace/api-client-react";
import { toast } from "sonner";
import { ArrowLeft, Navigation, ShieldCheck, Gift, User, Lock, Mail, Phone, Calendar } from "lucide-react";
import { useState } from "react";
import { useLocationState } from "@/lib/location-context";

const formSchema = z
  .object({
    name: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/(?=.*[A-Z])(?=.*\d)/, "Password must contain at least 1 uppercase letter and 1 number"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
    dob: z
      .string()
      .min(1, "Date of birth is required")
      .refine(
        (dateStr) => {
          const birthDate = new Date(dateStr);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age >= 18;
        },
        { message: "You must be at least 18 years old to register" }
      ),
    gender: z.string().min(1, "Please select your gender"),
    city: z.string().optional(),
    referralCode: z
      .string()
      .optional()
      .refine((val) => !val || /^[A-Z0-9]{6,10}$/i.test(val), {
        message: "Referral code must be 6-10 alphanumeric characters (e.g. SUN100)",
      }),
    profilePhotoUrl: z.string().optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the Terms & Conditions to register",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "bg-gray-200" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 25, label: "Weak", color: "bg-red-500" };
  if (score === 2 || score === 3) return { score: 65, label: "Medium", color: "bg-amber-500" };
  return { score: 100, label: "Strong", color: "bg-emerald-500" };
}

export default function Register() {
  const [, setLocation] = useLocation();
  const registerUser = useRegisterUser();
  const { location: detectedLoc, isLoading: isLocLoading, detectLocation } = useLocationState();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      dob: "",
      gender: "Male",
      city: detectedLoc.city || "",
      referralCode: "",
      profilePhotoUrl: "",
      acceptTerms: false,
    },
  });

  const watchPassword = form.watch("password");
  const strength = getPasswordStrength(watchPassword || "");

  const handleAutoDetectCity = async () => {
    const loc = await detectLocation();
    if (loc?.city) {
      form.setValue("city", loc.city);
      toast.success(`City auto-filled to ${loc.city}`);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    registerUser.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Account created successfully! Welcome to Sunotal.");
          setLocation("/login");
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || error.message || "Registration failed. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-accent/30 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Storefront
        </Link>

        <div className="bg-card border border-border shadow-lg rounded-3xl p-6 sm:p-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative group cursor-pointer mb-3">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-full flex items-center justify-center font-bold text-3xl shadow-md shadow-emerald-600/30 overflow-hidden border-2 border-emerald-500">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>☀️</span>
                  )}
                </div>
                <label htmlFor="avatar-file-input" className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow cursor-pointer hover:scale-110 transition-transform">
                  <span className="text-xs">📷</span>
                </label>
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result as string;
                        setAvatarPreview(base64);
                        form.setValue("profilePhotoUrl", base64);
                        toast.success("Profile photo uploaded!");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Create Customer Account</h1>
              <p className="text-sm text-muted-foreground mt-1">Get 10-minute grocery delivery & exclusive offers</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-600" /> Full Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rahul Sharma" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email Address <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="rahul@example.com" type="email" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Mobile Number <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit mobile" type="tel" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" /> Password <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="At least 8 chars (1 upper, 1 number)" type="password" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        {/* Password Strength Indicator */}
                        {watchPassword && (
                          <div className="mt-1.5 space-y-1">
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${strength.color}`}
                                style={{ width: `${strength.score}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-muted-foreground font-medium">Strength:</span>
                              <span className="font-bold uppercase tracking-wider">{strength.label}</span>
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" /> Confirm Password <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Re-enter password" type="password" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date of Birth (18+) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="date" className="h-11 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-1.5 pt-1">
                            {["Male", "Female", "Other", "Prefer Not To Say"].map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => field.onChange(g)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                  field.value === g
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              {/* City & Referral Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>City</span>
                        <button
                          type="button"
                          onClick={handleAutoDetectCity}
                          disabled={isLocLoading}
                          className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" /> Detect
                        </button>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Bengaluru" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-500" /> Referral Code (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SUN50" className="h-11 rounded-xl uppercase font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Terms & Conditions Checkbox */}
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-2xl border border-border p-4 bg-muted/20">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs font-semibold cursor-pointer">
                        I agree to Sunotal's Terms of Service and Privacy Policy.
                      </FormLabel>
                      <p className="text-[11px] text-muted-foreground">
                        Your personal details are safely encrypted per industry security standards.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl mt-2 gap-2"
                disabled={registerUser.isPending}
              >
                {registerUser.isPending ? "Creating Account..." : <><ShieldCheck className="w-5 h-5" /> Complete Registration</>}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="font-bold text-emerald-600 hover:underline">
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

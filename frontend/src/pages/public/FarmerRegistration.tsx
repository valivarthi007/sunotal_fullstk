import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListCategories, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Leaf, Users, TrendingUp, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  location: z.string().min(3, "Village/Town must be at least 3 characters"),
  farmSize: z.string().optional(),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  aadhar: z.string().regex(/^\d{12}$/, "Aadhar must be a 12-digit number"),
  gstin: z.string().optional().refine((val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val), {
    message: "Invalid GSTIN format (e.g. 36AAACB1234C1ZV)",
  }),
  category: z.string().min(1, "Please select a category"),
  produce: z.string().min(2, "Produce name must be at least 2 characters"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
});

export default function FarmerRegistration() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const { data: categories } = useListCategories();
  
  // Redirect logged-in users away from registration page
  useEffect(() => {
    if (user) {
      setLocation(user.role === "vendor" ? "/vendor" : "/");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      location: "",
      farmSize: "",
      email: "",
      password: "",
      aadhar: "",
      gstin: "",
      category: "",
      produce: "",
      quantity: 1,
      price: 1,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Convert Quintal to Kilograms (1 Quintal = 100 kg)
      // Convert Price per Quintal to Price per Kilogram
      const convertedValues = {
        ...values,
        quantity: Number(values.quantity) * 100,
        price: Number(values.price) / 100,
      };

      const response = await fetch("/api/vendors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convertedValues),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Registration failed");
      }

      toast.success("Application submitted! Admin approval is pending.");
      form.reset();
      setLocation("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="bg-secondary text-secondary-foreground py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/20">Sunotal For Farmers</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">Grow with Sunotal.<br/>Sell Direct. Earn More.</h1>
            <p className="text-xl text-white/80 mb-10 max-w-2xl">
              Join a network of progressive farmers selling directly to customers. Cut out the middlemen and get paid faster.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-white/10">
              <div>
                <p className="text-3xl font-bold text-primary mb-1">50k+</p>
                <p className="text-sm text-white/70 uppercase tracking-wider font-semibold">Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary mb-1">40%</p>
                <p className="text-sm text-white/70 uppercase tracking-wider font-semibold">More Earnings</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary mb-1">2 Day</p>
                <p className="text-sm text-white/70 uppercase tracking-wider font-semibold">Payments</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary mb-1">1000+</p>
                <p className="text-sm text-white/70 uppercase tracking-wider font-semibold">Farmers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-bold mb-8">Why partner with us?</h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Direct Market Access</h3>
                  <p className="text-muted-foreground">Your produce reaches the end consumer without going through multiple hands. Build your own brand.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shrink-0">
                  <HandCoins className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Transparent Pricing & Fast Payments</h3>
                  <p className="text-muted-foreground">Know exactly what you earn. Payments are credited directly to your bank account within 48 hours of sale.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Logistics Support</h3>
                  <p className="text-muted-foreground">We handle the pick-up from designated collection centers so you can focus entirely on farming.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shrink-0">
                  <Leaf className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Dedicated Support</h3>
                  <p className="text-muted-foreground">Access agronomists, weather updates, and market demand forecasts through our farmer app.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border shadow-sm rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-2">Apply to become a Vendor</h2>
            <p className="text-muted-foreground mb-8">Fill out the details below and our sourcing team will visit your farm.</p>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Ram" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Kumar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login Password <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Minimum 6 characters" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit number" type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Village / Town / Address <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Mandal, District" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="aadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhar Card Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="12-digit number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="36AAACB1234C1ZV" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="farmSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Farm Size (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 5 Acres" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold mb-4 text-primary">Initial Produce Quotation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              )) || (
                                <>
                                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                                  <SelectItem value="Fruits">Fruits</SelectItem>
                                  <SelectItem value="Dairy">Dairy</SelectItem>
                                  <SelectItem value="Dry Fruits">Dry Fruits</SelectItem>
                                  <SelectItem value="Grains">Grains</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="produce"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produce Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Red Tomatoes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity (in Quintals) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quoted Price per Quintal (₹) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-base font-bold h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting Application..." : "Submit Application & Offer"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

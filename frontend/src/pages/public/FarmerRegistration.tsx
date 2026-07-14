import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateVendor } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Leaf, Users, TrendingUp, HandCoins } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  location: z.string().min(3, "Village/Town is required"),
  produce: z.string().min(3, "Primary produce is required"),
  farmSize: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export default function FarmerRegistration() {
  const createVendor = useCreateVendor();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      location: "",
      produce: "",
      farmSize: "",
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createVendor.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Application submitted! We will contact you soon.");
        form.reset();
      },
      onError: () => {
        toast.error("Failed to submit application. Please try again.");
      }
    });
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
                        <FormLabel>Village / Town <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Mandal, District" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="produce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Produce <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Tomatoes, Mangoes, Organic Rice" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="farmSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farm Size (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 5 Acres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-base font-bold h-12"
                  disabled={createVendor.isPending}
                >
                  {createVendor.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

// Needed badge since it wasn't imported
import { Badge } from "@/components/ui/badge";

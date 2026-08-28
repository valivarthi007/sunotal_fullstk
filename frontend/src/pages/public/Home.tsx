import { PublicLayout } from "@/components/layout/PublicLayout";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListCategories } from "@workspace/api-client-react";
import { useListBanners } from "@/lib/api-client";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { CheckCircle2, ShieldCheck, Clock, MapPin, Truck, LifeBuoy, PhoneCall, ArrowRight, Search, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationState } from "@/lib/location-context";
import { normalizeImageUrl, handleImageError } from "@/lib/image-utils";
import { GrievanceRedressalModal } from "@/components/ui/GrievanceRedressalModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const FALLBACK_SLIDES = [
  {
    bg: "#0B2914",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
    headline: "Fresh from Farm, Direct to Door",
    subheadline: "100% Organic produce harvested this morning, delivered fresh.",
    shopHref: "/products",
  },
  {
    bg: "#1A5C24",
    image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1600&q=80",
    headline: "Direct from Indian Organic Farmers",
    subheadline: "Support local agriculture and enjoy chemical-free healthy food.",
    shopHref: "/products",
  },
];

const DEFAULT_CATEGORIES = [
  { name: "Vegetables", path: "/vegetables", icon: "🥬", color: "bg-emerald-100 text-emerald-800" },
  { name: "Fruits", path: "/fruits", icon: "🍎", color: "bg-orange-100 text-orange-800" },
  { name: "Dairy", path: "/dairy", icon: "🥛", color: "bg-blue-100 text-blue-800" },
  { name: "Dry Fruits", path: "/dry-fruits", icon: "🥜", color: "bg-amber-100 text-amber-800" },
  { name: "Grains", path: "/grains", icon: "🌾", color: "bg-yellow-100 text-yellow-800" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { location: userLoc } = useLocationState();

  const { data: apiBanners = [] } = useListBanners();

  const SLIDES = useMemo(() => {
    if (apiBanners.length === 0) return FALLBACK_SLIDES;
    const BG_COLORS = ["#0B2914", "#1A5C24", "#2A8C3F", "#154C21", "#0D3A18"];
    return apiBanners.map((b, i) => ({
      bg: BG_COLORS[i % BG_COLORS.length],
      image: b.imageUrl,
      headline: b.title,
      subheadline: b.subtitle || "",
      shopHref: b.linkUrl || "/products",
    }));
  }, [apiBanners]);

  const { data: dbCategories = [] } = useListCategories();
  const categoriesList = useMemo(() => {
    if (!dbCategories || dbCategories.length === 0) return DEFAULT_CATEGORIES;
    return dbCategories.map((c) => ({
      name: c.name,
      path: c.name === "Vegetables" ? "/vegetables" : c.name === "Fruits" ? "/fruits" : c.name === "Dairy" ? "/dairy" : c.name === "Dry Fruits" ? "/dry-fruits" : c.name === "Grains" ? "/grains" : `/products?category=${encodeURIComponent(c.name)}`,
      icon: c.icon || "📦",
      color: "bg-emerald-100 text-emerald-800",
    }));
  }, [dbCategories]);

  // Modals state
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [trackOrderInput, setTrackOrderInput] = useState("ORD-2026-8801");
  const [showTrackModal, setShowTrackModal] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(interval);
    };
  }, [emblaApi]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackOrderInput.trim()) return;
    setShowTrackModal(true);
  };

  return (
    <PublicLayout>
      {/* Hero Carousel */}
      <section className="relative overflow-hidden bg-secondary">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {SLIDES.map((slide, index) => (
              <div key={index} className="relative flex-[0_0_100%] min-w-0">
                <div
                  className="absolute inset-0 z-0 opacity-40 mix-blend-multiply"
                  style={{ backgroundColor: slide.bg }}
                />
                <img
                  src={normalizeImageUrl(slide.image, "Banners")}
                  alt={slide.headline}
                  onError={(e) => handleImageError(e, "Banners")}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/70 to-transparent z-10" />

                <div className="container relative z-20 mx-auto px-4 py-20 md:py-28 lg:py-40 flex items-center">
                  <div className="max-w-2xl text-white">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight tracking-tight">
                      {slide.headline}
                    </h2>
                    <p className="text-lg md:text-xl text-white/90 mb-8 font-medium">
                      {slide.subheadline}
                    </p>
                    <div className="flex gap-4">
                      <Button
                        size="lg"
                        className="rounded-full px-8 text-base shadow-lg shadow-primary/20 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={() => setLocation(slide.shopHref)}
                      >
                        Explore Products <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full px-8 text-base bg-white/10 hover:bg-white/20 text-white border-white/30"
                        onClick={() => setShowGrievanceModal(true)}
                      >
                        Support & Grievances
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location Express Delivery Bar */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-accent/40 border-y border-primary/20 py-3.5 px-4">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 font-bold text-secondary">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-muted-foreground font-normal">Delivering Fresh Produce to: </span>
                <strong className="text-primary underline cursor-pointer">{userLoc.city}, {userLoc.state || userLoc.country}</strong>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-secondary">
              <span className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-primary" /> Express 2-Hour Delivery
              </span>
              <span className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> 100% Traceable Farmers
              </span>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                selectedIndex === i ? "bg-white w-8" : "bg-white/50 hover:bg-white/80 w-2.5"
              )}
              onClick={() => emblaApi?.scrollTo(i)}
            />
          ))}
        </div>
      </section>

      {/* Clean Category Grid */}
      <section className="py-12 bg-background border-b">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-secondary mb-6 text-center">Browse Produce Categories</h2>
          <div className="flex gap-4 md:grid md:grid-cols-5 overflow-x-auto no-scrollbar pb-4 md:pb-0">
            {categoriesList.map((cat) => (
              <Link
                key={cat.name}
                href={cat.path}
                className="flex-shrink-0 w-32 md:w-auto flex flex-col items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110", cat.color)}>
                  {cat.icon}
                </div>
                <span className="font-semibold text-sm text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Order Tracking & Grievance Portal Cards Section */}
      <section className="py-16 bg-accent/30 border-b">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Default Order Tracking Launcher */}
            <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Track Order Status</h3>
                  <p className="text-xs text-muted-foreground">Enter your order ID for instant step tracking</p>
                </div>
              </div>

              <form onSubmit={handleTrackSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={trackOrderInput}
                    onChange={(e) => setTrackOrderInput(e.target.value)}
                    placeholder="e.g. ORD-2026-8801"
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl px-5">
                    Track
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Default Demo Order:</span>
                  <button type="button" onClick={() => { setTrackOrderInput("ORD-2026-8801"); setShowTrackModal(true); }} className="text-emerald-600 font-bold hover:underline">
                    ORD-2026-8801
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: Support & Grievance Mechanism */}
            <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Support & Grievance Redressal</h3>
                  <p className="text-xs text-muted-foreground">24x7 Helpdesk & Nodal Quality Officer Desk</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Have a quality issue or query? Register a grievance ticket for 2-hour SLA resolution.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <a href="tel:09090007108" className="text-emerald-600 font-bold flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5" /> 090900 07108
                  </a>
                  <Button onClick={() => setShowGrievanceModal(true)} variant="outline" className="rounded-xl text-xs font-bold border-emerald-600/30 text-emerald-600">
                    Raise Grievance
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Grievance Modal */}
      <GrievanceRedressalModal
        isOpen={showGrievanceModal}
        onClose={() => setShowGrievanceModal(false)}
        defaultOrderId={trackOrderInput || "ORD-2026-8801"}
      />

      {/* Track Order Stepper Dialog */}
      {showTrackModal && (
        <Dialog open={showTrackModal} onOpenChange={setShowTrackModal}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Truck className="w-6 h-6 text-emerald-600" /> Order Tracking Timeline
              </DialogTitle>
              <DialogDescription className="text-xs font-mono font-bold text-foreground">
                Order Reference: {trackOrderInput}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-600">
                {[
                  { title: "Order Placed & Confirmed", desc: "Payment captured & order logged to warehouse", done: true },
                  { title: "Harvested & Packed at Organic Farm", desc: "Quality inspected by agricultural supervisor", done: true },
                  { title: "Out for Express Delivery", desc: "Estimated delivery within 2 hours", done: true },
                  { title: "Delivered to Customer", desc: "Bhavani Puram, Vijayawada Hub", done: false },
                ].map((step, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground border"
                      }`}
                    >
                      ✓
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted/40 rounded-2xl text-xs space-y-2 font-mono border">
                <div className="flex justify-between"><span className="text-muted-foreground">Tracking Number:</span><strong>TRK-98124019</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><strong className="text-emerald-600 font-bold">EXPRESS_IN_TRANSIT</strong></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PublicLayout>
  );
}

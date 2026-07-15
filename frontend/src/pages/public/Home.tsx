import { PublicLayout } from "@/components/layout/PublicLayout";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/ui/ProductCard";
import { useListProducts } from "@workspace/api-client-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Clock, Tractor } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    bg: "#0B2914",
    image: "https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/vegetables.jpg",
    headline: "Fresh from Farm, Direct to Door",
    subheadline: "Harvested this morning, delivered by evening.",
    shopHref: "/products",
    offersHref: "/vegetables",
  },
  {
    bg: "#1A5C24",
    image: "https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/fruits.jpg",
    headline: "Alphonso Mangoes Season is Here",
    subheadline: "Sweet, juicy, and 100% organic.",
    shopHref: "/fruits",
    offersHref: "/fruits",
  },
  {
    bg: "#2A8C3F",
    image: "https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/grains.jpg",
    headline: "Organic Grains & Pulses",
    subheadline: "Wholesome nutrition for your family.",
    shopHref: "/grains",
    offersHref: "/products",
  },
];

const CATEGORIES = [
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
  const [activeTab, setActiveTab] = useState("All");

  const { data: products, isLoading } = useListProducts(
    activeTab !== "All" ? { category: activeTab } : undefined,
    { query: { queryKey: ["products", activeTab] } }
  );

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

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
                  src={slide.image}
                  alt={slide.headline}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/70 to-transparent z-10" />

                <div className="container relative z-20 mx-auto px-4 py-24 md:py-32 lg:py-48 flex items-center">
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
                        className="rounded-full px-8 text-base shadow-lg shadow-primary/20"
                        onClick={() => setLocation(slide.shopHref)}
                      >
                        Shop Now
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full px-8 text-base border-white/30 text-secondary bg-white hover:bg-white/90 shadow-lg"
                        onClick={() => setLocation(slide.offersHref)}
                      >
                        Explore Offers
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

      {/* Categories */}
      <section className="py-12 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 md:grid md:grid-cols-5 overflow-x-auto no-scrollbar pb-4 md:pb-0">
            {CATEGORIES.map((cat) => (
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

      {/* Popular Products */}
      <section className="py-16 md:py-24 bg-accent/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-secondary mb-2 tracking-tight">Popular Right Now</h2>
              <p className="text-muted-foreground">Handpicked fresh arrivals from our local farms.</p>
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 md:pb-0">
              {["All", ...CATEGORIES.map((c) => c.name)].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                    activeTab === tab
                      ? "bg-secondary text-white border-secondary shadow-sm"
                      : "bg-white text-secondary hover:border-secondary border-transparent"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : products && products.length > 0 ? (
              products.slice(0, 10).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed">
                <p className="text-muted-foreground">No products found in this category.</p>
              </div>
            )}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" className="rounded-full px-8" asChild>
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Sunotal */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-secondary mb-4 tracking-tight">The Sunotal Difference</h2>
            <p className="text-muted-foreground text-lg">
              We're cutting out the middlemen to bring you better produce and support our farmers directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Tractor, title: "Farm-to-Door", desc: "Harvested at 5 AM, delivered to your doorstep by 9 AM." },
              { icon: ShieldCheck, title: "Organic Certified", desc: "100% traceable produce grown without harmful chemicals." },
              { icon: Clock, title: "Daily Fresh", desc: "We never cold-store our vegetables. What you get is what was grown today." },
              { icon: CheckCircle2, title: "Zero Middlemen", desc: "Fair prices for you, better margins for our hard-working farmers." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center p-6 rounded-3xl bg-accent/30 border border-border hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary text-secondary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://jcs-raju-sunotal-final.s3.us-east-1.amazonaws.com/vegetables.jpg')] opacity-10 bg-cover bg-center" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready for a fresher tomorrow?</h2>
          <p className="text-xl text-white/80 mb-10">
            Join thousands of families enjoying farm-fresh produce delivered daily.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-8 text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setLocation("/products")}
            >
              Shop Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 text-lg h-14 border-white/30 hover:bg-white/10 text-primary-foreground"
              onClick={() => setLocation("/register")}
            >
              Sign Up Online
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

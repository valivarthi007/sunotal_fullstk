import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Search, Check, Sparkles, Loader2, Building2 } from "lucide-react";
import { useLocationState } from "@/lib/location-context";
import { toast } from "sonner";

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CORPORATE_HUBS = [
  { city: "Bengaluru", state: "Karnataka", hub: "Electronic City & Whitefield" },
  { city: "Mumbai", state: "Maharashtra", hub: "BKC & Lower Parel" },
  { city: "Delhi NCR", state: "Delhi", hub: "Cyber City & Noida" },
  { city: "Hyderabad", state: "Telangana", hub: "HITEC City & Gachibowli" },
  { city: "Chennai", state: "Tamil Nadu", hub: "OMR & Guindy" },
  { city: "Pune", state: "Maharashtra", hub: "Hinjawadi & Kharadi" },
  { city: "Kolkata", state: "West Bengal", hub: "Salt Lake Sector V" },
  { city: "Ahmedabad", state: "Gujarat", hub: "GIFT City" },
];

export function LocationModal({ open, onOpenChange }: LocationModalProps) {
  const { location, isLoading, detectLocation, setManualLocation } = useLocationState();
  const [searchQuery, setSearchQuery] = useState("");

  const handleAutoDetect = async () => {
    const loc = await detectLocation();
    if (loc) {
      toast.success(`Location set to ${loc.city}, ${loc.state}`);
      onOpenChange(false);
    } else {
      toast.error("Could not auto-detect location. Please select a city below.");
    }
  };

  const handleSelectCity = (city: string, state: string) => {
    setManualLocation(city, state);
    toast.success(`Delivery location updated to ${city}`);
    onOpenChange(false);
  };

  const filteredHubs = CORPORATE_HUBS.filter(
    (h) =>
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.hub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 border-border shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-secondary tracking-tight">
              Select Delivery Location
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            We deliver fresh produce directly to corporate hubs and residences nationwide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Primary Action: Auto-Detect GPS Button */}
          <Button
            onClick={handleAutoDetect}
            disabled={isLoading}
            className="w-full h-13 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex items-center justify-between px-5 shadow-lg shadow-primary/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5 fill-current" />
              )}
              <div className="text-left">
                <p className="text-sm font-bold leading-none">
                  {isLoading ? "Detecting location..." : "Auto-Detect My Location"}
                </p>
                <p className="text-[11px] font-normal opacity-90 leading-tight mt-0.5">
                  Using GPS & IP Geolocation
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </Button>

          {/* Current Status Pill */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-accent/50 border border-border text-xs">
            <span className="text-muted-foreground font-medium">Currently Selected:</span>
            <span className="font-bold text-secondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {location.city}, {location.state || location.country}
              {location.isDetected && (
                <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  GPS Verified
                </span>
              )}
            </span>
          </div>

          {/* City Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search city, state or pincode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-background border-border rounded-xl text-sm focus-visible:ring-primary/20"
            />
          </div>

          {/* Corporate Hubs Grid */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Popular Corporate Hubs
            </p>
            <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredHubs.map((hub) => {
                const isSelected = location.city.toLowerCase() === hub.city.toLowerCase();
                return (
                  <button
                    key={hub.city}
                    onClick={() => handleSelectCity(hub.city, hub.state)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    <div>
                      <p className={`font-semibold text-sm leading-tight ${isSelected ? "text-primary" : "text-secondary"}`}>
                        {hub.city}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hub.hub}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
              {filteredHubs.length === 0 && searchQuery && (
                <div className="col-span-2 text-center py-6 border border-dashed rounded-xl">
                  <p className="text-sm font-medium text-secondary mb-2">"{searchQuery}"</p>
                  <Button
                    size="sm"
                    onClick={() => handleSelectCity(searchQuery, "India")}
                    className="rounded-full text-xs font-bold"
                  >
                    Use "{searchQuery}" as delivery location
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

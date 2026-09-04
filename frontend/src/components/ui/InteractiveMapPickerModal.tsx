import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Crosshair, Home, Briefcase, Building, Tag, Check, Loader2, X, ShieldCheck } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { saveUserAddress, fetchUserAddresses, UserAddressApi } from "../../lib/api-client";
import { loadGeoapifySdk, reverseGeocodeGeoapify, getGeoapifyTileUrl } from "../../lib/geoapify-sdk";

interface InteractiveMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (addressData: {
    houseNo: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
  }) => void;
}

export const InteractiveMapPickerModal: React.FC<InteractiveMapPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
}) => {
  const [activeTab, setActiveTab] = useState<"map" | "saved">("map");

  // Map Coordinates & Address State
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [houseNo, setHouseNo] = useState("Flat 402, Green Acres");
  const [street, setStreet] = useState("100 Feet Rd, Indiranagar");
  const [landmark, setLandmark] = useState("Opp. Metro Station");
  const [city, setCity] = useState("Bengaluru");
  const [stateName, setStateName] = useState("Karnataka");
  const [pincode, setPincode] = useState("560038");
  const [tag, setTag] = useState<"home" | "work" | "office" | "other">("home");

  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<UserAddressApi[]>([]);
  const [geoapifyLoaded, setGeoapifyLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserAddresses()
        .then((data) => setSavedAddresses(data))
        .catch((err) => console.error("Failed to load saved addresses", err));

      loadGeoapifySdk().then((success) => {
        setGeoapifyLoaded(success);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Reverse Geocoding Lookup via Geoapify REST API & Nominatim Fallback
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setGeocoding(true);
    try {
      const geoapifyRes = await reverseGeocodeGeoapify(latitude, longitude);
      if (geoapifyRes) {
        if (geoapifyRes.city) setCity(geoapifyRes.city);
        if (geoapifyRes.state) setStateName(geoapifyRes.state);
        if (geoapifyRes.pincode) setPincode(geoapifyRes.pincode);
        if (geoapifyRes.street) setStreet(geoapifyRes.street);
        if (geoapifyRes.houseNo) setHouseNo(geoapifyRes.houseNo);
        if (geoapifyRes.landmark) setLandmark(geoapifyRes.landmark);
      } else {
        // Nominatim fallback
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          setCity(addr.city || addr.town || addr.suburb || "Bengaluru");
          setStateName(addr.state || "Karnataka");
          setPincode(addr.postcode || "560038");
          setStreet(data.display_name?.split(",").slice(0, 2).join(",") || street);
        }
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setGeocoding(false);
    }
  };

  // HTML5 Current Position Handler
  const handleDetectGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setLat(newLat);
          setLng(newLng);
          reverseGeocode(newLat, newLng);
        },
        () => {
          alert("GPS access denied. Defaulting to current map location.");
        }
      );
    }
  };

  // Drag simulation / Pin movement handler
  const handleMovePin = (deltaLat: number, deltaLng: number) => {
    const nextLat = Math.round((lat + deltaLat) * 10000) / 10000;
    const nextLng = Math.round((lng + deltaLng) * 10000) / 10000;
    setLat(nextLat);
    setLng(nextLng);
    reverseGeocode(nextLat, nextLng);
  };

  const handleConfirmAddress = async () => {
    setSaving(true);
    try {
      const payload = {
        tag,
        houseNo,
        street,
        landmark,
        city,
        state: stateName,
        pincode,
        latitude: lat,
        longitude: lng,
        isDefault: true,
      };

      // Save address to server database (graceful fallback if unauthenticated)
      try {
        await saveUserAddress(payload);
      } catch (saveErr) {
        console.warn("Address save to database skipped (unauthenticated or offline):", saveErr);
      }

      // Always update selected address in UI state
      onSelectAddress({
        houseNo,
        street,
        landmark,
        city,
        state: stateName,
        pincode,
        lat,
        lng,
      });

      onClose();
    } catch (err: any) {
      console.error("Address confirmation error:", err);
      // Fallback invocation
      onSelectAddress({
        houseNo,
        street,
        landmark,
        city,
        state: stateName,
        pincode,
        lat,
        lng,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSaved = (saved: UserAddressApi) => {
    onSelectAddress({
      houseNo: saved.houseNo,
      street: saved.street,
      landmark: saved.landmark,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
      lat: saved.latitude,
      lng: saved.longitude,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Pin Delivery Location on Map</h2>
              <p className="text-xs text-muted-foreground">Hyperlocal delivery powered by Geoapify Maps</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b text-xs font-semibold bg-muted/30">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === "map" ? "border-emerald-600 text-emerald-600 font-bold bg-background" : "text-muted-foreground"
            }`}
          >
            Pin Point Map Location
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === "saved" ? "border-emerald-600 text-emerald-600 font-bold bg-background" : "text-muted-foreground"
            }`}
          >
            Saved Address Book ({savedAddresses.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === "map" && (
            <>
              {/* Interactive Vector Map Tile Visualization */}
              <div className="relative w-full h-52 bg-slate-900 border-2 border-emerald-600/60 rounded-2xl overflow-hidden shadow-inner group">
                {/* Geoapify Map Container */}
                <div ref={mapContainerRef} id="geoapify-map-container" className="absolute inset-0 w-full h-full z-0" />

                {/* Grid Overlay Fallback */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Center Pin Marker */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative -mt-8 flex flex-col items-center animate-bounce">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white">
                      <MapPin className="w-6 h-6 fill-white text-emerald-600" />
                    </div>
                    <div className="w-3 h-3 bg-black/40 rounded-full blur-xs mt-1" />
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
                  <Button size="icon" variant="secondary" className="w-8 h-8 rounded-lg shadow" onClick={handleDetectGps}>
                    <Crosshair className="w-4 h-4 text-emerald-600" />
                  </Button>
                </div>

                {/* Nudge Controls Simulator */}
                <div className="absolute bottom-3 left-3 z-20 bg-background/90 backdrop-blur-sm border px-3 py-1.5 rounded-xl text-[10px] font-mono flex items-center gap-2">
                  <span>GPS: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleMovePin(0.002, 0)} className="px-1 bg-accent rounded hover:bg-primary hover:text-white">↑</button>
                    <button onClick={() => handleMovePin(-0.002, 0)} className="px-1 bg-accent rounded hover:bg-primary hover:text-white">↓</button>
                    <button onClick={() => handleMovePin(0, -0.002)} className="px-1 bg-accent rounded hover:bg-primary hover:text-white">←</button>
                    <button onClick={() => handleMovePin(0, 0.002)} className="px-1 bg-accent rounded hover:bg-primary hover:text-white">→</button>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Address Label Tag</Label>
                  <div className="flex gap-1.5">
                    {(["home", "work", "office", "other"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTag(t)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          tag === t ? "bg-emerald-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">House / Flat / Building No. <span className="text-destructive">*</span></Label>
                  <Input
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder="e.g. Flat 402, Tower B"
                    className="h-10 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Street / Locality Address <span className="text-destructive">*</span></Label>
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 100 Feet Road, Indiranagar"
                    className="h-10 text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-10 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input value={stateName} onChange={(e) => setStateName(e.target.value)} className="h-10 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Pincode</Label>
                    <Input value={pincode} onChange={(e) => setPincode(e.target.value)} className="h-10 text-xs mt-1 font-mono" />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConfirmAddress}
                disabled={saving || !houseNo || !street}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 mt-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Confirm & Save Map Location
              </Button>
            </>
          )}

          {activeTab === "saved" && (
            <div className="space-y-3">
              {savedAddresses.length === 0 ? (
                <div className="p-8 text-center border rounded-2xl bg-muted/20">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">No saved addresses</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pin your location on the map to save an address.</p>
                </div>
              ) : (
                savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectSaved(addr)}
                    className="p-4 border rounded-2xl bg-card hover:border-emerald-600 cursor-pointer transition-all flex items-start justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {addr.tag}
                        </span>
                        {addr.isDefault && <span className="text-[10px] text-emerald-600 font-bold">DEFAULT</span>}
                      </div>
                      <p className="text-xs font-bold text-foreground">{addr.houseNo}, {addr.street}</p>
                      <p className="text-[11px] text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>

                    <Button size="sm" variant="ghost" className="text-emerald-600 group-hover:bg-emerald-50 text-xs">
                      Deliver Here
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

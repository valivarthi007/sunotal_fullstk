import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Crosshair, Home, Briefcase, Building, Tag, Check, Loader2, X, ShieldCheck, Search } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { getMapProvider } from "../../lib/providers/map/map-provider.factory";
import { GeocodeResult } from "../../lib/providers/map/map-provider.interface";
import { UserAddressApi, fetchUserAddresses, saveUserAddress } from "@/lib/api-client/delivery";
import { useLocationState } from "@/lib/location-context";
import { toast } from "sonner";

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
  const { location: userLoc, detectLocation } = useLocationState();
  const [activeTab, setActiveTab] = useState<"map" | "saved">("map");
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Map Coordinates & Address State
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [tag, setTag] = useState<"home" | "work" | "office" | "other">("home");

  // Place Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<UserAddressApi[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const mapProvider = getMapProvider();

  useEffect(() => {
    if (isOpen) {
      // Initialize map position with user's detected location if available
      if (userLoc.latitude && userLoc.longitude) {
        setLat(userLoc.latitude);
        setLng(userLoc.longitude);
        if (userLoc.city && userLoc.city !== "Select Location") setCity(userLoc.city);
        if (userLoc.state) setStateName(userLoc.state);
        if (userLoc.pincode) setPincode(userLoc.pincode);
        reverseGeocode(userLoc.latitude, userLoc.longitude);
      } else {
        // Auto-detect current position immediately so map never defaults to Bangalore
        detectLocation().then((loc) => {
          if (loc && loc.latitude && loc.longitude) {
            setLat(loc.latitude);
            setLng(loc.longitude);
            if (loc.city) setCity(loc.city);
            if (loc.state) setStateName(loc.state);
            if (loc.pincode) setPincode(loc.pincode);
            reverseGeocode(loc.latitude, loc.longitude);
          }
        });
      }

      fetchUserAddresses()
        .then((data) => setSavedAddresses(data))
        .catch((err) => console.error("Failed to load saved addresses", err));

      mapProvider.loadSdk().then((success) => {
        setMapLoaded(success);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "map" || !mapContainerRef.current) return;

    mapProvider.loadSdk().then(() => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer(mapProvider.getTileUrl(), {
        attribution: mapProvider.getTileAttribution(),
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });

      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
        reverseGeocode(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  if (!isOpen) return null;

  // Reverse Geocoding Lookup via IMapProvider
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setGeocoding(true);
    try {
      const res = await mapProvider.reverseGeocode(latitude, longitude);
      if (res) {
        if (res.city) setCity(res.city);
        if (res.state) setStateName(res.state);
        if (res.pincode) setPincode(res.pincode);
        if (res.street) setStreet(res.street);
        if (res.houseNo) setHouseNo(res.houseNo);
        if (res.landmark) setLandmark(res.landmark);
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setGeocoding(false);
    }
  };

  // HTML5 Current Position Handler with Robust IP Fallback
  const handleDetectGps = async () => {
    setIsDetectingGps(true);

    const applyPosition = (latitude: number, longitude: number) => {
      setLat(latitude);
      setLng(longitude);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 15);
        markerRef.current.setLatLng([latitude, longitude]);
      }
      reverseGeocode(latitude, longitude);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          applyPosition(newLat, newLng);
          setIsDetectingGps(false);
          toast.success("GPS Current Location detected!");
        },
        async (geoErr) => {
          console.warn("HTML5 Geolocation access failed, resolving via IP API...", geoErr);
          toast.info("HTML5 GPS access restricted. Resolving current location via network IP...");
          const loc = await detectLocation();
          if (loc && loc.latitude && loc.longitude) {
            applyPosition(loc.latitude, loc.longitude);
            toast.success(`Current location updated to ${loc.city}, ${loc.state}`);
          } else {
            toast.error("Could not resolve current location automatically. Please click on the map.");
          }
          setIsDetectingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      const loc = await detectLocation();
      if (loc && loc.latitude && loc.longitude) {
        applyPosition(loc.latitude, loc.longitude);
        toast.success(`Current location updated to ${loc.city}, ${loc.state}`);
      } else {
        toast.error("Geolocation is not supported by your browser.");
      }
      setIsDetectingGps(false);
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

  const handleSearchLocation = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await mapProvider.searchPlaces(q);
      setSearchResults(results);
    } catch (err) {
      console.error("Place search error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodeResult) => {
    if (result.lat && result.lng) {
      setLat(result.lat);
      setLng(result.lng);
      if (result.city) setCity(result.city);
      if (result.state) setStateName(result.state);
      if (result.pincode) setPincode(result.pincode);
      if (result.street) setStreet(result.street);
      setSearchResults([]);
      setSearchQuery(result.formattedAddress || "");
      reverseGeocode(result.lat, result.lng);
    }
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
              <p className="text-xs text-muted-foreground">Hyperlocal delivery powered by CartoDB Voyager Map Engine</p>
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
              {/* Dynamic Place Search Autocomplete */}
              <div className="relative z-30">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchLocation(e.target.value)}
                    placeholder="Search area, street, landmark (e.g. Benz Circle Vijayawada, HSR Layout)..."
                    className="pl-9 pr-8 h-10 rounded-xl text-xs bg-accent/40 border-emerald-600/30 focus-visible:border-emerald-600"
                  />
                  {isSearching && <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-emerald-600" />}
                </div>

                {/* Search Prediction Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-11 z-40 bg-background border border-border shadow-2xl rounded-2xl p-2 space-y-1 max-h-48 overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs flex items-start gap-2 group transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="truncate font-medium text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                          {res.formattedAddress || `${res.city}, ${res.state}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Select NTR District / Vijayawada & Indian Hub Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider shrink-0">NTR / AP Hubs:</span>
                  {[
                    { name: "Benz Circle, Vijayawada", lat: 16.5062, lng: 80.6480, city: "Vijayawada", state: "Andhra Pradesh", pincode: "520010" },
                    { name: "One Town / KR Market", lat: 16.5165, lng: 80.6150, city: "Vijayawada", state: "Andhra Pradesh", pincode: "520001" },
                    { name: "Patamata Autonagar", lat: 16.4950, lng: 80.6650, city: "Vijayawada", state: "Andhra Pradesh", pincode: "520007" },
                    { name: "Kondapalli Fort", lat: 16.6150, lng: 80.5350, city: "NTR District", state: "Andhra Pradesh", pincode: "521228" },
                    { name: "Ibrahimpatnam", lat: 16.5890, lng: 80.5280, city: "NTR District", state: "Andhra Pradesh", pincode: "521456" },
                    { name: "Mylavaram", lat: 16.7600, lng: 80.6400, city: "NTR District", state: "Andhra Pradesh", pincode: "521230" },
                    { name: "Nandigama", lat: 16.7750, lng: 80.2900, city: "NTR District", state: "Andhra Pradesh", pincode: "521185" },
                    { name: "Jaggayyapeta", lat: 16.8920, lng: 80.0970, city: "NTR District", state: "Andhra Pradesh", pincode: "521175" },
                  ].map((hub, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLat(hub.lat);
                        setLng(hub.lng);
                        setCity(hub.city);
                        setStateName(hub.state);
                        setPincode(hub.pincode);
                        setStreet(hub.name);
                        setSearchQuery(hub.name);
                        reverseGeocode(hub.lat, hub.lng);
                      }}
                      className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-200 transition-colors shrink-0"
                    >
                      📍 {hub.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Vector Map Tile Visualization */}
              <div className="relative w-full h-52 bg-slate-900 border-2 border-emerald-600/60 rounded-2xl overflow-hidden shadow-inner group">
                {/* CartoDB Voyager Map Container */}
                <div ref={mapContainerRef} id="cartodb-map-container" className="absolute inset-0 w-full h-full z-0" />

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
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-9 h-9 rounded-lg shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                    title="Locate Current Position"
                  >
                    {isDetectingGps ? (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4 text-emerald-600" />
                    )}
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

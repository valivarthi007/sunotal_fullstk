import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { reverseGeocodeMappls } from "./mappls-sdk";

export interface UserLocation {
  city: string;
  state: string;
  country: string;
  pincode?: string;
  formattedAddress?: string;
  isDetected: boolean;
  latitude?: number;
  longitude?: number;
  source: 'geolocation' | 'ip' | 'manual';
}

interface LocationContextType {
  location: UserLocation;
  isLoading: boolean;
  error: string | null;
  detectLocation: () => Promise<UserLocation | null>;
  setManualLocation: (city: string, state?: string, pincode?: string) => void;
}

const DEFAULT_LOCATION: UserLocation = {
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  pincode: "500033",
  formattedAddress: "Hyderabad, TG, India",
  isDetected: false,
  source: "manual",
};

const STORAGE_KEY = "sunotal_user_location";

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<UserLocation>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load location from storage", e);
    }
    return DEFAULT_LOCATION;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Save to localStorage
  const saveLocation = useCallback((newLoc: UserLocation) => {
    setLocationState(newLoc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoc));
    } catch (e) {
      console.error("Failed to save location", e);
    }
  }, []);

  // IP-based fallback detection
  const detectIpLocation = useCallback(async (): Promise<UserLocation | null> => {
    try {
      const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
      if (!res.ok) throw new Error("IP API failed");
      const data = await res.json();
      
      if (data.city) {
        const ipLoc: UserLocation = {
          city: data.city,
          state: data.region || "",
          country: data.country_name || "India",
          pincode: data.postal || "",
          formattedAddress: `${data.city}, ${data.region_code || data.region || ""}`,
          isDetected: true,
          latitude: data.latitude,
          longitude: data.longitude,
          source: "ip",
        };
        saveLocation(ipLoc);
        return ipLoc;
      }
    } catch (err) {
      console.warn("IP Geolocation fallback failed:", err);
    }
    return null;
  }, [saveLocation]);

  // Reverse Geocoding via Mappls API with OpenStreetMap fallback
  const reverseGeocode = async (lat: number, lon: number): Promise<UserLocation> => {
    // 1. Primary: Mappls Reverse Geocoding API
    try {
      const mapplsData = await reverseGeocodeMappls(lat, lon);
      if (mapplsData && (mapplsData.city || mapplsData.formattedAddress)) {
        return {
          city: mapplsData.city || "Detected Location",
          state: mapplsData.state || "",
          country: "India",
          pincode: mapplsData.pincode || "",
          formattedAddress: mapplsData.formattedAddress || `${mapplsData.city}, ${mapplsData.state}`,
          isDetected: true,
          latitude: lat,
          longitude: lon,
          source: "geolocation",
        };
      }
    } catch (mapplsErr) {
      console.warn("Mappls reverse geocode error, falling back to OSM:", mapplsErr);
    }

    // 2. Secondary Fallback: Nominatim OpenStreetMap
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "SunotalCorporateECommerce/1.0",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.suburb ||
          addr.village ||
          addr.county ||
          addr.state_district ||
          "Detected Location";
        const state = addr.state || "";
        const country = addr.country || "India";
        const pincode = addr.postcode || "";

        return {
          city,
          state,
          country,
          pincode,
          formattedAddress: `${city}${state ? ", " + state : ""}`,
          isDetected: true,
          latitude: lat,
          longitude: lon,
          source: "geolocation",
        };
      }
    } catch (err) {
      console.warn("Reverse geocode failed, using coordinates", err);
    }

    return {
      city: "Detected Location",
      state: "",
      country: "India",
      isDetected: true,
      latitude: lat,
      longitude: lon,
      source: "geolocation",
    };
  };

  // Browser HTML5 Geolocation API
  const detectLocation = useCallback(async (): Promise<UserLocation | null> => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      console.warn("Browser does not support HTML5 Geolocation, using IP fallback");
      const ipResult = await detectIpLocation();
      setIsLoading(false);
      if (!ipResult) setError("Geolocation not supported by browser");
      return ipResult;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const geoLoc = await reverseGeocode(latitude, longitude);
            saveLocation(geoLoc);
            setIsLoading(false);
            resolve(geoLoc);
          } catch (err: any) {
            console.error("Geocoding error:", err);
            const ipRes = await detectIpLocation();
            setIsLoading(false);
            resolve(ipRes);
          }
        },
        async (geoErr) => {
          console.warn("HTML5 Geolocation access denied/failed:", geoErr.message);
          const ipRes = await detectIpLocation();
          setIsLoading(false);
          if (!ipRes) {
            setError("Location permission denied. Please select a city manually.");
          }
          resolve(ipRes);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, [detectIpLocation, saveLocation]);

  // Manual Location Override
  const setManualLocation = useCallback(
    (city: string, state = "", pincode = "") => {
      const manualLoc: UserLocation = {
        city,
        state,
        country: "India",
        pincode,
        formattedAddress: `${city}${state ? ", " + state : ""}`,
        isDetected: false,
        source: "manual",
      };
      saveLocation(manualLoc);
    },
    [saveLocation]
  );

  // Auto-detect on first visit if user hasn't explicitly set a location before
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      detectLocation();
    }
  }, [detectLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        detectLocation,
        setManualLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationState() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocationState must be used within a LocationProvider");
  }
  return ctx;
}

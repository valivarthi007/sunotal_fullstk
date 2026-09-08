import React, { useState, useEffect, useRef } from "react";
import { MapPin, Truck, PhoneCall, Star, Clock, ShieldCheck, RefreshCw, Navigation, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { fetchLiveTrackingTelemetry, LiveTrackingTelemetry } from "../../lib/api-client";
import { getMapProvider } from "../../lib/providers/map/map-provider.factory";

interface LiveDeliveryMapTrackerProps {
  orderId: string;
}

export const LiveDeliveryMapTracker: React.FC<LiveDeliveryMapTrackerProps> = ({ orderId }) => {
  const [telemetry, setTelemetry] = useState<LiveTrackingTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const mapProvider = getMapProvider();

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const data = await fetchLiveTrackingTelemetry(orderId);
      setTelemetry(data);
    } catch (err: any) {
      setError(err.message || "Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
    // Poll telemetry every 10 seconds for live vector updates
    const interval = setInterval(loadTelemetry, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (!telemetry || !mapContainerRef.current) return;

    mapProvider.loadSdk().then(() => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const { warehouseOrigin, customerDestination, driverLocation, driverProfile } = telemetry;
      const wLat = warehouseOrigin.lat || 12.9352;
      const wLng = warehouseOrigin.lng || 77.6245;
      const cLat = customerDestination.lat || 12.9716;
      const cLng = customerDestination.lng || 77.5946;
      const dLat = driverLocation.lat || (wLat + cLat) / 2;
      const dLng = driverLocation.lng || (wLng + cLng) / 2;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      });

      L.tileLayer(mapProvider.getTileUrl(), {
        attribution: mapProvider.getTileAttribution(),
        maxZoom: 19,
      }).addTo(map);

      // 1. Warehouse Marker
      const hubIcon = L.divIcon({
        className: "custom-hub-marker",
        html: '<div style="background:#1d4ed8;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.4)">HUB</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([wLat, wLng], { icon: hubIcon }).addTo(map).bindPopup(`<b>${warehouseOrigin.name}</b>`);

      // 2. Customer Destination Marker
      const homeIcon = L.divIcon({
        className: "custom-home-marker",
        html: '<div style="background:#059669;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.4)">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([cLat, cLng], { icon: homeIcon }).addTo(map).bindPopup("<b>Delivery Address</b>");

      // 3. Driver Location Marker
      const driverIcon = L.divIcon({
        className: "custom-driver-marker",
        html: '<div style="background:#f59e0b;color:black;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">🛵</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([dLat, dLng], { icon: driverIcon }).addTo(map).bindPopup(`<b>${driverProfile.name} (EV Driver)</b>`).openPopup();

      // 4. Route Polyline
      L.polyline([[wLat, wLng], [dLat, dLng], [cLat, cLng]], {
        color: "#10b981",
        weight: 5,
        dashArray: "8, 8",
      }).addTo(map);

      // Fit bounds
      const bounds = L.latLngBounds([[wLat, wLng], [cLat, cLng], [dLat, dLng]]);
      map.fitBounds(bounds, { padding: [40, 40] });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [telemetry]);

  if (loading && !telemetry) {
    return (
      <div className="p-8 border rounded-3xl bg-card text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground">Connecting to Live GPS Driver Telemetry...</p>
      </div>
    );
  }

  if (error || !telemetry) {
    return (
      <div className="p-6 border rounded-3xl bg-card text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-xs font-semibold">Live GPS Tracker Unavailable</p>
        <p className="text-[11px] text-muted-foreground">Standard 2-Hour Express Delivery in progress.</p>
      </div>
    );
  }

  const { warehouseOrigin, customerDestination, driverLocation, etaMinutes, remainingDistanceKm, driverProfile } = telemetry;

  return (
    <div className="border rounded-3xl bg-card overflow-hidden shadow-lg space-y-0 border-emerald-600/30">
      {/* Top Banner */}
      <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-800/80 flex items-center justify-center text-emerald-300 font-bold">
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-300 font-bold tracking-wider uppercase">Live Delivery Tracking</span>
            <h3 className="font-extrabold text-base text-white">Driver Arriving in {etaMinutes} Mins</h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-emerald-300 font-mono">{remainingDistanceKm} km remaining</span>
          <p className="text-[11px] text-emerald-400 font-semibold">{driverLocation.speedKmh} km/h • Speed</p>
        </div>
      </div>

      {/* Interactive Map Tile Visualization */}
      <div className="relative w-full h-72 bg-slate-950 overflow-hidden group">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Live Status Badge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 z-10 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Live GPS Telemetry Active
        </div>
      </div>

      {/* Driver Partner Contact Card */}
      <div className="p-5 bg-card flex items-center justify-between gap-4 border-t">
        <div className="flex items-center gap-3">
          <img
            src={driverProfile.photo}
            alt={driverProfile.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-600 shadow"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-foreground">{driverProfile.name}</h4>
              <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                <Star className="w-3 h-3 fill-amber-500 mr-0.5" /> {driverProfile.rating}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Vehicle: <strong className="text-foreground">{driverProfile.vehicleNo}</strong> • {driverProfile.deliveriesCompleted}+ deliveries
            </p>
          </div>
        </div>

        <a href={`tel:${driverProfile.phone}`}>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
            <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> Call Driver
          </Button>
        </a>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { MapPin, Truck, PhoneCall, Star, Clock, ShieldCheck, RefreshCw, Navigation, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { fetchLiveTrackingTelemetry, LiveTrackingTelemetry } from "../../lib/api-client";

interface LiveDeliveryMapTrackerProps {
  orderId: string;
}

export const LiveDeliveryMapTracker: React.FC<LiveDeliveryMapTrackerProps> = ({ orderId }) => {
  const [telemetry, setTelemetry] = useState<LiveTrackingTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="relative w-full h-64 bg-slate-950 overflow-hidden group">
        {/* Simulated OSM Grid */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Route Line Vector */}
        <div className="absolute top-1/2 left-8 right-8 h-2 bg-emerald-500/40 rounded-full -rotate-6 transform scale-105">
          <div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{ width: "65%" }} />
        </div>

        {/* Warehouse Origin Pin */}
        <div className="absolute top-1/3 left-10 flex flex-col items-center">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white text-xs font-bold">
            HUB
          </div>
          <span className="text-[9px] font-bold text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded mt-1 shadow">
            {warehouseOrigin.name.split(" ")[0]}
          </span>
        </div>

        {/* Customer Destination Pin */}
        <div className="absolute bottom-1/3 right-10 flex flex-col items-center">
          <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white text-xs font-bold">
            <MapPin className="w-4 h-4 fill-white text-emerald-600" />
          </div>
          <span className="text-[9px] font-bold text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded mt-1 shadow">
            You ({customerDestination.city})
          </span>
        </div>

        {/* Animated Moving Driver Pin */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-full shadow-2xl border-2 border-white flex items-center justify-center">
            <Truck className="w-6 h-6 fill-slate-950" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-950 bg-amber-400 px-2 py-0.5 rounded-full shadow mt-1">
            {driverProfile.name.split(" ")[0]} (EV)
          </span>
        </div>

        {/* Live Status Badge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5">
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

import React, { useState, useEffect } from 'react';
import { X, Navigation, MapPin, CheckCircle, Clock, ShieldCheck, PhoneCall, PackageCheck } from 'lucide-react';

interface LiveOrderTrackingMapModalProps {
  order: any;
  onClose: () => void;
}

export const LiveOrderTrackingMapModal: React.FC<LiveOrderTrackingMapModalProps> = ({ order, onClose }) => {
  const [riderProgress, setRiderProgress] = useState(35); // percentage along route
  const [etaMinutes, setEtaMinutes] = useState(7);

  useEffect(() => {
    const timer = setInterval(() => {
      setRiderProgress((prev) => {
        if (prev >= 95) return 95;
        const next = prev + 5;
        setEtaMinutes(Math.max(1, Math.ceil((100 - next) / 12)));
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 animate-pulse">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Live Rider GPS Telemetry
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  SUB-10 MIN ETA
                </span>
              </h3>
              <p className="text-xs text-slate-400">Order #{order?.orderNumber || order?.id || 'ORD-2026'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Canvas / Simulated Visualizer */}
        <div className="relative h-64 bg-slate-950 overflow-hidden border-b border-slate-800">
          {/* Grid Background Lines */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Route Path Line */}
          <svg className="absolute inset-0 w-full h-full">
            <path
              d="M 60 180 Q 200 40 500 120"
              fill="none"
              stroke="#059669"
              strokeWidth="4"
              strokeDasharray="8 8"
              className="animate-[dash_20s_linear_infinite]"
            />
          </svg>

          {/* Dark Store Hub Marker */}
          <div className="absolute left-[50px] top-[150px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="p-2 bg-amber-500/20 border border-amber-500 text-amber-400 rounded-xl shadow-lg shadow-amber-500/10">
              <PackageCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded-md mt-1 border border-slate-800">
              Dark Store Hub #01
            </span>
          </div>

          {/* Animated Rider Marker */}
          <div
            className="absolute transition-all duration-1000 ease-out -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${50 + (riderProgress / 100) * 450}px`,
              top: `${150 - Math.sin((riderProgress / 100) * Math.PI) * 80}px`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-2 bg-emerald-500/30 rounded-full animate-ping" />
              <div className="p-2.5 bg-emerald-500 text-slate-950 font-bold rounded-full shadow-xl shadow-emerald-500/50">
                <Navigation className="w-5 h-5 rotate-45" />
              </div>
            </div>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg">
              Rider En-Route ({etaMinutes}m)
            </div>
          </div>

          {/* Customer Destination Pin */}
          <div className="absolute left-[510px] top-[100px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="p-2 bg-sky-500/20 border border-sky-500 text-sky-400 rounded-xl shadow-lg shadow-sky-500/10">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-sky-300 bg-slate-900/90 px-2 py-0.5 rounded-md mt-1 border border-slate-800">
              Delivery Address
            </span>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="p-4 grid grid-cols-3 gap-3 bg-slate-900/50 border-b border-slate-800">
          <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Estimated ETA</div>
              <div className="text-lg font-extrabold text-emerald-400">{etaMinutes} Minutes</div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Temperature Safeguard</div>
              <div className="text-sm font-bold text-slate-200">Cold-Chain Insulated</div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Handover OTP</div>
              <div className="text-lg font-mono font-extrabold text-amber-400">4892</div>
            </div>
          </div>
        </div>

        {/* Footer Rider Action Bar */}
        <div className="p-4 bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-emerald-400">
              RA
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">Rahul Anand</div>
              <div className="text-xs text-slate-400">Sunotal Flash Rider • 4.95 ★</div>
            </div>
          </div>

          <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20">
            <PhoneCall className="w-4 h-4" /> Call Delivery Rider
          </button>
        </div>
      </div>
    </div>
  );
};

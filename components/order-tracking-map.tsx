'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { Loader2, Timer, Home } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

type Location = {
  lat: number;
  lng: number;
};

interface OrderTrackingProps {
  orderId: string;
  customerLocation: Location;
}

// Custom icons using Leaflet's divIcon
const customerIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div style={{ 
      width: '32px', height: '32px', backgroundColor: '#ef4444', borderRadius: '50%', border: '3px solid white', 
      boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' 
    }}>
      <Home style={{ width: '16px', height: '16px' }} />
    </div>
  ),
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16], // Center
});

const riderIcon = L.divIcon({
  html: `<div style="position: relative; display: flex; align-items: center; justify-content: center;">
           <div style="position: absolute; width: 32px; height: 32px; background-color: #3b82f6; border-radius: 50%; opacity: 0.6; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
           <div style="position: relative; width: 32px; height: 32px; background-color: #2563eb; border-radius: 50%; border: 3px solid white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; z-index: 10;">
              🛵
           </div>
         </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16], // Center
});

// A component to beautifully pan when the rider moves
function UpdateMapCenter({ location }: { location: Location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], map.getZoom(), {
        animate: true,
        duration: 1.5 // 1.5 seconds smooth transition
      });
    }
  }, [location, map]);
  return null;
}

export default function OrderTrackingMap({ orderId, customerLocation }: OrderTrackingProps) {
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [routeData, setRouteData] = useState<{ path: [number, number][], etaText: string } | null>(null);

  useEffect(() => {
    // 1. Fetch Initial Location
    const fetchInitialLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('order_tracking')
          .select('lat, lng')
          .eq('order_id', orderId)
          .single();
          
        if (error && error.code !== 'PGRST116') {
             console.error("Error fetching location:", error.message || error.details || JSON.stringify(error));
         }
        if (data) setRiderLocation({ lat: data.lat, lng: data.lng });
      } catch (err) {
          console.error("Failed to fetch location", err);
      }
    };

    fetchInitialLocation();

    // 2. Subscribe to Supabase Realtime Updates
    const channel = supabase
      .channel(`tracking_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_tracking',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setRiderLocation({
            lat: payload.new.lat,
            lng: payload.new.lng,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    if (!riderLocation || !customerLocation || !customerLocation.lat || !customerLocation.lng) return;
    
    let isCancelled = false;
    const fetchRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${riderLocation.lng},${riderLocation.lat};${customerLocation.lng},${customerLocation.lat}?overview=full&geometries=geojson`);
        const data = await res.json();
        
        if (data.code === 'Ok' && !isCancelled) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const dt = data.routes[0].duration; // in seconds
          
          let etaText = "";
          if (dt < 60) etaText = "Arriving soon";
          else if (dt < 3600) etaText = `${Math.ceil(dt / 60)} mins`;
          else if (dt < 86400) {
             const h = Math.floor(dt / 3600);
             const m = Math.ceil((dt % 3600) / 60);
             etaText = `${h}h ${m}m`;
          } else {
             const d = Math.floor(dt / 86400);
             etaText = `${d} days`;
          }
          
          setRouteData({ path: coords, etaText });
        }
      } catch (err) {
        console.error("Failed to fetch route", err);
      }
    };

    fetchRoute();
    const interval = setInterval(fetchRoute, 15000); // Poll every 15s to update ETA and route
    
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [riderLocation?.lat, riderLocation?.lng, customerLocation.lat, customerLocation.lng]);

  return (
    <div className="w-full h-full relative overflow-hidden isolate z-0">
      {typeof window !== 'undefined' && (
        <MapContainer
          center={[customerLocation.lat, customerLocation.lng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Customer Location Marker */}
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon} />

          {/* Dynamic Rider Location Marker & Route */}
          {riderLocation && (
            <>
              <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon} />
              <UpdateMapCenter location={riderLocation} />
              {routeData && (
                <Polyline positions={routeData.path} color="#3b82f6" weight={4} dashArray="8, 8" opacity={0.8} />
              )}
            </>
          )}
        </MapContainer>
      )}
      
      {!riderLocation && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-[#0a0a0b]/90 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-500 pointer-events-none" style={{ zIndex: 1000}}>
              <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-primary animate-ping absolute inset-0" />
                  <div className="h-2 w-2 rounded-full bg-primary relative" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Initializing Telemetry...</span>
          </div>
      )}
      
      {routeData && riderLocation && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-[#0a0a0b]/90 backdrop-blur-2xl px-8 py-5 rounded-[2rem] border border-white/10 flex flex-col items-center shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-8 duration-700 pointer-events-none min-w-[220px]" style={{ zIndex: 1000}}>
              <div className="flex items-center gap-4">
                 <div className="flex items-center justify-center p-2.5 bg-blue-500/20 rounded-2xl ring-1 ring-blue-500/30">
                    <Timer className="w-6 h-6 text-blue-400" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">{routeData.etaText}</span>
                    <span className="text-[9px] uppercase font-black text-blue-400/80 tracking-[0.25em] mt-1.5">Live Arrival</span>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
}

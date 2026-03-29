"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Crosshair } from "lucide-react";

type Location = {
    lat: number;
    lng: number;
};

interface LocationPickerProps {
    onLocationSelect: (location: Location) => void;
    onAddressResolve?: (address: string) => void;
    defaultLocation?: Location;
}

const pinIcon = L.divIcon({
    html: `<div style="position: relative; display: flex; align-items: center; justify-content: center;">
             <div style="position: absolute; width: 40px; height: 40px; background-color: #ef4444; border-radius: 50%; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
             <div style="position: relative; width: 24px; height: 24px; background-color: #ef4444; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; z-index: 10;">
                <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
             </div>
           </div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Helper component to center map and handle dragging
function MapController({ 
    position, 
    setPosition, 
    onLocationSelect 
}: { 
    position: Location | null; 
    setPosition: (pos: Location) => void;
    onLocationSelect: (pos: Location) => void;
}) {
    const map = useMap();

    useMapEvents({
        click(e) {
            const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
            setPosition(newPos);
            onLocationSelect(newPos);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo([position.lat, position.lng], map.getZoom(), { animate: true });
        }
    }, [position, map]);

    return null;
}

export default function LocationPicker({ onLocationSelect, onAddressResolve, defaultLocation }: LocationPickerProps) {
    const [position, setPosition] = useState<Location | null>(defaultLocation || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [address, setAddress] = useState<string>("");
    const [errorMsg, setErrorMsg] = useState("");

    const resolveAddress = async (lat: number, lng: number) => {
        setIsResolving(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'en' }
            });
            const data = await res.json();
            const resolved = data.display_name || "Unknown Location";
            setAddress(resolved);
            if (onAddressResolve) onAddressResolve(resolved);
        } catch (err) {
            console.error("Geocoding failed:", err);
            setAddress("Location details unavailable");
        } finally {
            setIsResolving(false);
        }
    };

    const handleLocationUpdate = (newPos: Location) => {
        setPosition(newPos);
        onLocationSelect(newPos);
        resolveAddress(newPos.lat, newPos.lng);
    };

    // Initial default layout somewhere in PH (or let's say a generic center if null)
    const initialCenter: [number, number] = defaultLocation 
        ? [defaultLocation.lat, defaultLocation.lng] 
        : [12.8797, 121.7740]; // Philippines Center

    const locateUser = () => {
        setIsLoading(true);
        setErrorMsg("");

        if (!navigator.geolocation) {
            setErrorMsg("Geolocation is not supported by your browser");
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newPos = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
                handleLocationUpdate(newPos);
                setIsLoading(false);
            },
            (err) => {
                setErrorMsg("Unable to retrieve your location. Please ensure location permissions are enabled.");
                setIsLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // Auto-locate once if no default is provided
    useEffect(() => {
        if (!defaultLocation) {
             locateUser();
        } else {
             resolveAddress(defaultLocation.lat, defaultLocation.lng);
        }
    }, []);

    return (
        <div className="relative w-full h-[250px] rounded-xl overflow-hidden border border-border group">
            {typeof window !== "undefined" && (
                <MapContainer
                    center={initialCenter}
                    zoom={defaultLocation ? 16 : 6}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%", zIndex: 1 }}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    {position && (
                        <Marker 
                            position={[position.lat, position.lng]} 
                            icon={pinIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const marker = e.target;
                                    const loc = marker.getLatLng();
                                    const newPos = { lat: loc.lat, lng: loc.lng };
                                    handleLocationUpdate(newPos);
                                }
                            }}
                        />
                    )}
                    <MapController position={position} setPosition={setPosition} onLocationSelect={handleLocationUpdate} />
                </MapContainer>
            )}

            {/* Floating UI Elements over Map */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 z-[1000] sticky">
                <button 
                    onClick={locateUser}
                    className="pointer-events-auto bg-background/90 backdrop-blur-md p-2.5 rounded-xl border border-border shadow-xl hover:bg-muted transition-all active:scale-95 flex items-center justify-center text-primary"
                    title="Find My Location"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                </button>
            </div>


            {errorMsg && (
                <div className="absolute bottom-2 left-2 right-2 bg-destructive/90 backdrop-blur-md text-destructive-foreground px-3 py-2 rounded-lg text-xs font-semibold" style={{ zIndex: 1000}}>
                    {errorMsg}
                </div>
            )}
            
            {/* Target Reticle visually guiding the center */}
            {!position && !isLoading && (
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ zIndex: 1000}}>
                     <Crosshair className="w-6 h-6 text-foreground/50" />
                 </div>
            )}
        </div>
    );
}

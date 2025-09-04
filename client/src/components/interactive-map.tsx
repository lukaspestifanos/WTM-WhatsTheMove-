import { useEffect, useRef } from "react";
import L from "leaflet";

interface Event {
  id: string;
  title: string;
  latitude?: number;
  longitude?: number;
  category: string;
}

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number } | null;
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export default function InteractiveMap({ userLocation, events, onEventClick }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const getCategoryEmoji = (category: string) => {
    const emojis = {
      parties: "🎉",
      study: "📚",
      sports: "🏀",
      concerts: "🎵",
      social: "🎤",
      restaurants: "🍽️",
      food: "🍔",
      nightlife: "🌃",
    };
    return emojis[category as keyof typeof emojis] || "🎉";
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map with dark theme
    const map = L.map(mapRef.current, {
      zoomControl: false, // Disable +/- zoom controls, pinch-to-zoom still works
      attributionControl: false,
    });

    // Light mode tile layer for better UI contrast
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    // Set initial view
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 13);
    } else {
      map.setView([39.1265, -84.5046], 13); // Default to Cincinnati
    }

    mapInstanceRef.current = map;

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    // Create custom user location icon
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div class="relative">
               <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
               <div class="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75"></div>
               <div class="absolute inset-0.5 w-3 h-3 bg-blue-600 rounded-full"></div>
             </div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapInstanceRef.current);

    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userMarker);
      }
    };
  }, [userLocation]);

  // Update event markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // Add event markers
    events.forEach((event) => {
      if (event.latitude && event.longitude) {
        const eventIcon = L.divIcon({
          className: 'event-marker',
          html: `<div class="w-8 h-8 bg-white rounded-full border-2 border-gray-300 shadow-lg hover:scale-125 transition-all duration-200 cursor-pointer z-50 flex items-center justify-center">
                   <span class="text-xl">${getCategoryEmoji(event.category)}</span>
                   <div class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([event.latitude, event.longitude], { icon: eventIcon })
          .addTo(mapInstanceRef.current!)
          .on('click', (e) => {
            e.originalEvent?.stopPropagation();
            onEventClick(event.id);
          });

        // Add popup with event info
        marker.bindPopup(`
          <div class="text-sm font-medium text-gray-900">${event.title}</div>
          <div class="text-xs text-gray-600 capitalize">${event.category}</div>
        `);

        markersRef.current.push(marker);
      }
    });
  }, [events, onEventClick]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full relative z-0"
      data-testid="interactive-map"
    />
  );
}
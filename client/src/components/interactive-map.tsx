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

  const getCategoryColor = (category: string) => {
    const colors = {
      parties: "#ec4899",
      study: "#10b981", 
      sports: "#f59e0b",
      concerts: "#8b5cf6",
      social: "#3b82f6",
      restaurants: "#ef4444",
    };
    return colors[category as keyof typeof colors] || colors.social;
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map with dark theme
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    });

    // Dark mode tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
      html: '<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg"><div class="absolute inset-1 bg-blue-300 rounded-full animate-pulse"></div></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
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
          html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform cursor-pointer" style="background-color: ${getCategoryColor(event.category)}">
                   <div class="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                 </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([event.latitude, event.longitude], { icon: eventIcon })
          .addTo(mapInstanceRef.current!)
          .on('click', () => onEventClick(event.id));

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
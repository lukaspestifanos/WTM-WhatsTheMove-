import { useEffect, useRef } from "react";

interface Event {
  id: string;
  title: string;
  latitude?: number;
  longitude?: number;
  category: string;
}

interface MapViewProps {
  userLocation: { lat: number; lng: number } | null;
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export default function MapView({ userLocation, events, onEventClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const getCategoryColor = (category: string) => {
    const colors = {
      parties: "bg-pink-500",
      study: "bg-emerald-500",
      sports: "bg-amber-500",
      concerts: "bg-purple-500",
      social: "bg-blue-500",
    };
    return colors[category as keyof typeof colors] || colors.social;
  };

  // Simulate map markers with positioned divs
  const getMarkerPosition = (index: number) => {
    const positions = [
      { top: "16%", left: "20%" },
      { top: "32%", right: "20%" },
      { bottom: "35%", left: "25%" },
      { top: "40%", left: "50%" },
      { top: "25%", right: "35%" },
      { bottom: "45%", right: "30%" },
    ];
    return positions[index % positions.length];
  };

  return (
    <div 
      ref={mapRef}
      className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
          radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 1px, transparent 1px),
          radial-gradient(circle at 40% 60%, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px, 60px 60px, 80px 80px",
      }}
      data-testid="map-container"
    >
      {/* Map placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-center opacity-20">
          <i className="fas fa-map-marked-alt text-6xl mb-4"></i>
          <p className="text-lg font-medium">Interactive Map</p>
        </div>
      </div>

      {/* User location marker */}
      {userLocation && (
        <div 
          className="absolute w-6 h-6 bg-white rounded-full shadow-lg border-4 border-blue-500 z-10"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          data-testid="marker-user-location"
        >
          <div className="absolute inset-1 bg-blue-500 rounded-full"></div>
        </div>
      )}

      {/* Event markers */}
      {events.slice(0, 6).map((event, index) => (
        <button
          key={event.id}
          onClick={() => onEventClick(event.id)}
          className={`absolute w-4 h-4 ${getCategoryColor(event.category)} rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform z-20`}
          style={getMarkerPosition(index)}
          data-testid={`marker-event-${event.id}`}
        >
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </button>
      ))}
    </div>
  );
}

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      city: { name: string };
      state?: { stateCode: string };
      location?: { latitude: string; longitude: string };
      address?: { line1: string };
    }>;
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  classifications?: Array<{
    genre?: { name: string };
    segment?: { name: string };
  }>;
}

interface SearchOptions {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
}

class TicketmasterService {
  private apiKey: string;
  private baseUrl = "https://app.ticketmaster.com/discovery/v2";

  constructor() {
    this.apiKey = process.env.TICKETMASTER_API_KEY || process.env.VITE_TICKETMASTER_API_KEY || "OatWZ5V1ZeIKi58oOAitKRTvlrcKr5NA";
    if (!this.apiKey) {
      console.warn("Ticketmaster API key not provided. Event search will be limited.");
    }
  }

  async searchEventsByLocation(
    latitude: number,
    longitude: number,
    radius: number = 50,
    options: SearchOptions = {}
  ) {
    if (!this.apiKey) {
      return [];
    }

    try {
      // Set date range - concerts should show far in advance, parties more recent
      const now = new Date();
      const startDate = options.startDate || now.toISOString().split('T')[0];
      
      let endDate = options.endDate;
      if (!endDate) {
        const months = options.category === 'concerts' ? 12 : 3; // 12 months for concerts, 3 for others
        const futureDate = new Date(now);
        futureDate.setMonth(futureDate.getMonth() + months);
        endDate = futureDate.toISOString().split('T')[0];
      }

      const params = new URLSearchParams({
        apikey: this.apiKey,
        latlong: `${latitude},${longitude}`,
        radius: radius.toString(),
        unit: "miles",
        size: "100",
        sort: "date,asc",
        startDateTime: `${startDate}T00:00:00Z`,
        endDateTime: `${endDate}T23:59:59Z`,
      });

      if (options.keyword) {
        params.append("keyword", options.keyword);
      }

      // Map categories to Ticketmaster classifications
      if (options.category) {
        const categoryMap: Record<string, string> = {
          parties: "music",
          concerts: "music", 
          sports: "sports",
          social: "miscellaneous",
          restaurants: "miscellaneous",
        };
        
        const classification = categoryMap[options.category.toLowerCase()];
        if (classification) {
          params.append("classificationName", classification);
        }
      } else {
        // If no category specified, get ALL types of events for more scrollable content
        params.append("classificationName", "music,sports,arts,miscellaneous,film");
      }

      const response = await fetch(`${this.baseUrl}/events.json?${params}`);
      
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data._embedded?.events) {
        return [];
      }

      return data._embedded.events.map((event: TicketmasterEvent) => this.transformEvent(event));
    } catch (error) {
      console.error("Error fetching Ticketmaster events:", error);
      return [];
    }
  }

  private transformEvent(event: TicketmasterEvent) {
    const venue = event._embedded?.venues?.[0];
    const priceRange = event.priceRanges?.[0];
    const image = event.images?.find(img => img.width >= 300)?.url || event.images?.[0]?.url;

    return {
      id: event.id,
      title: event.name,
      description: `Official ${event.classifications?.[0]?.segment?.name || 'Event'}`,
      category: this.mapCategory(event.classifications?.[0]?.segment?.name),
      startDate: event.dates.start.dateTime || `${event.dates.start.localDate}T${event.dates.start.localTime || '20:00:00'}`,
      location: venue?.name || "TBA",
      latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
      longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
      price: priceRange?.min || 0,
      imageUrl: image,
      externalId: event.id,
      externalSource: "ticketmaster",
      venueName: venue?.name,
      url: event.url,
      city: venue?.city?.name,
      state: venue?.state?.stateCode,
      address: venue?.address?.line1,
    };
  }

  private mapCategory(segment?: string): string {
    if (!segment) return "social";
    
    const categoryMap: Record<string, string> = {
      music: "concerts",
      sports: "sports", 
      "arts & theatre": "social",
      arts: "social",
      film: "social",
      miscellaneous: "social",
    };
    
    return categoryMap[segment.toLowerCase()] || "social";
  }
}

export const ticketmasterService = new TicketmasterService();

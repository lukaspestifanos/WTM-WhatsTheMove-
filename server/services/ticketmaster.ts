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
  accessibility?: {
    info: string;
  };
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
      // Use current UTC time to ensure we don't show past events
      // Remove milliseconds for Ticketmaster API (requires YYYY-MM-DDTHH:mm:ssZ format)
      const startDate = options.startDate || now.toISOString().split('.')[0] + 'Z';
      
      let endDate = options.endDate;
      if (!endDate) {
        const months = options.category === 'concerts' ? 12 : 3; // 12 months for concerts, 3 for others
        const futureDate = new Date(now);
        futureDate.setMonth(futureDate.getMonth() + months);
        futureDate.setHours(23, 59, 59, 0); // Set to 0 milliseconds
        endDate = futureDate.toISOString().split('.')[0] + 'Z'; // Remove milliseconds
      }

      const params = new URLSearchParams({
        apikey: this.apiKey,
        latlong: `${latitude},${longitude}`,
        radius: radius.toString(),
        unit: "miles",
        size: "100",
        sort: "date,asc",
        startDateTime: startDate.includes('T') ? startDate : `${startDate}T00:00:00Z`,
        endDateTime: endDate.includes('T') ? endDate : `${endDate}T23:59:59Z`,
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

      const url = `${this.baseUrl}/events.json?${params}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ticketmaster API error: ${response.status} - ${response.statusText}`);
        throw new Error(`Ticketmaster API error: ${response.status} - ${errorText}`);
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

  private cleanTitle(title: string): string {
    // Remove presenter information (e.g., "artist presents:" or "venue presents:")
    let cleaned = title.replace(/^[^:]+\s+presents:\s*/i, '');
    
    // Remove bio/description after colons if it's longer than the main title
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex > 0) {
      const beforeColon = cleaned.substring(0, colonIndex).trim();
      const afterColon = cleaned.substring(colonIndex + 1).trim();
      
      // If the part after colon is much longer, it's probably bio text
      if (afterColon.length > beforeColon.length * 1.5) {
        cleaned = beforeColon;
      }
    }
    
    // Remove common descriptive phrases
    cleaned = cleaned.replace(/\s*-\s*(official|live|tour|concert|show).*$/i, '');
    
    return cleaned.trim();
  }

  private transformEvent(event: TicketmasterEvent) {
    const venue = event._embedded?.venues?.[0];
    const image = event.images?.find(img => img.width >= 300)?.url || event.images?.[0]?.url;
    
    // Enhanced price extraction logic with range support
    let minPrice = 0;
    let maxPrice = 0;
    
    if (event.priceRanges && event.priceRanges.length > 0) {
      // Extract all valid price ranges
      const validPrices = event.priceRanges
        .filter(range => range.min && range.min > 0)
        .flatMap(range => [range.min, range.max].filter(p => p && p > 0));
      
      if (validPrices.length > 0) {
        minPrice = Math.min(...validPrices);
        maxPrice = Math.max(...validPrices);
      }
    }
    
    // If no price ranges, check for other pricing fields that might be available
    if (minPrice === 0 && event.accessibility?.info?.includes('$')) {
      // Sometimes pricing info is in accessibility info
      const priceMatch = event.accessibility.info.match(/\$(\d+(?:\.\d{2})?)/);
      if (priceMatch) {
        minPrice = maxPrice = parseFloat(priceMatch[1]);
      }
    }

    return {
      id: event.id,
      title: this.cleanTitle(event.name),
      description: `Official ${event.classifications?.[0]?.segment?.name || 'Event'}`,
      category: this.mapCategory(event.classifications?.[0]?.segment?.name),
      startDate: event.dates.start.dateTime || `${event.dates.start.localDate}T${event.dates.start.localTime || '20:00:00'}`,
      location: venue?.name || "TBA",
      latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
      longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
      price: minPrice, // Keep for backward compatibility
      minPrice: minPrice,
      maxPrice: maxPrice,
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

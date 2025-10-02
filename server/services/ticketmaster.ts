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

interface ProcessedEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  price: number;
  minPrice: number;
  maxPrice: number;
  imageUrl?: string;
  externalId: string;
  externalSource: "ticketmaster";
  venueName?: string;
  url: string; // Main URL field for frontend
  ticketUrl: string;
  webUrl: string;
  mobileAppUrl?: string;
  city?: string;
  state?: string;
  address?: string;
}

class TicketmasterService {
  private apiKey: string;
  private baseUrl = "https://app.ticketmaster.com/discovery/v2";
  private debugMode = true;

  constructor() {
    this.apiKey = 
      process.env.REACT_APP_TICKETMASTER_API_KEY || 
      process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || 
      process.env.VITE_TICKETMASTER_API_KEY || 
      process.env.TICKETMASTER_API_KEY || 
      "OatWZ5V1ZeIKi58oOAitKRTvlrcKr5NA";

    if (this.debugMode) {
      console.log("=== Ticketmaster Service Debug Info ===");
      console.log("API Key status:", this.apiKey ? `Present (${this.apiKey.substring(0, 5)}...)` : "Missing");
    }

    if (!this.apiKey) {
      console.error("No Ticketmaster API key found in any environment variable!");
    }
  }

  // FIXED: Improved URL generation with working fallback
  private generateTicketUrls(event: TicketmasterEvent): {
    ticketUrl: string;
    webUrl: string;
    mobileAppUrl?: string;
  } {
    // Clean and validate the original URL from Ticketmaster API
    let originalUrl = event.url;
    if (originalUrl && !originalUrl.startsWith('http')) {
      originalUrl = 'https://' + originalUrl;
    }

    // If we have a valid Ticketmaster URL from API, use it
    if (originalUrl && this.isValidTicketmasterUrl(originalUrl)) {
      return {
        ticketUrl: originalUrl,
        webUrl: originalUrl,
        mobileAppUrl: undefined,
      };
    }

    // FIXED: Use search fallback instead of broken /event/{id} URL
    const eventName = encodeURIComponent(event.name.replace(/[^a-zA-Z0-9\s]/g, '').trim());
    const fallbackUrl = `https://www.ticketmaster.com/search?q=${eventName}`;

    if (this.debugMode) {
      console.warn(`Using fallback search URL for event: ${event.name}`);
    }

    return {
      ticketUrl: fallbackUrl,
      webUrl: fallbackUrl,
      mobileAppUrl: undefined,
    };
  }

  // Validate Ticketmaster URLs
  private isValidTicketmasterUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validDomains = [
        'ticketmaster.com',
        'www.ticketmaster.com',
        'concerts.ticketmaster.com',
        'app.ticketmaster.com'
      ];

      return validDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }


  async searchEventsByLocation(
    latitude: number,
    longitude: number,
    radius: number = 50,
    options: SearchOptions = {}
  ): Promise<ProcessedEvent[]> {
    if (!this.apiKey) {
      console.error("Cannot fetch events: No API key available");
      return [];
    }

    try {
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.error("Invalid coordinates:", { latitude, longitude });
        return [];
      }

      const now = new Date();
      const startDateTime = options.startDate || this.formatDateForAPI(now);

      let endDateTime: string;
      if (options.endDate) {
        endDateTime = options.endDate.includes('T') 
          ? options.endDate 
          : `${options.endDate}T23:59:59Z`;
      } else {
        const months = options.category === 'concerts' ? 12 : 3;
        const futureDate = new Date(now);
        futureDate.setMonth(futureDate.getMonth() + months);
        endDateTime = this.formatDateForAPI(futureDate, true);
      }

      const params = new URLSearchParams({
        apikey: this.apiKey,
        latlong: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        radius: radius.toString(),
        unit: "miles",
        size: "200",
        sort: "date,asc",
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        includeTBA: "no",
        includeTBD: "no",
        includeTest: "no",
      });

      if (options.keyword) {
        params.append("keyword", options.keyword);
      }

      if (options.category) {
        const categoryMap: Record<string, string> = {
          parties: "Music",
          concerts: "Music", 
          sports: "Sports",
          social: "Arts & Theatre,Miscellaneous",
          restaurants: "Miscellaneous",
        };

        const classification = categoryMap[options.category.toLowerCase()];
        if (classification) {
          params.append("classificationName", classification);
        }
      }

      const url = `${this.baseUrl}/events.json?${params}`;

      if (this.debugMode) {
        console.log("API Request Details:");
        console.log("- Coordinates:", `${latitude}, ${longitude}`);
        console.log("- Radius:", `${radius} miles`);
        console.log("- Date range:", `${startDateTime} to ${endDateTime}`);
        console.log("- Category:", options.category || "all");
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);

        if (response.status === 401) {
          console.error("Invalid API key. Please check your environment variables.");
        } else if (response.status === 429) {
          console.error("Rate limit exceeded. Try again later.");
        } else if (response.status === 503) {
          console.error("Ticketmaster service unavailable.");
        }

        return [];
      }

      const data = await response.json();

      if (this.debugMode) {
        console.log("API Response received:");
        console.log("- Total events found:", data.page?.totalElements || 0);
        console.log("- Events in response:", data._embedded?.events?.length || 0);
      }

      if (!data._embedded?.events || data._embedded.events.length === 0) {
        console.warn("No events found for the given criteria");
        return [];
      }

      const transformedEvents = data._embedded.events
        .map((event: TicketmasterEvent) => this.transformEvent(event))
        .filter((event: ProcessedEvent) => {
          // Filter out events with invalid data
          if (!event.latitude || !event.longitude) {
            if (this.debugMode) {
              console.warn(`Skipping event without coordinates: ${event.title}`);
            }
            return false;
          }

          // Validate that we have working URLs
          if (!event.ticketUrl && !event.webUrl) {
            if (this.debugMode) {
              console.warn(`Skipping event without valid URLs: ${event.title}`);
            }
            return false;
          }

          return true;
        });

      if (this.debugMode) {
        console.log(`Successfully processed ${transformedEvents.length} events with valid data`);
      }

      return transformedEvents;

    } catch (error) {
      console.error("Error fetching Ticketmaster events:", error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error("Network error - check internet connection or CORS settings");
      } else if (error instanceof SyntaxError) {
        console.error("JSON parsing error - API response may be malformed");
      }

      return [];
    }
  }

  private formatDateForAPI(date: Date, isEndDate: boolean = false): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (isEndDate) {
      return `${year}-${month}-${day}T23:59:59Z`;
    } else {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    }
  }

  private cleanTitle(title: string): string {
    let cleaned = title.replace(/^[^:]+\s+presents:\s*/i, '');

    const colonIndex = cleaned.indexOf(':');
    if (colonIndex > 0) {
      const beforeColon = cleaned.substring(0, colonIndex).trim();
      const afterColon = cleaned.substring(colonIndex + 1).trim();

      if (afterColon.length > beforeColon.length * 1.5) {
        cleaned = beforeColon;
      }
    }

    cleaned = cleaned.replace(/\s*-\s*(official|live|tour|concert|show).*$/i, '');

    return cleaned.trim();
  }

  private transformEvent(event: TicketmasterEvent): ProcessedEvent {
    const venue = event._embedded?.venues?.[0];

    const image = event.images?.find(img => img.width >= 500)?.url || 
                  event.images?.find(img => img.width >= 300)?.url || 
                  event.images?.[0]?.url;

    let minPrice = 0;
    let maxPrice = 0;

    if (event.priceRanges && event.priceRanges.length > 0) {
      const validPrices = event.priceRanges
        .filter(range => range && range.min > 0)
        .flatMap(range => [range.min, range.max].filter(p => p && p > 0));

      if (validPrices.length > 0) {
        minPrice = Math.min(...validPrices);
        maxPrice = Math.max(...validPrices);
      }
    }

    const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
    const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

    let eventDateTime: string;
    if (event.dates.start.dateTime) {
      eventDateTime = event.dates.start.dateTime;
    } else if (event.dates.start.localDate) {
      const time = event.dates.start.localTime || '19:00:00';
      eventDateTime = `${event.dates.start.localDate}T${time}`;
    } else {
      eventDateTime = new Date().toISOString();
    }

    // Generate proper URLs
    const urls = this.generateTicketUrls(event);

    return {
      id: event.id,
      title: this.cleanTitle(event.name),
      description: `${event.classifications?.[0]?.segment?.name || 'Event'} at ${venue?.name || 'Venue TBA'}`,
      category: this.mapCategory(event.classifications?.[0]?.segment?.name),
      startDate: eventDateTime,
      location: venue?.name || "Venue TBA",
      latitude: lat,
      longitude: lng,
      price: minPrice,
      minPrice: minPrice,
      maxPrice: maxPrice,
      imageUrl: image,
      externalId: event.id,
      externalSource: "ticketmaster" as const,
      venueName: venue?.name,
      url: urls.ticketUrl, // Main URL field that frontend expects
      ticketUrl: urls.ticketUrl,
      webUrl: urls.webUrl,
      mobileAppUrl: urls.mobileAppUrl,
      city: venue?.city?.name,
      state: venue?.state?.stateCode,
      address: venue?.address?.line1,
    };
  }

  private mapCategory(segment?: string): string {
    if (!segment) return "social";

    const normalizedSegment = segment.toLowerCase();

    const categoryMap: Record<string, string> = {
      music: "concerts",
      sports: "sports", 
      "arts & theatre": "social",
      arts: "social",
      film: "social",
      miscellaneous: "social",
      family: "social",
    };

    return categoryMap[normalizedSegment] || "social";
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("Testing Ticketmaster API connection...");

      const params = new URLSearchParams({
        apikey: this.apiKey,
        size: "1",
      });

      const response = await fetch(`${this.baseUrl}/events.json?${params}`);

      if (response.ok) {
        console.log("API connection successful!");
        return true;
      } else {
        console.error(`API connection failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("API connection test failed:", error);
      return false;
    }
  }
}

// Create and export singleton instance
export const ticketmasterService = new TicketmasterService();

// Export for testing purposes
export { TicketmasterService };
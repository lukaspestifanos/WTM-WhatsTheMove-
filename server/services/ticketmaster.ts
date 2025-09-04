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
  private debugMode = true; // Enable for debugging

  constructor() {
    // Try multiple environment variable patterns
    this.apiKey = 
      process.env.REACT_APP_TICKETMASTER_API_KEY || // React apps
      process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || // Next.js public
      process.env.VITE_TICKETMASTER_API_KEY || // Vite
      process.env.TICKETMASTER_API_KEY || // Node.js
      "OatWZ5V1ZeIKi58oOAitKRTvlrcKr5NA"; // Fallback key

    if (this.debugMode) {
      console.log("=== Ticketmaster Service Debug Info ===");
      console.log("API Key status:", this.apiKey ? `Present (${this.apiKey.substring(0, 5)}...)` : "Missing");
      console.log("Environment type:", typeof process !== 'undefined' ? "Node/Build" : "Browser");
      console.log("Build environment:", process.env.NODE_ENV);

      // Log all env vars that might contain the API key (without exposing full values)
      if (typeof process !== 'undefined' && process.env) {
        const tmKeys = Object.keys(process.env).filter(key => 
          key.includes('TICKETMASTER') || key.includes('VITE') || key.includes('REACT_APP')
        );
        console.log("Available env keys:", tmKeys);
      }
    }

    if (!this.apiKey) {
      console.error("❌ No Ticketmaster API key found in any environment variable!");
    }
  }

  async searchEventsByLocation(
    latitude: number,
    longitude: number,
    radius: number = 50,
    options: SearchOptions = {}
  ) {
    if (!this.apiKey) {
      console.error("❌ Cannot fetch events: No API key available");
      return [];
    }

    try {
      // Validate coordinates
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.error("❌ Invalid coordinates:", { latitude, longitude });
        return [];
      }

      // Set date range with proper timezone handling
      const now = new Date();

      // Format start date to ensure we get current/future events
      const startDateTime = options.startDate || this.formatDateForAPI(now);

      // Calculate end date based on category
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

      // Build API parameters
      const params = new URLSearchParams({
        apikey: this.apiKey,
        latlong: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        radius: radius.toString(),
        unit: "miles",
        size: "200", // Increased from 100 for more results
        sort: "date,asc",
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        includeTBA: "no", // Exclude events without confirmed dates
        includeTBD: "no",
        includeTest: "no", // Exclude test events
      });

      // Add keyword if provided
      if (options.keyword) {
        params.append("keyword", options.keyword);
      }

      // Map categories to Ticketmaster classifications
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
        console.log("📍 API Request Details:");
        console.log("- Coordinates:", `${latitude}, ${longitude}`);
        console.log("- Radius:", `${radius} miles`);
        console.log("- Date range:", `${startDateTime} to ${endDateTime}`);
        console.log("- Category:", options.category || "all");
        console.log("- URL:", url.replace(this.apiKey, '[HIDDEN]'));
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);

        // Common error handling
        if (response.status === 401) {
          console.error("🔑 Invalid API key. Please check your environment variables.");
        } else if (response.status === 429) {
          console.error("⏱️ Rate limit exceeded. Try again later.");
        } else if (response.status === 503) {
          console.error("🔧 Ticketmaster service unavailable.");
        }

        return [];
      }

      const data = await response.json();

      if (this.debugMode) {
        console.log("✅ API Response received:");
        console.log("- Total events found:", data.page?.totalElements || 0);
        console.log("- Events in response:", data._embedded?.events?.length || 0);
      }

      if (!data._embedded?.events || data._embedded.events.length === 0) {
        console.warn("⚠️ No events found for the given criteria");
        return [];
      }

      // Transform and filter events
      const transformedEvents = data._embedded.events
        .map((event: TicketmasterEvent) => this.transformEvent(event))
        .filter((event: any) => {
          // Filter out events with invalid data
          if (!event.latitude || !event.longitude) {
            if (this.debugMode) {
              console.warn(`⚠️ Skipping event without coordinates: ${event.title}`);
            }
            return false;
          }
          return true;
        });

      if (this.debugMode) {
        console.log(`✅ Successfully processed ${transformedEvents.length} events with valid coordinates`);
      }

      return transformedEvents;

    } catch (error) {
      console.error("❌ Error fetching Ticketmaster events:", error);

      // More detailed error logging
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error("🌐 Network error - check internet connection or CORS settings");
      } else if (error instanceof SyntaxError) {
        console.error("📝 JSON parsing error - API response may be malformed");
      }

      return [];
    }
  }

  private formatDateForAPI(date: Date, isEndDate: boolean = false): string {
    // Create a date string in the format Ticketmaster expects
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (isEndDate) {
      return `${year}-${month}-${day}T23:59:59Z`;
    } else {
      // For start date, use current time
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    }
  }

  private cleanTitle(title: string): string {
    // Remove presenter information
    let cleaned = title.replace(/^[^:]+\s+presents:\s*/i, '');

    // Remove bio/description after colons if it's longer than the main title
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex > 0) {
      const beforeColon = cleaned.substring(0, colonIndex).trim();
      const afterColon = cleaned.substring(colonIndex + 1).trim();

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

    // Get the best quality image
    const image = event.images?.find(img => img.width >= 500)?.url || 
                  event.images?.find(img => img.width >= 300)?.url || 
                  event.images?.[0]?.url;

    // Enhanced price extraction
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

    // Parse coordinates carefully
    const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
    const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

    // Construct date/time
    let eventDateTime: string;
    if (event.dates.start.dateTime) {
      eventDateTime = event.dates.start.dateTime;
    } else if (event.dates.start.localDate) {
      const time = event.dates.start.localTime || '19:00:00';
      eventDateTime = `${event.dates.start.localDate}T${time}`;
    } else {
      // Fallback to TBA
      eventDateTime = new Date().toISOString();
    }

    const transformed = {
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
      url: event.url,
      city: venue?.city?.name,
      state: venue?.state?.stateCode,
      address: venue?.address?.line1,
    };

    if (this.debugMode && (!lat || !lng)) {
      console.warn(`⚠️ Event missing coordinates: ${transformed.title} at ${transformed.location}`);
    }

    return transformed;
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

  // Utility method to test the API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log("🧪 Testing Ticketmaster API connection...");

      const params = new URLSearchParams({
        apikey: this.apiKey,
        size: "1",
      });

      const response = await fetch(`${this.baseUrl}/events.json?${params}`);

      if (response.ok) {
        console.log("✅ API connection successful!");
        return true;
      } else {
        console.error(`❌ API connection failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("❌ API connection test failed:", error);
      return false;
    }
  }
}

// Create and export singleton instance
export const ticketmasterService = new TicketmasterService();

// Export for testing purposes
export { TicketmasterService };
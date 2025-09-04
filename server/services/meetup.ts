interface MeetupEvent {
  id: string;
  title: string;
  description: string;
  eventUrl: string;
  dateTime: string;
  duration?: number;
  group: {
    name: string;
    urlname: string;
  };
  venue?: {
    name: string;
    lat: number;
    lon: number;
    address_1: string;
    city: string;
    state: string;
  };
}

interface SearchOptions {
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

class MeetupService {
  private baseUrl = "https://api.meetup.com/gql";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MEETUP_API_KEY || process.env.VITE_MEETUP_API_KEY || "";
    if (!this.apiKey) {
      console.warn("Meetup API key not provided. Event search will be limited.");
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
      // GraphQL query to search events near location
      const query = `
        query($lat: Float!, $lon: Float!, $radius: Float!) {
          rankedEvents(input: {
            lat: $lat
            lon: $lon
            radius: $radius
            first: 20
          }) {
            edges {
              node {
                id
                title
                description
                eventUrl
                dateTime
                duration
                group {
                  name
                  urlname
                }
                venue {
                  name
                  lat
                  lon
                  address_1
                  city
                  state
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: {
            lat: latitude,
            lon: longitude,
            radius,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Meetup API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error("Meetup GraphQL errors:", data.errors);
        return [];
      }

      if (!data.data?.rankedEvents?.edges) {
        return [];
      }

      const events = data.data.rankedEvents.edges
        .map((edge: any) => edge.node)
        .filter((event: MeetupEvent) => this.isCollegeRelevant(event))
        .map((event: MeetupEvent) => this.transformEvent(event));

      return events;
    } catch (error) {
      console.error("Error fetching Meetup events:", error);
      return [];
    }
  }

  private isCollegeRelevant(event: MeetupEvent): boolean {
    const text = `${event.title} ${event.description} ${event.group.name}`.toLowerCase();
    const keywords = [
      "student", "college", "university", "campus", "young professional",
      "20s", "twenties", "grad", "undergraduate", "alumni", "study", 
      "networking", "career", "internship", "volunteer"
    ];
    
    return keywords.some(keyword => text.includes(keyword));
  }

  private transformEvent(event: MeetupEvent) {
    return {
      id: `meetup_${event.id}`,
      title: event.title,
      description: event.description?.substring(0, 200) + (event.description?.length > 200 ? "..." : ""),
      category: this.categorizeEvent(event),
      startDate: event.dateTime,
      endDate: event.duration ? 
        new Date(new Date(event.dateTime).getTime() + (event.duration * 1000)).toISOString() 
        : null,
      location: event.venue?.name || "Online/TBA",
      latitude: event.venue?.lat || null,
      longitude: event.venue?.lon || null,
      price: 0, // Most Meetup events are free
      externalId: event.id,
      externalSource: "meetup",
      venueName: event.venue?.name,
      url: event.eventUrl,
      city: event.venue?.city,
      state: event.venue?.state,
      address: event.venue?.address_1,
      hostName: event.group.name,
    };
  }

  private categorizeEvent(event: MeetupEvent): string {
    const text = `${event.title} ${event.description}`.toLowerCase();
    
    if (text.includes("study") || text.includes("academic") || text.includes("homework")) {
      return "study";
    }
    if (text.includes("sport") || text.includes("fitness") || text.includes("workout")) {
      return "sports";
    }
    if (text.includes("party") || text.includes("mixer") || text.includes("social hour")) {
      return "parties";
    }
    if (text.includes("concert") || text.includes("music") || text.includes("band")) {
      return "concerts";
    }
    
    return "social";
  }
}

export const meetupService = new MeetupService();

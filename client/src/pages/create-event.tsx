import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, DollarSign, Info, Calendar, MapPin, Users } from "lucide-react";
import { z } from "zod";

// Constants
const PLATFORM_FEE_RATE = 0.05;
const MIN_PLATFORM_FEE = 0.50;
const PROCESSING_FEE_RATE = 0.029;
const PROCESSING_FEE_FIXED = 0.30;

const EVENT_CATEGORIES = [
  { value: "parties", label: "🎉 Parties" },
  { value: "concerts", label: "🎵 Concerts" },
  { value: "sports", label: "⚽ Sports" },
  { value: "study", label: "📚 Study Groups" },
  { value: "social", label: "🍕 Social" },
] as const;

// Schema
const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required").max(200, "Location too long"),
  startDate: z.string().min(1, "Date is required"),
  price: z.number().min(0, "Price cannot be negative").default(0),
  maxAttendees: z.number().positive("Must be a positive number").optional(),
});

type CreateEventData = z.infer<typeof createEventSchema>;

interface FeeCalculation {
  platformFee: string;
  processingFee: string;
  hostEarnings: string;
  buyerTotal: string;
}

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateEventData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
      startDate: "",
      price: 0,
      maxAttendees: undefined,
    },
  });

  // Auth check with redirect
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('redirectAfterAuth', '/');
      toast({
        title: "Authentication Required",
        description: "Please sign in to create an event",
      });
      setTimeout(() => setLocation("/register"), 1000);
    }
  }, [user, authLoading, toast, setLocation]);

  // Fee calculation utility
  const calculateFees = (price: number): FeeCalculation | null => {
    if (price === 0) return null;

    const platformFee = Math.max(price * PLATFORM_FEE_RATE, MIN_PLATFORM_FEE);
    const processingFee = (price * PROCESSING_FEE_RATE) + PROCESSING_FEE_FIXED;
    const hostEarnings = price - platformFee;
    const buyerTotal = price + platformFee + processingFee;

    return {
      platformFee: platformFee.toFixed(2),
      processingFee: processingFee.toFixed(2),
      hostEarnings: Math.max(0, hostEarnings).toFixed(2),
      buyerTotal: buyerTotal.toFixed(2),
    };
  };

  // API mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      const eventData = {
        title: data.title.trim(),
        description: data.description?.trim() || "",
        category: data.category,
        location: data.location.trim(),
        startDate: new Date(data.startDate).toISOString(),
        price: Number(data.price) || 0,
        maxAttendees: data.maxAttendees || null,
        externalSource: 'user',
        isPublic: true,
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to create event";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success!",
        description: "Your event has been created.",
      });
      setLocation(data.id ? `/events/${data.id}` : "/");
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = async (data: CreateEventData) => {
    if (isSubmitting || !user) return;

    setIsSubmitting(true);

    try {
      // Store event data and redirect to payment for platform fee
      sessionStorage.setItem('pendingEventData', JSON.stringify(data));
      sessionStorage.setItem('pendingEventFlow', 'create');
      setLocation('/payment-page');
    } catch (error) {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to initiate payment flow",
        variant: "destructive",
      });
    }
  };

  const watchPrice = form.watch("price");
  const fees = calculateFees(watchPrice);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Unauthenticated state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center mb-4">Please sign in to create events</p>
            <Button onClick={() => setLocation("/register")} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="mr-4"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Create Event</h1>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-2xl mx-auto p-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Event Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Summer Beach Party"
                          maxLength={100}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Selection */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What can people expect at your event?"
                          className="min-h-[100px] resize-none"
                          maxLength={1000}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="datetime-local"
                              className="pl-10"
                              min={new Date().toISOString().slice(0, 16)}
                              disabled={isSubmitting}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input 
                              placeholder="123 Main St"
                              className="pl-10"
                              maxLength={200}
                              disabled={isSubmitting}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing & Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00 (Free)"
                              className="pl-10"
                              disabled={isSubmitting}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAttendees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Capacity</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input 
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              className="pl-10"
                              disabled={isSubmitting}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fee Breakdown */}
                {fees && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1 text-sm mt-2">
                        <div className="font-semibold mb-2">Pricing Breakdown:</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Platform Fee ({(PLATFORM_FEE_RATE * 100).toFixed(0)}%):</span>
                            <span>${fees.platformFee}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Fee:</span>
                            <span>${fees.processingFee}</span>
                          </div>
                        </div>
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>You Earn:</span>
                            <span className="text-green-600">${fees.hostEarnings}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Attendee Pays:</span>
                            <span>${fees.buyerTotal}</span>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Creating Event...
                    </>
                  ) : (
                    watchPrice > 0 ? "Create Paid Event" : "Create Free Event"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
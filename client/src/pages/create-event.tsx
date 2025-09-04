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

// Simple schema that matches your backend expectations
const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  startDate: z.string().min(1, "Date is required"),
  price: z.number().min(0).default(0),
  maxAttendees: z.number().positive().optional(),
});

type CreateEventData = z.infer<typeof createEventSchema>;

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth and redirect if needed
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

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      console.log("Submitting event data:", data);

      // Format the date properly for the backend
      const eventData = {
        title: data.title,
        description: data.description || "",
        category: data.category,
        location: data.location,
        startDate: new Date(data.startDate).toISOString(), // Convert to proper ISO string
        price: Number(data.price) || 0,
        maxAttendees: data.maxAttendees || null,
        externalSource: 'user', // Mark as user-created event
        isPublic: true, // Default to public
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);

        // Parse error message if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || errorJson.error || "Failed to create event");
        } catch {
          throw new Error(errorText || "Failed to create event");
        }
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Event created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });

      toast({
        title: "Success!",
        description: "Your event has been created.",
      });

      // Navigate to event page or home
      if (data.id) {
        setLocation(`/events/${data.id}`);
      } else {
        setLocation("/");
      }
    },
    onError: (error: any) => {
      console.error("Event creation failed:", error);
      setIsSubmitting(false);

      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please check all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CreateEventData) => {
    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Final validation
    if (!user) {
      setIsSubmitting(false);
      toast({
        title: "Not Authenticated",
        description: "Please sign in to create an event",
        variant: "destructive",
      });
      setLocation("/register");
      return;
    }

    // Log for debugging
    console.log("Form validation passed, submitting:", data);

    try {
      await createEventMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled in onError
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate fees for display
  const calculateFees = (price: number) => {
    if (price === 0) return null;

    const platformFee = Math.max(price * 0.05, 0.50);
    const processingFee = (price * 0.029) + 0.30;
    const hostEarnings = price - platformFee;
    const buyerTotal = price + platformFee + processingFee;

    return {
      platformFee: platformFee.toFixed(2),
      processingFee: processingFee.toFixed(2),
      hostEarnings: hostEarnings.toFixed(2),
      buyerTotal: buyerTotal.toFixed(2),
    };
  };

  const watchPrice = form.watch("price");
  const fees = calculateFees(watchPrice);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If not authenticated, show message (backup, should redirect)
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
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Create Event</h1>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Summer Beach Party"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
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
                          <SelectItem value="parties">🎉 Parties</SelectItem>
                          <SelectItem value="concerts">🎵 Concerts</SelectItem>
                          <SelectItem value="sports">⚽ Sports</SelectItem>
                          <SelectItem value="study">📚 Study Groups</SelectItem>
                          <SelectItem value="social">🍕 Social</SelectItem>
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
                          className="min-h-[100px]"
                          {...field}
                          disabled={isSubmitting}
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
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="datetime-local"
                              className="pl-10"
                              {...field}
                              min={new Date().toISOString().slice(0, 16)}
                              disabled={isSubmitting}
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
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="123 Main St"
                              className="pl-10"
                              {...field}
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00 (Free)"
                              className="pl-10"
                              {...field}
                              value={field.value || 0}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              disabled={isSubmitting}
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
                            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              className="pl-10"
                              {...field}
                              value={field.value || ""}
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fee Preview */}
                {fees && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1 text-sm mt-2">
                        <div className="font-semibold mb-2">Pricing Breakdown:</div>
                        <div className="flex justify-between">
                          <span>Platform Fee (5%):</span>
                          <span>${fees.platformFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing Fee:</span>
                          <span>${fees.processingFee}</span>
                        </div>
                        <div className="border-t pt-1 mt-2">
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
      </div>
    </div>
  );
}
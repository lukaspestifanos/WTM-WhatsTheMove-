import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertEventSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import PaymentCheckout from "./payment-checkout";
import { useAuth } from "@/hooks/useAuth";

const createEventSchema = insertEventSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
});

type CreateEventData = z.infer<typeof createEventSchema>;

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // Handle login redirect - moved to useCallback to prevent re-renders
  const handleLoginRedirect = useCallback(() => {
    if (!redirectingToLogin && !isLoading && !isAuthenticated) {
      setRedirectingToLogin(true);
      toast({
        title: "Login Required",
        description: "You need to be logged in to create events. Redirecting...",
        variant: "destructive",
      });
      // Use a more reliable redirect method for preview testing
      setTimeout(() => {
        const loginUrl = new URL("/api/login", window.location.origin);
        window.location.assign(loginUrl.toString());
      }, 1000);
    }
  }, [isAuthenticated, isLoading, redirectingToLogin, toast]);

  // Show login redirect UI
  if (!isLoading && !isAuthenticated) {
    if (!redirectingToLogin) {
      handleLoginRedirect();
    }
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <CreateEventForm 
    setShowPayment={setShowPayment} 
    setPaymentIntentId={setPaymentIntentId}
    showPayment={showPayment}
    paymentIntentId={paymentIntentId}
  />;
}

// Separate component to prevent re-initialization issues
function CreateEventForm({ 
  setShowPayment, 
  setPaymentIntentId, 
  showPayment, 
  paymentIntentId 
}: {
  setShowPayment: (show: boolean) => void;
  setPaymentIntentId: (id: string | null) => void;
  showPayment: boolean;
  paymentIntentId: string | null;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateEventData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
      startDate: "",
      startTime: "",
      price: 0,
      maxAttendees: undefined,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success!",
        description: "Your event has been created successfully.",
      });
      setLocation("/");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          const loginUrl = new URL("/api/login", window.location.origin);
          window.location.assign(loginUrl.toString());
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: 5,
        items: [{ id: "event-hosting-fee" }],
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Payment intent created:", data);
      setPaymentIntentId(data.clientSecret);
      setShowPayment(true);
    },
    onError: (error) => {
      console.error("Error creating payment intent:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateEventData) => {
    console.log("Form data:", data);
    createPaymentIntentMutation.mutate();
  };

  const handlePaymentSuccess = (data: CreateEventData) => {
    createEventMutation.mutate(data);
  };

  if (showPayment && paymentIntentId) {
    return (
      <PaymentCheckout
        clientSecret={paymentIntentId}
        eventData={form.getValues()}
        onSuccess={() => handlePaymentSuccess(form.getValues())}
        onBack={() => {
          setShowPayment(false);
          setPaymentIntentId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="What's happening?"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="parties">🎉 Parties</SelectItem>
                        <SelectItem value="study">📚 Study Groups</SelectItem>
                        <SelectItem value="sports">🏀 Sports</SelectItem>
                        <SelectItem value="concerts">🎵 Concerts</SelectItem>
                        <SelectItem value="social">🍕 Social</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell people what to expect..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Where's it happening?"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value?.toString() || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-price"
                        />
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
                      <FormLabel>Max Attendees</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          placeholder="No limit"
                          {...field}
                          value={field.value?.toString() || ""}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          data-testid="input-max-attendees"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-lg"
                disabled={createPaymentIntentMutation.isPending}
                data-testid="button-create-event"
              >
                {createPaymentIntentMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : (
                  "Create Event ($5 Platform Fee)"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
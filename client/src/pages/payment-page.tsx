import { useEffect, useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded - now create the event
      await handleEventCreation(paymentIntent.id);
    }
  };

  const handleEventCreation = async (paymentIntentId: string) => {
    try {
      const eventDataStr = sessionStorage.getItem('pendingEventData');
      if (!eventDataStr) {
        throw new Error('Event data not found');
      }

      const eventData = JSON.parse(eventDataStr);
      
      console.log("Creating event with payment verification:", { eventData, paymentIntentId });
      
      const response = await apiRequest("POST", "/api/events", {
        ...eventData,
        stripePaymentIntentId: paymentIntentId,
        startDate: new Date(eventData.startDate).toISOString(),
        price: Number(eventData.price) || 0,
        maxAttendees: eventData.maxAttendees || null,
        externalSource: 'user',
        isPublic: true,
      });

      const newEvent = await response.json();
      
      // Clean up session storage
      sessionStorage.removeItem('pendingEventData');
      sessionStorage.removeItem('pendingEventFlow');
      
      toast({
        title: "Success!",
        description: "Your event has been created successfully!",
      });
      
      // Navigate to home (we can improve this later to go to the specific event)
      setLocation('/');
      
    } catch (error: any) {
      console.error("Event creation after payment failed:", error);
      toast({
        title: "Error",
        description: "Payment succeeded but event creation failed. Please contact support.",
        variant: "destructive",
      });
      setLocation('/');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full"
        data-testid="button-pay-platform-fee"
      >
        {isLoading ? "Processing..." : "Pay $5.00 Platform Fee"}
      </Button>
    </form>
  );
};

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Create PaymentIntent for event hosting fee
    apiRequest("POST", "/api/create-event-payment")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch(error => {
        console.error("Error creating payment intent:", error);
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
        setLocation('/create-event');
      });
  }, []);

  const handleCancel = () => {
    // Clean up session storage and go back
    sessionStorage.removeItem('pendingEventData');
    sessionStorage.removeItem('pendingEventFlow');
    setLocation('/create-event');
  };

  if (!clientSecret) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
              <span className="ml-2">Initializing payment...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Complete Payment</h1>
        </div>
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle data-testid="text-payment-title">Platform Fee Payment</CardTitle>
          <CardDescription data-testid="text-payment-description">
            Pay a $5.00 platform fee to host your event on What's the Move
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              className="w-full"
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
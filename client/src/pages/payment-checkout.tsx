import { useEffect, useState, useCallback, useMemo } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { CreditCard, Shield, Zap, Users, TrendingUp } from "lucide-react";

// Stripe configuration with error handling
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required environment variable: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Pricing tiers for different event types
const PRICING_TIERS = {
  basic: {
    fee: 5.00,
    name: "Basic Event",
    features: ["Event listing", "Basic analytics", "RSVP management"],
    maxAttendees: 50,
    description: "Perfect for small gatherings"
  },
  premium: {
    fee: 15.00,
    name: "Premium Event",
    features: ["Everything in Basic", "Custom branding", "Advanced analytics", "Email marketing"],
    maxAttendees: 200,
    description: "Great for larger events",
    popular: true
  },
  enterprise: {
    fee: 35.00,
    name: "Enterprise Event",
    features: ["Everything in Premium", "Priority support", "Custom integrations", "White-label options"],
    maxAttendees: null,
    description: "For professional organizations"
  }
} as const;

// Revenue sharing for paid events
const REVENUE_STRUCTURE = {
  platformFeeRate: 0.05, // 5% platform fee
  processingFeeRate: 0.029, // 2.9% + $0.30 processing
  processingFeeFixed: 0.30,
  minPlatformFee: 0.50
};

interface CheckoutFormProps {
  onSuccess: (paymentIntentId: string, tier: string) => void;
  selectedTier: keyof typeof PRICING_TIERS;
  eventData?: any;
}

const CheckoutForm = ({ onSuccess, selectedTier, eventData }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const tier = PRICING_TIERS[selectedTier];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment System Error",
        description: "Payment system is not ready. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/create-event?tier=${selectedTier}`,
          payment_method_data: {
            billing_details: {
              email: eventData?.hostEmail,
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "Unable to process payment. Please try again.",
          variant: "destructive",
        });
      } else if (paymentIntent?.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: `${tier.name} activated! You can now create your event.`,
        });
        onSuccess(paymentIntent.id, selectedTier);
      } else if (paymentIntent?.status === 'processing') {
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. You'll receive confirmation shortly.",
        });
      } else {
        toast({
          title: "Payment Incomplete",
          description: "Payment was not completed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stripe, elements, selectedTier, tier.name, eventData, onSuccess, toast]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: "tabs",
          paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Secured by Stripe • SSL Encrypted</span>
        </div>

        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="w-full h-12 text-lg font-semibold"
          data-testid="button-complete-payment"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ${tier.fee.toFixed(2)} - Create {tier.name}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

interface TierSelectorProps {
  selectedTier: keyof typeof PRICING_TIERS;
  onTierChange: (tier: keyof typeof PRICING_TIERS) => void;
  eventData?: any;
}

const TierSelector = ({ selectedTier, onTierChange, eventData }: TierSelectorProps) => {
  const estimatedAttendees = eventData?.maxAttendees || 25;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Choose Your Event Tier</h3>
        <p className="text-sm text-muted-foreground">
          Select the plan that best fits your event size and needs
        </p>
      </div>

      <div className="grid gap-3">
        {Object.entries(PRICING_TIERS).map(([key, tier]) => {
          const isSelected = selectedTier === key;
          const isRecommended = tier.maxAttendees && estimatedAttendees <= tier.maxAttendees;

          return (
            <Card 
              key={key}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onTierChange(key as keyof typeof PRICING_TIERS)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold">{tier.name}</h4>
                    {tier.popular && (
                      <Badge variant="default" className="text-xs">Most Popular</Badge>
                    )}
                    {isRecommended && !tier.popular && (
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${tier.fee.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">one-time</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>

                <div className="space-y-1">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                  <div className="flex items-center text-sm">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                    Up to {tier.maxAttendees || "unlimited"} attendees
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

interface RevenueBreakdownProps {
  eventPrice?: number;
  attendeeCount?: number;
}

const RevenueBreakdown = ({ eventPrice = 0, attendeeCount = 25 }: RevenueBreakdownProps) => {
  const breakdown = useMemo(() => {
    if (eventPrice <= 0) return null;

    const grossRevenue = eventPrice * attendeeCount;
    const platformFee = Math.max(grossRevenue * REVENUE_STRUCTURE.platformFeeRate, REVENUE_STRUCTURE.minPlatformFee * attendeeCount);
    const processingFee = (grossRevenue * REVENUE_STRUCTURE.processingFeeRate) + (REVENUE_STRUCTURE.processingFeeFixed * attendeeCount);
    const netRevenue = grossRevenue - platformFee - processingFee;

    return {
      grossRevenue,
      platformFee,
      processingFee,
      netRevenue,
      platformFeeRate: (platformFee / grossRevenue) * 100
    };
  }, [eventPrice, attendeeCount]);

  if (!breakdown) return null;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Revenue Projection
        </CardTitle>
        <CardDescription>
          Estimated earnings from {attendeeCount} attendees at ${eventPrice} each
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span>Gross Revenue:</span>
          <span className="font-semibold">${breakdown.grossRevenue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Platform Fee ({breakdown.platformFeeRate.toFixed(1)}%):</span>
          <span>-${breakdown.platformFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Processing Fees:</span>
          <span>-${breakdown.processingFee.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-bold text-green-600">
          <span>Your Net Revenue:</span>
          <span>${breakdown.netRevenue.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface PaymentCheckoutProps {
  onPaymentSuccess: (paymentIntentId: string, tier: string) => void;
  onCancel: () => void;
  eventData?: any;
}

export default function PaymentCheckout({ onPaymentSuccess, onCancel, eventData }: PaymentCheckoutProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedTier, setSelectedTier] = useState<keyof typeof PRICING_TIERS>("basic");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Auto-select tier based on event data
  useEffect(() => {
    if (eventData?.maxAttendees) {
      if (eventData.maxAttendees <= 50) {
        setSelectedTier("basic");
      } else if (eventData.maxAttendees <= 200) {
        setSelectedTier("premium");
      } else {
        setSelectedTier("enterprise");
      }
    }
  }, [eventData]);

  // Create payment intent when tier changes
  useEffect(() => {
    const createPaymentIntent = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest("POST", "/api/create-event-payment", {
          tier: selectedTier,
          amount: PRICING_TIERS[selectedTier].fee * 100, // Convert to cents
          eventData: eventData
        });

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Error creating payment intent:", error);
        toast({
          title: "Payment Setup Failed",
          description: "Unable to initialize payment system. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [selectedTier, eventData, toast]);

  const handlePaymentSuccess = useCallback((paymentIntentId: string) => {
    onPaymentSuccess(paymentIntentId, selectedTier);
  }, [onPaymentSuccess, selectedTier]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              <span className="text-lg">Setting up your payment...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Value Proposition */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Create Your Event</h2>
            <p className="text-muted-foreground">
              Join thousands of successful event organizers on What's the Move
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-sm font-semibold">50K+ Users</div>
              <div className="text-xs text-muted-foreground">Active community</div>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-sm font-semibold">Instant Setup</div>
              <div className="text-xs text-muted-foreground">Go live in minutes</div>
            </div>
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-sm font-semibold">Higher ROI</div>
              <div className="text-xs text-muted-foreground">vs competitors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Selection */}
      <TierSelector 
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
        eventData={eventData}
      />

      {/* Revenue Projection */}
      {eventData?.price > 0 && (
        <RevenueBreakdown 
          eventPrice={eventData.price}
          attendeeCount={eventData.maxAttendees || 25}
        />
      )}

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Secure payment to activate your {PRICING_TIERS[selectedTier].name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#6366f1',
                  }
                }
              }}
            >
              <CheckoutForm 
                onSuccess={handlePaymentSuccess}
                selectedTier={selectedTier}
                eventData={eventData}
              />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p>Preparing payment form...</p>
            </div>
          )}

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setSelectedTier("basic")}
              className="flex-1 text-sm"
              disabled={selectedTier === "basic"}
            >
              Switch to Basic ($5)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trust Indicators */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>Trusted by 10,000+ event organizers</p>
        <p>🔒 256-bit SSL encryption • 💳 PCI DSS compliant</p>
      </div>
    </div>
  );
}
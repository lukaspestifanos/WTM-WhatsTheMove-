import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleGetStarted = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg border-white/20">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
              <i className="fas fa-map-marked-alt text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-app-title">
              What's the Move?
            </h1>
            <p className="text-gray-600 text-lg" data-testid="text-app-subtitle">
              Discover amazing events happening around your campus
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <i className="fas fa-calendar-alt text-pink-600"></i>
              </div>
              <span className="font-medium">Find parties, concerts & events</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-users text-green-600"></i>
              </div>
              <span className="font-medium">Join study groups & meet people</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="fas fa-map-marker-alt text-blue-600"></i>
              </div>
              <span className="font-medium">Location-based recommendations</span>
            </div>
          </div>

          <Button 
            onClick={handleGetStarted}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold text-lg shadow-lg"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
          
          <p className="text-sm text-gray-500 mt-4" data-testid="text-browse-note">
            Browse events now, sign up later to create your own
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

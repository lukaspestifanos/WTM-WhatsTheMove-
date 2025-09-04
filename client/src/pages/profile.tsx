import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Profile() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          Profile
        </h1>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <div className="text-center py-16" data-testid="text-coming-soon">
          <i className="fas fa-user-circle text-6xl text-muted-foreground mb-6"></i>
          <h2 className="text-2xl font-bold text-foreground mb-4">Profile Feature Coming Soon!</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Customize your profile, set preferences, and manage your account settings.
          </p>
          
          <div className="space-y-4 max-w-sm mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-left text-lg">Planned Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-blue-600 text-sm"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Personal Info</p>
                    <p className="text-sm text-muted-foreground">Name, university, graduation year</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-cog text-green-600 text-sm"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Preferences</p>
                    <p className="text-sm text-muted-foreground">Event types, notifications</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-chart-bar text-purple-600 text-sm"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Activity Stats</p>
                    <p className="text-sm text-muted-foreground">Events attended, hosted</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-bell text-orange-600 text-sm"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Notifications</p>
                    <p className="text-sm text-muted-foreground">Event reminders, updates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={() => setLocation("/")}
            className="mt-8 bg-primary text-primary-foreground rounded-xl"
            data-testid="button-back-to-events"
          >
            Back to Events
          </Button>
        </div>
      </div>
    </div>
  );
}
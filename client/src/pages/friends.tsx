import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Friends() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          Friends
        </h1>
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <div className="text-center py-16" data-testid="text-coming-soon">
          <i className="fas fa-users text-6xl text-muted-foreground mb-6"></i>
          <h2 className="text-2xl font-bold text-foreground mb-4">Friends Feature Coming Soon!</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Connect with friends, see what events they're attending, and discover new events together.
          </p>
          
          <div className="space-y-4 max-w-sm mx-auto">
            <Card className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-user-plus text-blue-600"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Add Friends</p>
                    <p className="text-sm text-muted-foreground">Find and connect with your crew</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-calendar-check text-green-600"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">See Friend Activity</p>
                    <p className="text-sm text-muted-foreground">Know what events they're attending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-share-alt text-purple-600"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Share Events</p>
                    <p className="text-sm text-muted-foreground">Invite friends to events easily</p>
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
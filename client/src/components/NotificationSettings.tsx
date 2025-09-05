import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    isSubscribed,
    requestPermission,
    subscribeUser,
    unsubscribeUser,
    sendTestNotification,
  } = useNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-bell text-orange-500"></i>
            Push Notifications
          </CardTitle>
          <CardDescription>
            Stay updated with event notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <i className="fas fa-exclamation-triangle text-gray-400 text-3xl mb-2"></i>
            <p className="text-gray-600">
              Push notifications are not supported in this browser
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge className="bg-green-100 text-green-800">Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (isSubscribed) return 'fas fa-bell text-green-500';
    if (permission === 'denied') return 'fas fa-bell-slash text-red-500';
    return 'fas fa-bell text-gray-400';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className={getStatusIcon()}></i>
            Push Notifications
          </div>
          {getPermissionBadge()}
        </CardTitle>
        <CardDescription>
          Get notified about new events near you and friend activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Status:</strong> {isSubscribed ? 'Subscribed' : 'Not subscribed'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Permission:</strong> {permission}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {permission === 'default' && (
            <Button 
              onClick={requestPermission}
              className="w-full"
              data-testid="button-enable-notifications"
            >
              <i className="fas fa-bell mr-2"></i>
              Enable Notifications
            </Button>
          )}

          {permission === 'granted' && !isSubscribed && (
            <Button 
              onClick={subscribeUser}
              className="w-full"
              data-testid="button-subscribe-notifications"
            >
              <i className="fas fa-bell-plus mr-2"></i>
              Subscribe to Notifications
            </Button>
          )}

          {isSubscribed && (
            <>
              <Button 
                onClick={sendTestNotification}
                variant="outline"
                className="w-full"
                data-testid="button-test-notification"
              >
                <i className="fas fa-paper-plane mr-2"></i>
                Send Test Notification
              </Button>
              
              <Button 
                onClick={unsubscribeUser}
                variant="destructive"
                className="w-full"
                data-testid="button-unsubscribe-notifications"
              >
                <i className="fas fa-bell-slash mr-2"></i>
                Unsubscribe
              </Button>
            </>
          )}

          {permission === 'denied' && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-2">
                Notifications are blocked. To enable them:
              </p>
              <ol className="text-xs text-gray-500 list-decimal list-inside space-y-1">
                <li>Click the lock/info icon in your address bar</li>
                <li>Set notifications to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <i className="fas fa-info-circle mr-1"></i>
            You'll receive notifications for new events in your area, when friends RSVP to events, and event reminders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
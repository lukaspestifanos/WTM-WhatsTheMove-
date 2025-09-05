import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

export function useNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<NotificationPermissionState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
    subscription: null,
  });

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (!isSupported) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    const permission = Notification.permission;
    let subscription = null;
    let isSubscribed = false;

    try {
      const registration = await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.getSubscription();
      isSubscribed = !!subscription;
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    setState({
      permission,
      isSupported,
      isSubscribed,
      subscription,
    });
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser",
        variant: "destructive",
      });
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive notifications about new events!",
        });
        await subscribeUser();
      } else if (permission === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "You can enable them in browser settings later",
          variant: "destructive",
        });
      }

      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
      return 'denied';
    }
  };

  const subscribeUser = async (): Promise<PushSubscription | null> => {
    if (!state.isSupported || state.permission !== 'granted') {
      return null;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: generateVAPIDKey(), // We'll implement this
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
      }));

      toast({
        title: "Subscribed!",
        description: "You're now subscribed to push notifications",
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing user:', error);
      toast({
        title: "Subscription Failed",
        description: "Failed to subscribe to push notifications",
        variant: "destructive",
      });
      return null;
    }
  };

  const unsubscribeUser = async (): Promise<boolean> => {
    if (!state.subscription) {
      return false;
    }

    try {
      await state.subscription.unsubscribe();
      
      // Remove subscription from server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: state.subscription.endpoint }),
      });

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
      }));

      toast({
        title: "Unsubscribed",
        description: "You won't receive push notifications anymore",
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing user:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Failed to unsubscribe from notifications",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendTestNotification = async () => {
    if (!state.isSubscribed) {
      toast({
        title: "Not Subscribed",
        description: "Please enable notifications first",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: "Test Sent",
        description: "Check for the test notification!",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
  };

  return {
    ...state,
    requestPermission,
    subscribeUser,
    unsubscribeUser,
    sendTestNotification,
    checkNotificationSupport,
  };
}

// Generate VAPID key (simplified for demo - in production use proper VAPID keys)
function generateVAPIDKey(): Uint8Array {
  // This is a placeholder - in production, you'd use proper VAPID keys
  // For now, we'll use a dummy key that works for local development
  const key = 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLq_-Bi_GHCRGYrO2fCRh8Uv5bEm6RktX4rF2u-O_7u_8x8cjF_x_k';
  return new Uint8Array(atob(key.replace(/-/g, '+').replace(/_/g, '/')).split('').map(char => char.charCodeAt(0)));
}
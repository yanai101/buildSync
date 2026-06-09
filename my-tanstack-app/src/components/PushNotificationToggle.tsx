import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null; // Don't show if not supported by the browser
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isSubscribed ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
          {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">התראות פוש במכשיר</h3>
          <p className="text-sm text-gray-500">קבל התראות גם כשהאפליקציה סגורה</p>
        </div>
      </div>
      
      <button
        onClick={handleToggle}
        disabled={isLoading || permission === 'denied'}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isSubscribed ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isSubscribed ? '-translate-x-6' : '-translate-x-1'
          }`}
        />
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          </span>
        )}
      </button>
    </div>
  );
}

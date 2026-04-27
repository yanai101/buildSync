import * as React from 'react';

type NotifyKind = 'success' | 'error' | 'info';

type NotifyOptions = {
  title: string;
  body?: string;
  kind?: NotifyKind;
};

type InAppMessage = NotifyOptions & { id: number };

const supportsNotifications = () =>
  typeof window !== 'undefined' && 'Notification' in window;

const getPermission = (): NotificationPermission => {
  if (!supportsNotifications()) return 'denied';
  return Notification.permission;
};

export function useAppNotify() {
  const [permission, setPermission] = React.useState<NotificationPermission>(() => getPermission());
  const [messages, setMessages] = React.useState<InAppMessage[]>([]);

  React.useEffect(() => {
    setPermission(getPermission());
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const showInApp = React.useCallback((opts: NotifyOptions) => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { ...opts, id }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const requestPermission = React.useCallback(async () => {
    if (!supportsNotifications()) return 'denied' as NotificationPermission;
    if (Notification.permission !== 'default') {
      setPermission(Notification.permission);
      return Notification.permission;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = React.useCallback(async (opts: NotifyOptions) => {
    showInApp(opts);

    if (!supportsNotifications()) return;

    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await requestPermission();
    }

    if (perm !== 'granted') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;

    try {
      new Notification(opts.title, {
        body: opts.body,
        tag: 'buildsync-personal-files',
      });
    } catch {
      // Some browsers throw on direct construction; ignore silently — in-app
      // toast already shown.
    }
  }, [requestPermission, showInApp]);

  return { notify, permission, requestPermission, messages, dismiss };
}

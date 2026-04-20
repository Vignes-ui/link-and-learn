import { apiFetch } from '../api/http';

let initPromise = null;
let cachedConfig = null;

const SDK_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

const getConfig = async () => {
  if (cachedConfig) return cachedConfig;
  try {
    cachedConfig = await apiFetch('/api/push/config');
  } catch {
    cachedConfig = { enabled: false, appId: '' };
  }
  return cachedConfig;
};

const loadSdk = () => {
  if (document.querySelector(`script[src="${SDK_SRC}"]`)) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  const script = document.createElement('script');
  script.src = SDK_SRC;
  script.defer = true;
  document.head.appendChild(script);
};

const ensureInitialized = async (config) => {
  loadSdk();
  initPromise = initPromise || withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: config.appId,
      serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/push/onesignal/' },
      notifyButton: { enable: false },
    });
    return true;
  });
  return initPromise;
};

const withOneSignal = async (handler) => {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        resolve(await handler(OneSignal));
      } catch {
        resolve(null);
      }
    });
  });
};

export const initPushForUser = async (user) => {
  if (!user?.id) return { enabled: false };
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return { enabled: false, reason: 'unsupported' };
  }

  const config = await getConfig();
  if (!config.enabled || !config.appId) return { enabled: false };

  await ensureInitialized(config);
  await withOneSignal(async (OneSignal) => {
    await OneSignal.login(String(user.id));
    OneSignal.User.addTags({
      role: user.role || 'student',
      login_type: user.loginType || 'personal',
    });
  });

  return { enabled: true };
};

export const requestPushPermission = async () => {
  const config = await getConfig();
  if (!config.enabled || !config.appId) return { enabled: false };

  await ensureInitialized(config);

  return withOneSignal(async (OneSignal) => {
    if (!OneSignal.Notifications.isPushSupported()) {
      return { enabled: false, reason: 'unsupported' };
    }
    if (!OneSignal.Notifications.permission) {
      await OneSignal.Slidedown.promptPush();
    }
    return {
      enabled: true,
      permission: OneSignal.Notifications.permission ? 'granted' : Notification.permission,
      subscribed: Boolean(OneSignal.User.PushSubscription?.id),
    };
  });
};

export const getPushStatus = async () => {
  const config = await getConfig();
  if (!config.enabled || !config.appId || !window.OneSignalDeferred) {
    return {
      enabled: config.enabled,
      permission: window.Notification?.permission || 'default',
      subscribed: false,
    };
  }

  return withOneSignal(async (OneSignal) => ({
    enabled: true,
    permission: OneSignal.Notifications.permission ? 'granted' : Notification.permission,
    subscribed: Boolean(OneSignal.User.PushSubscription?.id),
  }));
};

export const logoutPushUser = async () => {
  if (!window.OneSignalDeferred) return;
  await withOneSignal(async (OneSignal) => {
    await OneSignal.logout();
  });
};

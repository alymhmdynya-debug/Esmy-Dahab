/**
 * Utility to dynamically update PWA assets (favicon, apple-touch-icon, manifest) and 
 * perform fallback actions like Badging API based on the user's current level/tier.
 */

export function updatePwaAssets(level: 1 | 2 | 3, username?: string) {
  if (typeof window === 'undefined') return;

  console.log(`[PWA Manager] Updating assets for Tier Level: ${level}, Username: ${username || 'none'}`);

  // 1. Determine local asset path based on level
  const iconPath = `/icons/stage${level}.png`;

  // 2. Update Web App Manifest URL dynamically in the DOM
  const existingManifest = document.getElementById('dynamic-manifest') || document.querySelector("link[rel='manifest']");
  if (existingManifest) {
    existingManifest.remove();
  }

  const manifestUrl = username 
    ? `/${username.toLowerCase().trim()}/manifest.json?v=${level}`
    : `/manifest.json?v=${level}`;

  if (username) {
    // Set cookie for server-side manifest rendering fallback
    document.cookie = `esm_username=${username.toLowerCase().trim()};path=/;max-age=31536000;SameSite=Lax`;
  }

  const newManifest = document.createElement('link');
  newManifest.id = 'dynamic-manifest';
  newManifest.rel = 'manifest';
  newManifest.href = manifestUrl;
  document.head.appendChild(newManifest);

  // 3. Update favicon link in the DOM
  let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    document.head.appendChild(favicon);
  }
  // Force browser to refresh favicon cache by appending a cachebuster parameter
  favicon.href = `${iconPath}?v=${level}`;

  // 4. Update apple-touch-icon link in the DOM for iOS home screens
  let appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
  if (!appleTouchIcon) {
    appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouchIcon);
  }
  appleTouchIcon.href = `${iconPath}?v=${level}`;

  // 5. Fallback: App Badging API (e.g. badge count 1, 2, or 3 representing current tier)
  if ('setAppBadge' in navigator) {
    try {
      // Show badge count indicating the tier level
      (navigator as any).setAppBadge(level)
        .then(() => console.log(`[PWA Manager] Badge successfully set to level: ${level}`))
        .catch((err: any) => console.warn('[PWA Manager] App Badging API failed:', err));
    } catch (e) {
      console.warn('[PWA Manager] Badging API error:', e);
    }
  }

  // 6. Push asset updates to service worker using postMessage
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'STAGE_LEVEL_UPDATE',
      level: level,
      iconUrl: iconPath,
      manifestUrl: manifestUrl
    });
  }
}

/**
 * Helper to auto-detect level from local storage and update PWA assets
 */
export function detectAndUpdatePwa() {
  try {
    const cachedProfile = localStorage.getItem('esm_my_profile');
    if (cachedProfile) {
      const profile = JSON.parse(cachedProfile);
      const level = profile.level || 1;
      const username = profile.username || '';
      updatePwaAssets(level, username);
    } else {
      // Default to level 1 with no username cookie
      updatePwaAssets(1);
    }
  } catch (err) {
    console.error('[PWA Manager] Failed to auto-detect or update PWA:', err);
  }
}

// ─────────────────────────────────────────────
// Strava OAuth Utility
// ─────────────────────────────────────────────

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = `${window.location.origin}/strava/callback`;

const STORAGE_KEY = 'strava_tokens';

// ── Build Strava OAuth URL ──
export function getStravaAuthUrl() {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

// ── Exchange authorization code for tokens ──
export async function exchangeCodeForToken(code) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token exchange failed: ${err}`);
  }

  const data = await res.json();
  storeTokens(data);
  return data;
}

// ── Refresh expired access token ──
export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error('Strava token refresh failed');
  }

  const data = await res.json();
  storeTokens(data);
  return data;
}

// ── Storage helpers ──
export function storeTokens(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at, // Unix timestamp
    athlete: data.athlete || null,
  }));
}

export function getStoredTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStravaTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isStravaConnected() {
  return !!getStoredTokens();
}

// ── Get a valid access token (auto-refresh if expired) ──
export async function getValidAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  // Refresh if token expires in < 5 minutes
  if (tokens.expiresAt - now < 300) {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    return refreshed.access_token;
  }

  return tokens.accessToken;
}

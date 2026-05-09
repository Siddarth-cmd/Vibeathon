// ─────────────────────────────────────────────
// Strava API — Fetch & format activities
// ─────────────────────────────────────────────

import { getValidAccessToken } from './stravaAuth';
import { CO2_RATES } from './carbonCalculator';

const BASE = 'https://www.strava.com/api/v3';

// ── Fetch recent activities ──
export async function getRecentActivities(userId = '') {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not connected to Strava');

  // MOCK DATA FOR DEMO
  if (token === 'demo_token') {
    let seed = 12345;
    if (userId) {
      seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const activities = [
      { name: "Quick Store Run 🛒", type: "Ride", distBase: 1200 },
      { name: "Morning Commute 🌱", type: "Ride", distBase: 2500 },
      { name: "Park Loop 🌳", type: "Ride", distBase: 3800 },
      { name: "City Explorer 🏙️", type: "Walk", distBase: 1500 },
      { name: "Light Trails ⛰️", type: "Hike", distBase: 4200 }
    ];

    const mockActivities = activities.map((act, i) => {
      const distance = act.distBase + Math.floor(random() * 500);
      const moving_time = Math.round(distance / 4); // rough estimate
      const daysAgo = i + 1;
      
      return {
        "id": 10987650000 + i * 1000,
        "name": act.name,
        "type": act.type,
        "distance": distance,
        "moving_time": moving_time,
        "total_elevation_gain": 10 + Math.floor(random() * 20),
        "start_date_local": new Date(Date.now() - 86400000 * daysAgo).toISOString(),
      };
    });

    return mockActivities.map(formatStravaRide);
  }

  const params = new URLSearchParams({ per_page: 15, page: 1 });
  const res = await fetch(`${BASE}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('STRAVA_UNAUTHORIZED');
    throw new Error(`Strava API error: ${res.status}`);
  }

  const activities = await res.json();

  // Filter supported types: Ride, Walk, Hike, Run
  const supported = ['Ride', 'VirtualRide', 'EBikeRide', 'MountainBikeRide', 'Walk', 'Hike', 'Run'];
  return activities
    .filter(a => supported.includes(a.type))
    .map(formatStravaRide);
}

// ── Format a Strava activity into Carbon-X format ──
export function formatStravaRide(activity) {
  const distanceKm = parseFloat((activity.distance / 1000).toFixed(2));
  
  // Map Strava types to Carbon-X types
  let carbonType = 'cycling';
  if (activity.type === 'Walk' || activity.type === 'Run') carbonType = 'walking';
  if (activity.type === 'Hike') carbonType = 'hiking';

  const rate = CO2_RATES[carbonType] || 21;
  const co2Saved = Math.round(distanceKm * rate);
  const durationMin = Math.round(activity.moving_time / 60);

  return {
    stravaId: activity.id,
    name: activity.name,
    type: carbonType,
    stravaType: activity.type, // Keep original for reference
    distanceKm,
    co2Saved,
    xp: co2Saved,
    durationMin,
    elevationGain: Math.round(activity.total_elevation_gain || 0),
    date: new Date(activity.start_date_local),
    source: 'strava',
  };
}

// ── Check if a Strava activity ID was already imported ──
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export async function getImportedStravaIds(userId) {
  if (!userId) return new Set();
  try {
    const q = query(
      collection(db, 'actions'),
      where('userId', '==', userId),
      where('source', '==', 'strava')
    );
    const snap = await getDocs(q);
    return new Set(snap.docs.map(d => d.data().stravaActivityId));
  } catch {
    return new Set();
  }
}

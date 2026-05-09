import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getStravaAuthUrl, isStravaConnected, clearStravaTokens, getStoredTokens } from '../utils/stravaAuth';
import { getRecentActivities, getImportedStravaIds } from '../utils/stravaApi';
import { saveAction } from '../utils/saveAction';
import { useAuth } from '../contexts/AuthContext';

// Strava brand color
const STRAVA_ORANGE = '#FC4C02';

function RideCard({ ride, imported, importing, onImport }) {
  const dateStr = ride.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#fff',
        border: `2px solid ${imported ? '#A3E635' : '#000'}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: imported ? '3px 3px 0 #A3E635' : '3px 3px 0 #000',
      }}
    >
      {/* Icon */}
      <div style={{
        fontSize: 24, width: 44, height: 44, borderRadius: 8,
        background: imported ? '#A3E635' : '#F5F5F0',
        border: '2px solid #000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {ride.type === 'cycling' ? '🚴' : ride.type === 'walking' ? '🚶' : ride.type === 'hiking' ? '🥾' : '🏃'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ride.name}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>📏 {ride.distanceKm} km</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>⏱ {ride.durationMin} min</span>
          {ride.elevationGain > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>⛰ {ride.elevationGain}m</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>{dateStr}</span>
        </div>
        <div style={{ marginTop: 5, display: 'flex', gap: 6 }}>
          <span style={{ background: '#A3E635', border: '1px solid #000', borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
            +{ride.co2Saved}g CO₂
          </span>
          <span style={{ background: '#FDE047', border: '1px solid #000', borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
            +{ride.xp} XP
          </span>
        </div>
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0 }}>
        {imported ? (
          <span style={{
            background: '#A3E635', border: '2px solid #000', borderRadius: 6,
            padding: '6px 12px', fontSize: 11, fontWeight: 800,
          }}>✓ Imported</span>
        ) : (
          <button
            onClick={() => onImport(ride)}
            disabled={importing}
            style={{
              background: importing ? '#ddd' : STRAVA_ORANGE,
              color: '#fff',
              border: '2px solid #000',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: importing ? 'not-allowed' : 'pointer',
              boxShadow: '2px 2px 0 #000',
              transition: 'all 0.1s',
            }}
          >
            {importing ? '⏳' : '⚡ Import'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function StravaImportPanel({ onActionSaved }) {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [connected, setConnected] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [rides, setRides] = useState([]);
  const [importedIds, setImportedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check connection on mount
  useEffect(() => {
    const tokens = getStoredTokens();
    if (tokens) {
      setConnected(true);
      setAthlete(tokens.athlete);
      loadRides();
    }
  }, []);

  const loadRides = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [activities, alreadyImported] = await Promise.all([
        getRecentActivities(currentUser?.uid),
        getImportedStravaIds(currentUser?.uid),
      ]);
      setRides(activities);
      setImportedIds(alreadyImported);
    } catch (err) {
      if (err.message === 'STRAVA_UNAUTHORIZED') {
        setConnected(false);
        clearStravaTokens();
        setError('Strava session expired. Please reconnect.');
      } else {
        setError(err.message || 'Failed to load Strava rides.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  async function handleImport(ride) {
    setImportingId(ride.stravaId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await saveAction({
        userId: currentUser.uid,
        type: ride.type,
        co2: ride.co2Saved,
        distance: ride.distanceKm,
        filename: `strava_${ride.stravaId}`,
        fileType: 'strava',
        location: null,
        userData,
        stravaActivityId: String(ride.stravaId),
        source: 'strava',
      });

      if (res.success) {
        setImportedIds(prev => new Set([...prev, ride.stravaId]));
        await refreshUserData(currentUser.uid);
        const newTotal = (userData?.xp || 0) + ride.xp;
        setSuccessMsg(`🎉 Imported! +${ride.xp} XP added. New Balance: ${newTotal} XP`);
        onActionSaved?.();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res.error || 'Failed to import ride.');
      }
    } catch (err) {
      setError(err.message || 'Import failed.');
    } finally {
      setImportingId(null);
    }
  }

  function handleDisconnect() {
    clearStravaTokens();
    setConnected(false);
    setRides([]);
    setAthlete(null);
  }

  // ─── NOT CONNECTED STATE ───
  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#fff',
          border: '3px solid #000',
          borderRadius: 12,
          padding: '24px 20px',
          boxShadow: '4px 4px 0 #000',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>🚴</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Import from Strava</div>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>
              Connect your Strava to auto-import cycling rides — no photo needed!
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FB7185', border: '2px solid #000', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <Link
          to="/strava-login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: STRAVA_ORANGE, color: '#fff',
            border: '3px solid #000', borderRadius: 10,
            padding: '12px 22px',
            fontWeight: 800, fontSize: 14, textDecoration: 'none',
            boxShadow: '4px 4px 0 #000',
            transition: 'all 0.1s',
          }}
        >
          🔗 Connect Strava
        </Link>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 10, fontWeight: 600 }}>
          Only reads activity data. We never post to your Strava.
        </div>
      </motion.div>
    );
  }

  // ─── CONNECTED STATE ───
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#fff',
        border: '3px solid #000',
        borderRadius: 12,
        padding: 20,
        boxShadow: '4px 4px 0 #000',
        marginBottom: 28,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🚴</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>
              Strava Connected
              <span style={{ background: '#A3E635', border: '1px solid #000', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 800, marginLeft: 8 }}>LIVE</span>
            </div>
            {athlete && (
              <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>
                {athlete.firstname} {athlete.lastname}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadRides} disabled={loading}
            style={{ background: '#FDE047', border: '2px solid #000', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>
            {loading ? '⏳' : '🔄 Refresh'}
          </button>
          <button onClick={handleDisconnect}
            style={{ background: '#FB7185', border: '2px solid #000', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>
            Disconnect
          </button>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: '#A3E635', border: '2px solid #000', borderRadius: 8, padding: '10px 14px', fontWeight: 700, fontSize: 13, marginBottom: 12, boxShadow: '2px 2px 0 #000' }}>
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div style={{ background: '#FB7185', border: '2px solid #000', borderRadius: 8, padding: '10px 14px', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Rides List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#666' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ fontSize: 28, display: 'inline-block', marginBottom: 8 }}>⚙️</motion.div>
          <div style={{ fontWeight: 700 }}>Loading your Strava rides...</div>
        </div>
      ) : rides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🚴</div>
          <div style={{ fontWeight: 700 }}>No recent cycling rides found on Strava.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Go for a ride and check back!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
          {rides.map(ride => (
            <RideCard
              key={ride.stravaId}
              ride={ride}
              imported={importedIds.has(ride.stravaId)}
              importing={importingId === ride.stravaId}
              onImport={handleImport}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#aaa', marginTop: 12, fontWeight: 600 }}>
        🛡 Imported rides are GPS-verified by Strava. Duplicates are automatically blocked.
      </div>
    </motion.div>
  );
}

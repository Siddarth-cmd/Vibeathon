import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function StravaMockLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function handleAuthorize() {
    setLoading(true);
    setTimeout(() => {
      // Set the mock tokens
      const fakeTokens = {
        accessToken: 'demo_token',
        refreshToken: 'demo_refresh',
        expiresAt: Math.floor(Date.now() / 1000) + 36000,
        athlete: { firstname: 'Demo', lastname: 'User' }
      };
      localStorage.setItem('strava_tokens', JSON.stringify(fakeTokens));
      navigate('/upload?strava_connected=true');
    }, 1500);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F0F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Strava Header */}
      <div style={{ width: '100%', maxWidth: 600, display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Strava_Logo.svg/2560px-Strava_Logo.svg.png" 
          alt="Strava" 
          style={{ height: 35 }} 
        />
      </div>

      {/* Auth Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 4,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '30px 40px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, background: '#A3E635', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #000', fontSize: 30 }}>🌍</div>
            <div style={{ fontSize: 24, color: '#666' }}>+</div>
            <div style={{ width: 60, height: 60, background: '#FC4C02', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #000', fontSize: 30 }}>🚴</div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 12 }}>
            Authorize Carbon-X to connect to Strava
          </h2>
          
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5, marginBottom: 24 }}>
            Connecting your account will allow **Carbon-X** to:
          </p>

          <div style={{ textAlign: 'left', background: '#F9F9F9', padding: 20, borderRadius: 4, border: '1px solid #EEE', marginBottom: 24 }}>
            {[
              'View your public profile',
              'View your activities (cycling, running, etc.)',
              'Access GPS data to verify carbon savings'
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <input type="checkbox" checked readOnly style={{ accentColor: '#FC4C02', width: 18, height: 18 }} />
                <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleAuthorize}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#FC4C02',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 12,
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Connecting...' : 'Authorize'}
          </button>

          <button
            onClick={() => navigate('/upload')}
            style={{
              width: '100%',
              padding: '10px',
              background: 'none',
              color: '#FC4C02',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>

        <div style={{ padding: '15px 40px', background: '#F0F0F0', borderTop: '1px solid #EEE', fontSize: 11, color: '#888', textAlign: 'center' }}>
          By clicking Authorize, you agree to Carbon-X's Terms of Service and Privacy Policy.
        </div>
      </motion.div>

      <div style={{ marginTop: 24, fontSize: 12, color: '#999' }}>
        Logged in as <span style={{ color: '#666', fontWeight: 700 }}>EcoDemoUser_2024</span>
      </div>
    </div>
  );
}

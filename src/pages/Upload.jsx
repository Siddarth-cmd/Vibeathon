import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { calculateCO2, getCO2Description } from '../utils/carbonCalculator';
import { saveAction } from '../utils/saveAction';
import { runAntiCheatChecks } from '../utils/antiCheat';
import { uploadToImgBB } from '../utils/imgbb';
import { Upload as UploadIcon, Image, Video, CheckCircle, MapPin, AlertTriangle, Clock } from 'lucide-react';
import StravaImportPanel from '../components/StravaImportPanel';

const ACTION_TYPES = [
  { id: 'cycling',   label: 'Cycling',   icon: '🚴', desc: '21g CO₂ per km',  needsDist: true,  needsPic: false, color: '#A3E635' },
  { id: 'walking',   label: 'Walking',   icon: '🚶', desc: '15g CO₂ per km',  needsDist: true,  needsPic: false, color: '#FDE047' },
  { id: 'hiking',    label: 'Hiking',    icon: '🥾', desc: '18g CO₂ per km',  needsDist: true,  needsPic: false, color: '#FB7185' },
  { id: 'bus',       label: 'Bus Ride',  icon: '🚌', desc: '105g CO₂ per km', needsDist: true,  needsPic: true,  color: '#60A5FA' },
  { id: 'recycling', label: 'Recycling', icon: '♻️', desc: '500g (fixed)',     needsDist: false, needsPic: true,  color: '#A3E635' },
];

export default function Upload() {
  const { currentUser, userData, refreshUserData } = useAuth();
  const routerLocation = useRouterLocation();
  const [stravaJustConnected, setStravaJustConnected] = useState(false);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'image' | 'video'
  const [preview, setPreview] = useState(null);
  const [actionType, setActionType] = useState('cycling');
  const [distance, setDistance] = useState('');
  const [step, setStep] = useState('idle'); // idle | checking | uploading | saving | done | error
  const [co2, setCo2] = useState(0);
  const [xpGranted, setXpGranted] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const selectedType = ACTION_TYPES.find(t => t.id === actionType);

  // Scroll to top so Strava panel is always visible
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Strava connect success toast
  useEffect(() => {
    if (routerLocation.state?.stravaConnected) {
      setStravaJustConnected(true);
      setTimeout(() => setStravaJustConnected(false), 4000);
    }
  }, []);

  function handleFile(f) {
    const isImage = f.type.startsWith('image/');
    if (!isImage) {
      setError('Please upload an image file (JPG, PNG, WEBP). ImgBB does not support video.');
      return;
    }
    setFile(f);
    setFileType('image');
    setPreview(URL.createObjectURL(f));
    setError('');
    setStep('idle');
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleDirectSave() {
    if (selectedType.needsDist && (!distance || Number(distance) <= 0)) {
      return setError('Please enter a valid distance in km.');
    }
    setError('');
    
    setStep('saving');
    const calc = calculateCO2(actionType, Number(distance) || 0);
    setCo2(calc);

    const res = await saveAction({
      userId: currentUser.uid,
      type: actionType,
      co2: calc,
      distance: Number(distance) || 0,
      filename: null,
      fileType: null,
      location: null,
      userData,
    });

    if (res.success) {
      setXpGranted(res.xpAwarded);
      await refreshUserData(currentUser.uid);
      setStep('done');
    } else {
      setError(res.error || 'Failed to save action.');
      setStep('error');
    }
  }

  async function handleSubmitWithPhoto() {
    if (!file) return setError('Please upload an image first.');
    if (selectedType.needsDist && (!distance || Number(distance) <= 0)) {
      return setError('Please enter a valid distance in km.');
    }
    setError('');

    // Step 1: Anti-cheat checks
    setStep('checking');
    const check = await runAntiCheatChecks(currentUser.uid, file.name);
    if (!check.allowed) {
      setError(check.reason);
      setStep('error');
      return;
    }

    try {
      // Step 2: Upload to ImgBB
      setStep('uploading');
      const imageUrl = await uploadToImgBB(file);
      
      const calc = calculateCO2(actionType, Number(distance) || 0);
      setCo2(calc);

      // Step 3: Save Action
      setStep('saving');
      const res = await saveAction({
        userId: currentUser.uid,
        type: actionType,
        co2: calc,
        distance: Number(distance) || 0,
        filename: file.name,
        fileType: fileType,
        imageUrl: imageUrl,
        location: null,
        userData,
      });

      if (res.success) {
        setXpGranted(res.xpAwarded);
        await refreshUserData(currentUser.uid);
        setStep('done');
      } else {
        setError(res.error || 'Failed to save action.');
        setStep('error');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload image.');
      setStep('error');
    }
  }

  function reset() {
    setFile(null); setPreview(null); setFileType(null);
    setStep('idle'); setCo2(0); setXpGranted(0);
    setError(''); setDistance('');
  }

  const co2Preview = selectedType.needsDist && distance && Number(distance) > 0
    ? calculateCO2(actionType, Number(distance))
    : actionType === 'recycling' ? 200 : null;

  return (
    <div style={{ background: '#F5F5F0', minHeight: 'calc(100vh - 64px)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="nb-heading" style={{ marginBottom: 6 }}>Upload Eco-Action 📸</h1>
          <p className="nb-subheading" style={{ marginBottom: 24 }}>
            Submit image proof for manual verification by admins
          </p>
        </motion.div>

        {/* Strava connected toast */}
        <AnimatePresence>
          {stravaJustConnected && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: '#A3E635', border: '2px solid #000', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 700, fontSize: 14, boxShadow: '3px 3px 0 #000' }}>
              🚴 Strava connected! Your recent rides are ready to import below.
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STRAVA IMPORT PANEL ── */}
        <StravaImportPanel onActionSaved={() => refreshUserData(currentUser?.uid)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* File Upload Zone */}
            {selectedType.needsPic && (
              <div className="nb-card" style={{ padding: 20 }}>
              <label className="nb-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Image size={13} /> Image Proof (Required)
                </span>
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `3px dashed ${dragOver ? '#A3E635' : '#000'}`,
                  borderRadius: 8, padding: '20px 16px', textAlign: 'center',
                  cursor: 'pointer', background: dragOver ? '#A3E63520' : '#F5F5F0',
                  transition: 'all 0.15s', minHeight: 180,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {preview ? (
                  <img src={preview} alt="preview" style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 6, border: '2px solid #000', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Image size={28} color="#999" />
                    <p style={{ fontWeight: 700, color: '#666', fontSize: 14 }}>Drop image or click to browse</p>
                    <p style={{ fontSize: 12, color: '#aaa' }}>JPG, PNG, WEBP</p>
                  </>
                )}
              </div>
              <input
                ref={inputRef} type="file"
                accept="image/*" hidden
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
              />
              {file && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Image size={14} />
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{file.name}</span>
                </div>
              )}
              </div>
            )}

            {/* Action Type */}
            <div className="nb-card" style={{ padding: 20 }}>
              <label className="nb-label">🌿 Action Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ACTION_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setActionType(t.id); setDistance(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', border: `3px solid ${actionType === t.id ? '#000' : '#ddd'}`,
                      borderRadius: 8, background: actionType === t.id ? t.color : '#fff',
                      cursor: 'pointer', fontWeight: 700, fontSize: 14,
                      boxShadow: actionType === t.id ? '3px 3px 0px #000' : 'none', transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>{t.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{t.desc}</div>
                    </div>
                    {actionType === t.id && <span style={{ marginLeft: 'auto', fontSize: 16 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Distance Input */}
            {selectedType.needsDist && (
              <div className="nb-card" style={{ padding: 20 }}>
                <label className="nb-label">📏 Distance (km)</label>
                <input
                  className="nb-input" type="number" min="0.1" step="0.1"
                  placeholder={`e.g. 2.5 km`} value={distance}
                  onChange={e => setDistance(e.target.value)}
                />
              </div>
            )}

            {/* CO2 Preview */}
            {co2Preview !== null && (
              <motion.div
                key={co2Preview}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="nb-card-green"
                style={{ padding: 20 }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7, marginBottom: 4 }}>
                  CO₂ Savings Preview
                </div>
                <div style={{ fontWeight: 900, fontSize: 32 }}>{co2Preview}g</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                  {getCO2Description(actionType, Number(distance) || 0, co2Preview)}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
                  = +{co2Preview} XP upon approval
                </div>
              </motion.div>
            )}

            {/* User XP Context */}
            {userData && (
              <div className="nb-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, opacity: 0.6 }}>Your Progress</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                  <span>Current XP</span>
                  <span>{userData.xp || 0} XP</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: '#FB7185', border: '2px solid #000', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 600, fontSize: 13, boxShadow: '3px 3px 0px #000' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
              </motion.div>
            )}

            {/* Upload Button */}
            {(step === 'idle' || step === 'error') && (
              <motion.button
                className="nb-btn nb-btn-black"
                style={{ width: '100%', padding: '16px', fontSize: 16, opacity: (selectedType.needsPic && !file) || (selectedType.needsDist && !distance) ? 0.5 : 1 }}
                onClick={selectedType.needsPic ? handleSubmitWithPhoto : handleDirectSave}
                disabled={(selectedType.needsPic && !file) || (selectedType.needsDist && !distance)}
                whileHover={!((selectedType.needsPic && !file) || (selectedType.needsDist && !distance)) ? { scale: 1.02 } : {}}
                whileTap={!((selectedType.needsPic && !file) || (selectedType.needsDist && !distance)) ? { scale: 0.97 } : {}}
              >
                {!selectedType.needsPic ? (
                  '⛓ Save Action'
                ) : (
                  <>
                    <UploadIcon size={18} /> Submit for Verification
                  </>
                )}
              </motion.button>
            )}

            {/* Loading States */}
            <AnimatePresence>
              {['checking', 'uploading', 'saving'].includes(step) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="nb-card" style={{ padding: 28, textAlign: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ display: 'inline-block', fontSize: 36, marginBottom: 12 }}>⚙️</motion.div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {step === 'checking' && '🛡 Running anti-cheat checks...'}
                    {step === 'uploading' && '📸 Uploading image securely...'}
                    {step === 'saving' && '⛓ Recording in Carbon Ledger...'}
                  </div>
                  <div style={{ color: '#666', marginTop: 6, fontSize: 13 }}>Please wait</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Done */}
            <AnimatePresence>
              {step === 'done' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  className="nb-card-yellow" style={{ padding: 32, textAlign: 'center' }}>
                  {selectedType.needsPic ? (
                    <>
                      <div style={{ fontSize: 52, marginBottom: 12 }}>⏳</div>
                      <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>Action Submitted!</div>
                      <div style={{ fontWeight: 700 }}>Your proof is now pending human verification.</div>
                      {xpGranted > 0 && <div style={{ fontWeight: 700, color: 'blue', marginTop: 8 }}>✨ +{xpGranted} XP (Task Progress auto-approved!)</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                      <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>Action Saved!</div>
                      <div style={{ fontWeight: 700 }}>+{co2}g CO₂ reduced</div>
                      {xpGranted > 0 && <div style={{ fontWeight: 700 }}>+{xpGranted} XP earned</div>}
                    </>
                  )}
                  <div style={{ fontSize: 12, marginTop: 12, opacity: 0.7, fontWeight: 600 }}>
                    ⛓ Recorded in your Carbon Ledger
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="nb-btn nb-btn-black" style={{ flex: 1 }} onClick={reset}>Upload Another</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Rules info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="nb-card" style={{ marginTop: 28, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>📋 CARBON SAVINGS RULES</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: '🚴 Cycling', val: '120g CO₂ / km', color: '#A3E635' },
              { label: '🚌 Bus',     val: '80g CO₂ / km',  color: '#60A5FA' },
              { label: '♻️ Recycling', val: '200g fixed',  color: '#FDE047' },
              { label: '⚡ XP Rate',  val: '1g CO₂ = 1 XP', color: '#FB7185' },
              { label: '🛡 Daily Limit', val: '5 uploads/day', color: '#E5E5E5' },
            ].map((r, i) => (
              <div key={i} style={{ background: r.color, border: '2px solid #000', borderRadius: 6, padding: '8px 14px', boxShadow: '2px 2px 0px #000', flex: '1 1 120px' }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{r.label}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{r.val}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

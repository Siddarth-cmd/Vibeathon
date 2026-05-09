import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Image as ImageIcon, MapPin } from 'lucide-react';

export default function VerifierDashboard() {
  const { userData, currentUser } = useAuth();
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');

  const isVerifier = userData?.role === 'verifier' || userData?.role === 'admin';

  useEffect(() => {
    if (isVerifier) {
      loadPending();
    }
  }, [isVerifier]);

  async function loadPending() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'actions'),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const actions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort manually because orderBy might require index
      actions.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

      // Fetch user names for each action
      const actionsWithUsers = await Promise.all(actions.map(async (a) => {
        const uSnap = await getDoc(doc(db, 'users', a.userId));
        return { ...a, userName: uSnap.exists() ? uSnap.data().name : 'Unknown User' };
      }));

      setPendingActions(actionsWithUsers);
    } catch (err) {
      console.error(err);
      setError('Failed to load pending actions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action, status) {
    setProcessingId(action.id);
    try {
      // 1. Update Action Status
      const verifierId = currentUser?.uid || '';
      console.log(`[Verifier] Setting action ${action.id} to status: ${status}`);
      await updateDoc(doc(db, 'actions', action.id), {
        status: status,
        verifiedAt: new Date(),
        verifiedBy: verifierId
      });
      console.log(`[Verifier] Successfully updated action ${action.id} to ${status}`);

      // 2. If Approved, award XP, CO2, and update Daily Task progress
      if (status === 'approved') {
        const userRef = doc(db, 'users', action.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const uData = userSnap.data();
          let xpToAward = action.co2; // Activity XP
          
          // Process Daily Tasks
          let updatedTasks = [...(uData.dailyTasks || [])];
          updatedTasks = updatedTasks.map(task => {
            if (!task.completed && task.type === action.type) {
              task.progress += (action.distance || 1);
              if (task.progress >= task.target) {
                task.progress = task.target;
                task.completed = true;
                xpToAward += task.reward; // Task Completion Reward
              }
            }
            return task;
          });

          const currentXP = uData.xp || 0;
          const newXP = currentXP + xpToAward;
          const newLevel = newXP >= 1500 ? 3 : newXP >= 500 ? 2 : 1;

          await updateDoc(userRef, {
            xp: increment(xpToAward),
            co2Saved: increment(action.co2),
            level: newLevel,
            dailyTasks: updatedTasks
          });
        }
      }

      // 3. Remove from local list
      setPendingActions(prev => prev.filter(a => a.id !== action.id));
    } catch (err) {
      console.error(err);
      alert('Failed to process action.');
    } finally {
      setProcessingId(null);
    }
  }

  if (!isVerifier) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 className="nb-heading">Access Denied 🔐</h1>
        <p className="nb-subheading">You need Verifier or Admin permissions to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#F5F5F0', minHeight: 'calc(100vh - 64px)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <h1 className="nb-heading" style={{ fontSize: 32 }}>Verification Queue 🛡️</h1>
          <p className="nb-subheading">Review and approve manual eco-action proofs</p>
        </header>

        {error && (
          <div className="nb-card" style={{ background: '#FB7185', padding: 16, marginBottom: 20, fontWeight: 700 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', fontSize: 40, marginBottom: 12 }}>⚙️</motion.div>
            <p style={{ fontWeight: 700, marginTop: 10 }}>Scanning for proof...</p>
          </div>
        ) : pendingActions.length === 0 ? (
          <div className="nb-card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
            <h2 style={{ fontWeight: 900 }}>All caught up!</h2>
            <p style={{ fontWeight: 600, color: '#666' }}>No pending actions to verify right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            <AnimatePresence>
              {pendingActions.map(action => (
                <motion.div
                  key={action.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="nb-card"
                  style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                  {/* Image Preview */}
                  <div style={{ position: 'relative', height: 200, background: '#000' }}>
                    {action.imageUrl ? (
                      <img src={action.imageUrl} alt="proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <ImageIcon size={48} opacity={0.3} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>No image provided</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#FDE047', border: '2px solid #000', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 800, boxShadow: '2px 2px 0 #000' }}>
                      {action.type.toUpperCase()}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: 20, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, background: '#A3E635', borderRadius: '50%', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>
                        {action.userName.charAt(0)}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{action.userName}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, fontWeight: 600, color: '#444' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Clock size={14} /> Submitted: {action.timestamp?.toDate().toLocaleString() || 'Just now'}
                      </div>
                      {action.distance > 0 && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <MapPin size={14} /> Distance: {action.distance} km
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#10B981' }}>
                        <CheckCircle size={14} /> Reward: {action.co2} XP
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
                    <button
                      disabled={processingId === action.id}
                      onClick={() => handleAction(action, 'approved')}
                      style={{ flex: 1, background: '#A3E635', border: '2px solid #000', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #000', transition: 'all 0.1s' }}
                    >
                      {processingId === action.id ? '...' : 'Approve'}
                    </button>
                    <button
                      disabled={processingId === action.id}
                      onClick={() => handleAction(action, 'rejected')}
                      style={{ flex: 1, background: '#FB7185', color: '#fff', border: '2px solid #000', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #000', transition: 'all 0.1s' }}
                    >
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

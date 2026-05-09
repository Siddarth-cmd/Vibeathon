import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Target } from 'lucide-react';

export default function DailyTasks({ tasks }) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="nb-card" style={{ padding: 20, marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Target size={20} />
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Daily Missions</h2>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.map((task) => {
          const progressPercent = Math.min(100, Math.round((task.progress / task.target) * 100));
          const unit = task.type === 'recycling' || task.type === 'bus' ? 'times' : 'km';
          
          return (
            <div key={task.id} style={{ border: '2px solid #000', borderRadius: 8, padding: 12, background: task.completed ? '#A3E635' : '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, textTransform: 'capitalize' }}>
                    {task.type} {task.target} {unit}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginTop: 2 }}>
                    {task.completed ? 'Completed!' : `${task.progress} / ${task.target} ${unit}`}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: '#000', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 800, fontSize: 12 }}>
                    +{task.reward} XP
                  </div>
                  {task.completed && <CheckCircle size={20} color="#000" />}
                </div>
              </div>

              {/* Progress Bar Background */}
              {!task.completed && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: '#FDE047', zIndex: 1, borderRight: progressPercent > 0 ? '2px solid #000' : 'none' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

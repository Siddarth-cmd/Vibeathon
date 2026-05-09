import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';

export async function saveAction({ userId, type, co2, distance, filename, fileType, location, userData, stravaActivityId, source, imageUrl }) {
  try {
    // Basic anti-cheat: check for duplicate filename today
    if (filename && source !== 'strava') {
      const q = query(
        collection(db, 'actions'),
        where('userId', '==', userId),
        where('filename', '==', filename),
        limit(1)
      );
      const dupCheck = await getDocs(q);
      if (!dupCheck.empty) {
        return { success: false, error: 'Duplicate upload detected. You cannot upload the same file twice.' };
      }
    }

    const isStrava = source === 'strava';
    const needsVerification = !!imageUrl && !isStrava; // Only photo-based manual uploads need verification
    const finalStatus = needsVerification ? 'pending' : 'approved';

    // 1. Update Daily Task Progress + XP
    // Auto-granted for: Strava activities and non-photo manual activities (cycling, walking, hiking)
    // Withheld for: photo-based manual uploads (bus, recycling) — granted only on verifier Approval
    let updatedTasks = [...(userData.dailyTasks || [])];
    let xpToAward = 0;
    
    if (!needsVerification) {
      updatedTasks = updatedTasks.map(task => {
        if (!task.completed && task.type === type) {
          task.progress += (distance || 1);
          if (task.progress >= task.target) {
            task.progress = task.target;
            task.completed = true;
            xpToAward += task.reward;
          }
        }
        return task;
      });
      
      // Add activity XP immediately
      xpToAward += co2;
    }

    const newXP = (userData?.xp || 0) + xpToAward;
    const newLevel = newXP >= 1500 ? 3 : newXP >= 500 ? 2 : 1;

    // 3. Save action to Firestore
    await addDoc(collection(db, 'actions'), {
      userId,
      type,
      co2,
      distance: distance || 0,
      filename: filename || '',
      fileType: fileType || 'image',
      imageUrl: imageUrl || null,
      timestamp: serverTimestamp(),
      location: location || null,
      status: finalStatus,
      source: source || 'manual',
      stravaActivityId: stravaActivityId || null,
    });

    // 4. Update user stats
    const updatePayload = {
      dailyTasks: updatedTasks
    };

    if (xpToAward > 0) {
      updatePayload.xp = increment(xpToAward);
      updatePayload.level = newLevel;
    }
    
    if (!needsVerification) {
      updatePayload.co2Saved = increment(co2);
    }

    await updateDoc(doc(db, 'users', userId), updatePayload);

    return { 
      success: true, 
      status: finalStatus, 
      xpAwarded: xpToAward, 
      newLevel,
      taskProgressUpdated: true
    };
  } catch (fsErr) {
    console.error('Error saving action:', fsErr);
    return { success: false, error: fsErr.message || 'Failed to save action.' };
  }
}

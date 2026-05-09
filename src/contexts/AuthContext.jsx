import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, increment
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const generateDailyTasks = (level = 1) => {
  const types = ['cycling', 'walking', 'hiking', 'bus', 'recycling'];
  const tasks = [];
  
  // Complexity increases with level
  const difficultyMult = 1 + (level - 1) * 0.2; // 20% harder per level
  const rewardMult = level; // Rewards scale directly with level

  const shuffled = [...types].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  selected.forEach((type, i) => {
    let target = 1;
    if (type === 'walking') target = Math.round((2 + Math.floor(Math.random() * 3)) * difficultyMult);
    else if (type === 'hiking') target = Math.round((3 + Math.floor(Math.random() * 5)) * difficultyMult);
    else if (type === 'cycling') target = Math.round((5 + Math.floor(Math.random() * 10)) * difficultyMult);
    else if (type === 'bus') target = Math.round((1 + Math.floor(Math.random() * 2)) * difficultyMult);
    
    tasks.push({
      id: `task_${Date.now()}_${i}`,
      type,
      target: target || 1,
      progress: 0,
      reward: Math.round(target * 25 * rewardMult), // Rewards scale significantly
      completed: false
    });
  });
  return tasks;
};

const getTodayString = () => new Date().toISOString().split('T')[0];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, name, department = 'General') {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    const today = getTodayString();
    
    const userDoc = {
      name,
      email,
      xp: 0,
      co2Saved: 0,
      level: 1,
      role: email === 'verifier@carbonx.com' ? 'verifier' : 'user',
      lastLoginDate: today,
      dailyTasks: generateDailyTasks(1),
      createdAt: serverTimestamp(),
      department,
    };
    await setDoc(doc(db, 'users', uid), userDoc);
    setUserData(userDoc);
    return userCred;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserData(null);
  }

  async function refreshUserData(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      let data = { id: snap.id, ...snap.data() };
      const today = getTodayString();
      
      // MIGRATION: If name is 'User', try to improve it
      if (data.name === 'User' && auth.currentUser?.email) {
        const emailName = auth.currentUser.email.split('@')[0];
        const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        data.name = formattedName;
        await updateDoc(doc(db, 'users', uid), { name: formattedName });
      }
      // Daily Login Check
      if (data.lastLoginDate !== today) {
        const newTasks = generateDailyTasks(data.level || 1);
        await updateDoc(doc(db, 'users', uid), {
          lastLoginDate: today,
          dailyTasks: newTasks,
          xp: increment(20) // 20 XP daily login bonus
        });
        data.lastLoginDate = today;
        data.dailyTasks = newTasks;
        data.xp += 20;
      }
      
      setUserData(data);
    } else {
      // Auto-create document if it was deleted but Auth still exists
      const today = getTodayString();
      const newTasks = generateDailyTasks(1);
      
      // Better name fallback: Use email prefix if displayName is missing
      const emailName = auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'User';
      // Capitalize first letter
      const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);

      const userDoc = {
        name: auth.currentUser?.displayName || formattedName,
        email: auth.currentUser?.email || '',
        xp: 0,
        co2Saved: 0,
        level: 1,
        role: 'user',
        lastLoginDate: today,
        dailyTasks: newTasks,
        createdAt: serverTimestamp(),
        department: 'General',
      };
      await setDoc(doc(db, 'users', uid), userDoc);
      setUserData({ id: uid, ...userDoc });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth State Changed:", user?.email);
      setCurrentUser(user);
      if (user) {
        try {
          await refreshUserData(user.uid);
        } catch (err) {
          console.error("Error refreshing user data:", err);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

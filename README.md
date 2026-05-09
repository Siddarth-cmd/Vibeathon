# 🌍 Carbon-X: Campus Carbon Intelligence

Carbon-X is a gamified sustainability platform designed to track, verify, and reward eco-friendly activities within a campus environment. By turning carbon reduction into a competitive social experience, Carbon-X empowers students and staff to make a measurable impact on the planet.

## 🚀 Key Features

### 🎮 Gamified Missions
- **Daily Challenges**: Personalised tasks for cycling, walking, hiking, bus travel, and recycling.
- **Dynamic Scaling**: Mission difficulty and XP rewards increase automatically as users level up.
- **Progressive Rewards**: Unlock higher tiers and more XP by consistently completing milestones.

### 🛡️ Verification System
- **Proof-Based Logging**: Mandatory image uploads (e.g., bus tickets, recycling photos) for high-impact activities.
- **Verifier Dashboard**: A dedicated moderation interface for Admins and Verifiers to review, approve, or reject manual uploads.
- **Anti-Cheat Integration**: Built-in safeguards to ensure only legitimate green activities are rewarded.

### 🏆 Social & Competitive
- **Live Leaderboards**: Real-time rankings showing top eco-warriors on campus.
- **Department Rankings**: Competitive filtering for departments like **CSE, ISE, ECE, ME, CV, and EEE**.
- **Level Badges**: Interactive badges that evolve as you progress from Level 1 to Eco-Legend.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Design System)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- Firebase Account

### 2. Installation
```bash
git clone https://github.com/Siddarth-cmd/Carbon-X.git
cd Carbon-X
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Locally
```bash
npm run dev
```

## 👥 Role Guide

- **User**: The default role. Can track activities, complete missions, and compete on the leaderboard.
- **Verifier/Admin**: Moderators who review uploaded proof. They have a focused UI showing only the Home and Verify tabs.

## 🛠️ Troubleshooting

### Blank Screen / "Invalid API Key" Error on Vercel
This is usually caused by missing Environment Variables. 
1. Go to your **Vercel Project Settings** > **Environment Variables**.
2. Add all the `VITE_FIREBASE_*` keys from your local `.env` file.
3. Redeploy the project.

### 403 Forbidden / Not Found on Refresh
If you get a 403 or 404 error when refreshing a sub-page (like `/leaderboard`), ensure the `vercel.json` file is present in the root directory. This file handles client-side routing rewrites for React SPAs.


---
Built with 🌱 by the Carbon-X Team.

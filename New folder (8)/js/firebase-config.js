/**
 * TECHNORA'26 — ROUND 1: DEBUG ARENA
 * Firebase SDK v10+ Modular Configuration
 * 
 * Replace the credentials below with your Firebase Project Configuration
 * from Firebase Console -> Project Settings -> General -> Your apps -> Web app
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// PASTE YOUR FIREBASE CONFIGURATION HERE:
// ==========================================
export const firebaseConfig = {
  apiKey: "AIzaSyBdANJZ7ZDYk5D7wLdB0tlCri-8_30ecok",
  authDomain: "technora26-d2429.firebaseapp.com",
  projectId: "technora26-d2429",
  storageBucket: "technora26-d2429.firebasestorage.app",
  messagingSenderId: "229930431776",
  appId: "1:229930431776:web:d8d4babb3705ff6a6e1345",
  measurementId: "G-HZEB6L8WMN"
};

// Check if Firebase config is still using default placeholders
export const isConfigured = () => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

// Initialize Primary Firebase Instance
let app;
let auth;
let db;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn("Firebase initialization warning (replace placeholder config in js/firebase-config.js):", err.message);
}

/**
 * Creates a secondary Firebase App instance for Admin user generation.
 * This is CRUCIAL: it allows an authenticated Admin to create new participant
 * Auth accounts without Firebase automatically signing the Admin out.
 */
export function getSecondaryAuth() {
  const SECONDARY_APP_NAME = "TechnoraSecondaryApp";
  const existingApps = getApps();
  let secondaryApp = existingApps.find(a => a.name === SECONDARY_APP_NAME);
  
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  }
  return getAuth(secondaryApp);
}

export { 
  app, 
  auth, 
  db,
  // Auth exports
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  // Firestore exports
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  deleteDoc
};

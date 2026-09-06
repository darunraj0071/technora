/**
 * TECHNORA'26 — Global Right-Click Protection
 */
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
}, true);
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
}, true);

import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc, 
  getDoc,
  isConfigured
} from "./firebase-config.js";

// Toast notification helper
export function showToast(message, type = "info", duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  if (type === "error") {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else if (type === "success") {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  }

  toast.innerHTML = `
    <span style="color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#00f2fe'}; display:flex;">
      ${iconSvg}
    </span>
    <span style="flex:1;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.3s forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Standardizes participant email derivation.
 * Participant IDs (e.g. TECH001) map internally to Firebase Auth emails:
 * e.g., tech001@technora.internal
 */
export function getParticipantEmail(participantId) {
  const trimmed = (participantId || "").trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${cleanId}@technora.internal`;
}

/**
 * Participant Login Handler
 */
export async function loginParticipant(participantId, password) {
  if (!isConfigured()) {
    showToast("Firebase configuration is missing in js/firebase-config.js. Please insert your credentials.", "error", 6000);
    throw new Error("Firebase not configured");
  }

  const email = getParticipantEmail(participantId);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch participant profile in Firestore
    const pDocRef = doc(db, "participants", user.uid);
    const pDocSnap = await getDoc(pDocRef);

    if (!pDocSnap.exists()) {
      await signOut(auth);
      throw new Error("Participant profile not found in symposium records.");
    }

    const participantData = pDocSnap.data();

    // Verify role
    if (participantData.role !== "participant") {
      await signOut(auth);
      throw new Error("Access restricted: Not a registered participant.");
    }

    // Verify status
    if (participantData.isActive === false) {
      await signOut(auth);
      throw new Error("Your participant account is currently deactivated. Please contact event organizers.");
    }

    // Check if participant already attempted
    if (participantData.hasAttempted === true) {
      // Store flag for redirect
      sessionStorage.setItem("technora_already_attempted", "true");
      sessionStorage.setItem("technora_participant_name", participantData.name || participantId);
      sessionStorage.setItem("technora_participant_id", participantData.participantId || participantId);
      window.location.href = "participant.html";
      return { user, data: participantData, alreadyAttempted: true };
    }

    // Cache current participant info
    sessionStorage.setItem("technora_participant_name", participantData.name || participantId);
    sessionStorage.setItem("technora_participant_id", participantData.participantId || participantId);
    sessionStorage.removeItem("technora_already_attempted");

    window.location.href = "participant.html";
    return { user, data: participantData, alreadyAttempted: false };

  } catch (error) {
    let friendlyMessage = "Authentication failed. Please verify your credentials.";
    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      friendlyMessage = "Invalid Team ID or Password. Please re-check your credentials.";
    } else if (error.code === "auth/too-many-requests") {
      friendlyMessage = "Too many failed login attempts. Please wait a moment.";
    } else if (error.message) {
      friendlyMessage = error.message;
    }
    showToast(friendlyMessage, "error");
    throw error;
  }
}

/**
 * Admin Login Handler
 */
export async function loginAdmin(emailOrId, password) {
  if (!isConfigured()) {
    showToast("Firebase configuration is missing in js/firebase-config.js.", "error", 6000);
    throw new Error("Firebase not configured");
  }

  // Allow admin to login via email or admin username (e.g. admin@technora.edu)
  const email = emailOrId.includes("@") ? emailOrId.trim() : `${emailOrId.toLowerCase().trim()}@technora.admin`;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check role in participants collection or admin collection
    const adminDocRef = doc(db, "participants", user.uid);
    const adminSnap = await getDoc(adminDocRef);

    let isAdmin = false;
    if (adminSnap.exists() && adminSnap.data().role === "admin") {
      isAdmin = true;
    } else {
      // Also check settings or admins collection as fallback
      const altAdminDoc = await getDoc(doc(db, "admins", user.uid));
      if (altAdminDoc.exists()) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      await signOut(auth);
      throw new Error("Access Denied: You do not possess administrator privileges.");
    }

    sessionStorage.setItem("technora_admin_authenticated", "true");
    window.location.href = "dashboard.html";
    return user;

  } catch (error) {
    let friendly = "Admin authentication failed.";
    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      friendly = "Invalid Admin Credentials.";
    } else if (error.message) {
      friendly = error.message;
    }
    showToast(friendly, "error");
    throw error;
  }
}

/**
 * Route Guard for Participant Area
 */
export function requireParticipantAuth(callback) {
  if (!isConfigured()) {
    showToast("Firebase is not yet configured. Please update js/firebase-config.js", "warning");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    try {
      const pDoc = await getDoc(doc(db, "participants", user.uid));
      if (!pDoc.exists() || pDoc.data().role !== "participant") {
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }

      if (callback) {
        callback(user, pDoc.data());
      }
    } catch (e) {
      console.error("Auth validation error:", e);
      showToast("Session verification failed. Please log in again.", "error");
    }
  });
}

/**
 * Route Guard for Admin Area
 */
export function requireAdminAuth(callback) {
  if (!isConfigured()) {
    showToast("Firebase is not yet configured. Update js/firebase-config.js", "warning");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    try {
      const pDoc = await getDoc(doc(db, "participants", user.uid));
      const altDoc = await getDoc(doc(db, "admins", user.uid));
      
      const isAdmin = (pDoc.exists() && pDoc.data().role === "admin") || altDoc.exists();

      if (!isAdmin) {
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }

      if (callback) {
        callback(user);
      }
    } catch (e) {
      console.error("Admin verification error:", e);
      window.location.href = "index.html";
    }
  });
}

/**
 * Check if a given UID has admin role
 */
export async function checkAdminStatus(uid) {
  try {
    const pDoc = await getDoc(doc(db, "participants", uid));
    const altDoc = await getDoc(doc(db, "admins", uid));
    return (pDoc.exists() && pDoc.data().role === "admin") || altDoc.exists();
  } catch (e) {
    console.error("Check admin error:", e);
    return false;
  }
}

/**
 * Session Logout
 */
export async function logoutUser(redirectTo = "index.html") {
  try {
    sessionStorage.clear();
    await signOut(auth);
    window.location.href = redirectTo;
  } catch (e) {
    console.error("Sign out error:", e);
    window.location.href = redirectTo;
  }
}

/**
 * TECHNORA'26 — ROUND 1: DEBUG ARENA
 * Participant Rules & Real-time Waiting Room Engine
 */

import { 
  db, 
  doc, 
  onSnapshot, 
  getDoc,
  updateDoc 
} from "./firebase-config.js";
import { 
  requireParticipantAuth, 
  logoutUser, 
  showToast 
} from "./auth.js";

let unsubscribeRoundListener = null;
let currentParticipantUser = null;
let currentParticipantData = null;

// Initialize participant workflow
document.addEventListener("DOMContentLoaded", () => {
  requireParticipantAuth(async (user, data) => {
    currentParticipantUser = user;
    currentParticipantData = data;

    setupUI(user, data);
  });

  // Logout button handler
  const logoutBtn = document.getElementById("participant-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => logoutUser("index.html"));
  }
});

function setupUI(user, participantData) {
  const participantNameEl = document.getElementById("participant-name-display");
  const participantIdEl = document.getElementById("participant-id-display");
  
  if (participantNameEl) participantNameEl.textContent = participantData.name || "Participant";
  if (participantIdEl) participantIdEl.textContent = participantData.participantId || user.email;

  // 1. Check if participant already attempted
  if (participantData.hasAttempted === true) {
    showAlreadyAttemptedView(participantData);
    return;
  }

  // Check if participant already accepted rules during current session
  const rulesAccepted = sessionStorage.getItem("technora_rules_accepted");
  if (rulesAccepted === "true") {
    showWaitingRoom();
  } else {
    showRulesScreen();
  }
}

function showAlreadyAttemptedView(data) {
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (rulesSection) rulesSection.classList.add("hidden");
  if (waitingSection) waitingSection.classList.add("hidden");
  if (completedSection) {
    completedSection.classList.remove("hidden");
    const scoreVal = document.getElementById("completed-score-val");
    if (scoreVal && data.score !== undefined) {
      scoreVal.textContent = `${data.score} / 20`;
    }
  }
}

function showRulesScreen() {
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (rulesSection) rulesSection.classList.remove("hidden");
  if (waitingSection) waitingSection.classList.add("hidden");
  if (completedSection) completedSection.classList.add("hidden");

  const understandBtn = document.getElementById("btn-rules-understand");
  if (understandBtn) {
    understandBtn.addEventListener("click", () => {
      sessionStorage.setItem("technora_rules_accepted", "true");
      showWaitingRoom();
    });
  }
}

function showWaitingRoom() {
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (rulesSection) rulesSection.classList.add("hidden");
  if (waitingSection) waitingSection.classList.remove("hidden");
  if (completedSection) completedSection.classList.add("hidden");

  startRoundStatusListener();
}

/**
 * Real-time Firestore Listener on settings/round1
 */
function startRoundStatusListener() {
  if (unsubscribeRoundListener) {
    unsubscribeRoundListener();
  }

  const roundDocRef = doc(db, "settings", "round1");

  unsubscribeRoundListener = onSnapshot(roundDocRef, (docSnap) => {
    const statusPill = document.getElementById("waiting-status-pill");
    const waitingHeading = document.getElementById("waiting-heading");
    const waitingSub = document.getElementById("waiting-subtext");
    const pulseRing = document.getElementById("waiting-pulse-indicator");

    if (!docSnap.exists()) {
      if (statusPill) statusPill.textContent = "WAITING";
      if (waitingSub) waitingSub.textContent = "Waiting for administrator to initialize the arena...";
      return;
    }

    const roundData = docSnap.data();
    const status = (roundData.status || "WAITING").toUpperCase();

    if (status === "LIVE") {
      // Round is Live! Trigger auto-redirect to quiz.html
      if (statusPill) {
        statusPill.className = "badge-tech badge-live";
        statusPill.textContent = "ARENA LIVE";
      }
      if (waitingHeading) waitingHeading.textContent = "ROUND STARTED!";
      if (waitingSub) waitingSub.textContent = "Get ready... Initializing your randomized debug session...";
      
      showToast("Round 1 has begun! Teleporting to Debug Arena...", "success", 2000);

      // Smooth auto-redirect within 1.2 seconds
      setTimeout(() => {
        window.location.href = "quiz.html";
      }, 1200);

    } else if (status === "ENDED") {
      if (statusPill) {
        statusPill.className = "badge-tech badge-ended";
        statusPill.textContent = "ROUND ENDED";
      }
      if (waitingHeading) waitingHeading.textContent = "ARENA HAS CONCLUDED";
      if (waitingSub) waitingSub.textContent = "Round 1 has been concluded by the event administrators.";
      if (pulseRing) pulseRing.style.display = "none";

    } else {
      // WAITING state
      if (statusPill) {
        statusPill.className = "badge-tech badge-waiting";
        statusPill.textContent = "WAITING FOR ADMIN";
      }
      if (waitingHeading) waitingHeading.textContent = "WAITING FOR ADMIN TO START...";
      if (waitingSub) waitingSub.textContent = "Please wait. The arena will automatically initiate the moment the host begins the round.";
      if (pulseRing) pulseRing.style.display = "flex";
    }
  }, (error) => {
    console.error("Error listening to round status:", error);
    showToast("Network error syncing arena status. Reconnecting...", "error");
  });
}

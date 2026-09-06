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
  
  if (participantNameEl) participantNameEl.textContent = participantData.name || participantData.teamName || "Team";
  if (participantIdEl) participantIdEl.textContent = `Team ID: ${participantData.participantId || user.email}`;

  // 1. Check if participant already attempted
  if (participantData.hasAttempted === true) {
    showAlreadyAttemptedView(participantData);
    return;
  }

  const generalAccepted = sessionStorage.getItem("technora_general_rules_accepted");
  const r1Accepted = sessionStorage.getItem("technora_rules_accepted");

  if (generalAccepted === "true" && r1Accepted === "true") {
    showWaitingRoom();
  } else if (generalAccepted === "true") {
    showRound1RulesScreen();
  } else {
    showGeneralRulesScreen();
  }
}

function showAlreadyAttemptedView(data) {
  const genSection = document.getElementById("general-rules-section");
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (genSection) genSection.classList.add("hidden");
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

function showGeneralRulesScreen() {
  const genSection = document.getElementById("general-rules-section");
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (genSection) genSection.classList.remove("hidden");
  if (rulesSection) rulesSection.classList.add("hidden");
  if (waitingSection) waitingSection.classList.add("hidden");
  if (completedSection) completedSection.classList.add("hidden");

  const understandGenBtn = document.getElementById("btn-general-rules-understand");
  if (understandGenBtn) {
    understandGenBtn.addEventListener("click", () => {
      sessionStorage.setItem("technora_general_rules_accepted", "true");
      showRound1RulesScreen();
    });
  }
}

function showRound1RulesScreen() {
  const genSection = document.getElementById("general-rules-section");
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (genSection) genSection.classList.add("hidden");
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
  const genSection = document.getElementById("general-rules-section");
  const rulesSection = document.getElementById("rules-section");
  const waitingSection = document.getElementById("waiting-section");
  const completedSection = document.getElementById("completed-section");

  if (genSection) genSection.classList.add("hidden");
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
      if (waitingSub) waitingSub.textContent = "Waiting for tournament broadcast to initialize...";
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
      if (waitingSub) waitingSub.textContent = "Round 1 has officially concluded.";
      if (pulseRing) pulseRing.style.display = "none";

    } else {
      // WAITING state
      if (statusPill) {
        statusPill.className = "badge-tech badge-waiting";
        statusPill.textContent = "WAITING TO COMMENCE";
      }
      if (waitingHeading) waitingHeading.textContent = "WAITING FOR ROUND TO START...";
      if (waitingSub) waitingSub.textContent = "Please wait. The arena will automatically launch the moment Round 1 begins.";
      if (pulseRing) pulseRing.style.display = "flex";
    }
  }, (error) => {
    console.error("Error listening to round status:", error);
    showToast("Network error syncing arena status. Reconnecting...", "error");
  });
}

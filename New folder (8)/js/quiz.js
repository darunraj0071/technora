/**
 * TECHNORA'26 — ROUND 1: DEBUG ARENA
 * Quiz Engine: Randomized Question & Option Shuffling, Server-Based Timer,
 * Real-time Auto-save, Anti-Cheat Violation Tracker & Secure Submission
 */

import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  serverTimestamp 
} from "./firebase-config.js";
import { 
  requireParticipantAuth, 
  showToast 
} from "./auth.js";
import { DEFAULT_QUESTIONS } from "./default-questions.js";

// Global Quiz State
let currentUser = null;
let currentParticipant = null;
let roundSettings = null;

let allQuestionsMap = {}; // questionId -> questionObj
let orderedQuestionIds = []; // ["q07", "q02", ...]
let optionMappings = {}; // questionId -> array of original indices [2, 0, 3, 1]
let userAnswers = {}; // questionId -> chosen shuffled index (0..3)
let flaggedQuestions = new Set(); // Set of questionIds marked for review

let currentQuestionIndex = 0; // 0 to 19
let violationCount = 0;
let timerInterval = null;
let autoSyncInterval = null;
let roundStartTimeMs = null;
let roundDurationSeconds = 1200; // 20 mins default
let isSubmitting = false;

// Initialize Quiz Arena
document.addEventListener("DOMContentLoaded", () => {
  requireParticipantAuth(async (user, participantData) => {
    currentUser = user;
    currentParticipant = participantData;

    // Check if participant has already submitted
    if (participantData.hasAttempted) {
      window.location.href = "result.html";
      return;
    }

    await initializeQuizArena();
  });
});

/**
 * Main Setup Flow
 */
async function initializeQuizArena() {
  try {
    // 1. Fetch Round Settings
    const roundSnap = await getDoc(doc(db, "settings", "round1"));
    if (!roundSnap.exists()) {
      showToast("Round settings not found. Contact Admin.", "error");
      setTimeout(() => window.location.href = "participant.html", 2000);
      return;
    }

    roundSettings = roundSnap.data();
    if (roundSettings.status !== "LIVE") {
      showToast("Round 1 is not currently active.", "warning");
      setTimeout(() => window.location.href = "participant.html", 1500);
      return;
    }

    roundDurationSeconds = roundSettings.duration || 1200;
    
    // Calculate server start time
    if (roundSettings.startTime) {
      if (roundSettings.startTime.toMillis) {
        roundStartTimeMs = roundSettings.startTime.toMillis();
      } else if (roundSettings.startTime.seconds) {
        roundStartTimeMs = roundSettings.startTime.seconds * 1000;
      } else {
        roundStartTimeMs = new Date(roundSettings.startTime).getTime();
      }
    } else {
      roundStartTimeMs = Date.now();
    }

    // 2. Fetch or Load Question Bank
    await loadQuestionBank();

    // 3. Load or Initialize Participant's Randomized Attempt
    await loadOrInitializeAttempt();

    // 4. Start Server Timer
    startServerSyncedTimer();

    // 5. Setup Real-time Round Status Listener (in case admin ENDS round)
    setupAdminRoundListener();

    // 6. Setup Anti-Cheat Surveillance
    setupAntiCheatMonitors();

    // 7. Setup Auto-sync to Firestore every 12 seconds
    autoSyncInterval = setInterval(syncAttemptToFirestore, 12000);

    // 8. Render UI
    renderCurrentQuestion();
    renderNavigatorPalette();
    bindQuizEvents();

  } catch (error) {
    console.error("Quiz initialization error:", error);
    showToast("Failed to load test session. Please refresh.", "error");
  }
}

/**
 * Load Question Bank from Firestore or fallback to standard 20 verified questions
 */
async function loadQuestionBank() {
  try {
    const qCol = collection(db, "questions");
    const qSnapshot = await getDocs(qCol);

    if (!qSnapshot.empty && qSnapshot.size >= 10) {
      qSnapshot.forEach((docSnap) => {
        const qData = docSnap.data();
        if (qData.active !== false) {
          allQuestionsMap[docSnap.id] = { id: docSnap.id, ...qData };
        }
      });
    } else {
      // Use the verified 20 default questions
      DEFAULT_QUESTIONS.forEach(q => {
        allQuestionsMap[q.id] = q;
      });
    }
  } catch (e) {
    console.warn("Using offline default questions due to error:", e);
    DEFAULT_QUESTIONS.forEach(q => {
      allQuestionsMap[q.id] = q;
    });
  }
}

/**
 * Load Existing Attempt or Generate New Shuffled Order
 */
async function loadOrInitializeAttempt() {
  const attemptRef = doc(db, "attempts", currentUser.uid);
  const attemptSnap = await getDoc(attemptRef);

  const localSavedAnswers = localStorage.getItem(`technora_ans_${currentUser.uid}`);
  const localSavedFlags = localStorage.getItem(`technora_flags_${currentUser.uid}`);
  const localViolations = localStorage.getItem(`technora_violation_${currentUser.uid}`);

  if (attemptSnap.exists()) {
    const data = attemptSnap.data();
    orderedQuestionIds = data.questionOrder || [];
    optionMappings = data.optionMappings || {};
    userAnswers = data.answers || (localSavedAnswers ? JSON.parse(localSavedAnswers) : {});
    flaggedQuestions = new Set(data.flags || (localSavedFlags ? JSON.parse(localSavedFlags) : []));
    violationCount = data.violationCount || parseInt(localViolations || "0", 10);
  } else {
    // Generate randomized order for this participant
    const qIds = Object.keys(allQuestionsMap);
    orderedQuestionIds = shuffleArray([...qIds]).slice(0, 20);

    // For every question, generate random permutation of options [0, 1, 2, 3]
    optionMappings = {};
    orderedQuestionIds.forEach(qId => {
      optionMappings[qId] = shuffleArray([0, 1, 2, 3]);
    });

    userAnswers = localSavedAnswers ? JSON.parse(localSavedAnswers) : {};
    flaggedQuestions = new Set(localSavedFlags ? JSON.parse(localSavedFlags) : []);
    violationCount = parseInt(localViolations || "0", 10);

    // Save initial attempt document to Firestore
    await setDoc(attemptRef, {
      uid: currentUser.uid,
      participantId: currentParticipant.participantId || currentUser.email,
      name: currentParticipant.name || "Participant",
      questionOrder: orderedQuestionIds,
      optionMappings: optionMappings,
      answers: userAnswers,
      flags: Array.from(flaggedQuestions),
      violationCount: violationCount,
      status: "IN_PROGRESS",
      startedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    });

    // Update participant status
    await updateDoc(doc(db, "participants", currentUser.uid), {
      status: "IN PROGRESS"
    });
  }
}

/**
 * Modern Fisher-Yates Shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Server Synced Countdown Timer
 */
function startServerSyncedTimer() {
  const timerDisplay = document.getElementById("quiz-timer-text");
  const timerBox = document.getElementById("quiz-timer-box");

  const updateTimer = () => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - roundStartTimeMs) / 1000);
    const remainingSeconds = Math.max(0, roundDurationSeconds - elapsedSeconds);

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timerDisplay) {
      timerDisplay.textContent = formatted;
    }

    // Dynamic warning visual states
    if (timerBox) {
      if (remainingSeconds <= 120) {
        timerBox.className = "quiz-timer-display timer-critical";
      } else if (remainingSeconds <= 300) {
        timerBox.className = "quiz-timer-display timer-warning";
      } else {
        timerBox.className = "quiz-timer-display";
      }
    }

    // Time expired: Trigger auto-submit
    if (remainingSeconds <= 0 && !isSubmitting) {
      clearInterval(timerInterval);
      showToast("Time's up! Submitting your debug session...", "warning", 4000);
      submitQuiz(true); // true = auto submit
    }
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Listen for Admin ending the round remotely
 */
function setupAdminRoundListener() {
  onSnapshot(doc(db, "settings", "round1"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.status === "ENDED" && !isSubmitting) {
        showToast("ROUND ENDED BY ADMIN. Submitting answers...", "error", 4000);
        submitQuiz(true);
      }
    }
  });
}

/**
 * Anti-Cheat Surveillance Engine
 */
function setupAntiCheatMonitors() {
  const logViolation = (reason) => {
    if (isSubmitting) return;

    violationCount++;
    localStorage.setItem(`technora_violation_${currentUser.uid}`, violationCount.toString());

    // Show warning alert banner / modal
    showAntiCheatWarning(reason, violationCount);

    // Update Firestore attempt violation count
    updateDoc(doc(db, "attempts", currentUser.uid), {
      violationCount: violationCount,
      lastViolationReason: reason,
      lastActiveAt: serverTimestamp()
    }).catch(err => console.error("Violation sync error:", err));

    // Also update participant doc for instant admin view
    updateDoc(doc(db, "participants", currentUser.uid), {
      violationCount: violationCount
    }).catch(err => console.error("Participant violation sync error:", err));
  };

  // 1. Tab visibility change (switching tabs)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      logViolation("Tab switch or window minimized");
    }
  });

  // 2. Window blur (clicking outside browser window)
  window.addEventListener("blur", () => {
    logViolation("Focus lost from exam arena");
  });

  // 3. Prevent accidental reload
  window.addEventListener("beforeunload", (e) => {
    if (!isSubmitting) {
      e.preventDefault();
      e.returnValue = "Leaving or reloading will not provide extra time. Continue?";
      return e.returnValue;
    }
  });
}

function showAntiCheatWarning(reason, count) {
  const modal = document.getElementById("anti-cheat-modal");
  const countEl = document.getElementById("violation-count-display");
  const reasonEl = document.getElementById("violation-reason-display");

  if (countEl) countEl.textContent = count;
  if (reasonEl) reasonEl.textContent = reason;
  if (modal) modal.classList.remove("hidden");
}

/**
 * Render Current Question Card
 */
function renderCurrentQuestion() {
  if (orderedQuestionIds.length === 0) return;

  const currentQId = orderedQuestionIds[currentQuestionIndex];
  const qData = allQuestionsMap[currentQId];

  if (!qData) return;

  // Header indices
  const qNumDisplay = document.getElementById("question-number-display");
  const qProgressText = document.getElementById("question-progress-text");
  const qCategoryBadge = document.getElementById("question-category-badge");
  const qProgressBar = document.getElementById("quiz-progress-bar");

  if (qNumDisplay) qNumDisplay.textContent = `QUESTION ${String(currentQuestionIndex + 1).padStart(2, '0')}`;
  if (qProgressText) qProgressText.textContent = `${currentQuestionIndex + 1} / ${orderedQuestionIds.length}`;
  if (qCategoryBadge) qCategoryBadge.textContent = qData.category || "General";
  
  if (qProgressBar) {
    const pct = ((currentQuestionIndex + 1) / orderedQuestionIds.length) * 100;
    qProgressBar.style.width = `${pct}%`;
  }

  // Question Content (Format markdown code blocks cleanly)
  const questionContentArea = document.getElementById("question-body-content");
  if (questionContentArea) {
    questionContentArea.innerHTML = formatQuestionText(qData.question);
  }

  // Options
  const optionsListContainer = document.getElementById("options-list-container");
  if (optionsListContainer) {
    optionsListContainer.innerHTML = "";

    const mapping = optionMappings[currentQId] || [0, 1, 2, 3];
    const letters = ["A", "B", "C", "D"];
    const chosenShuffledIndex = userAnswers[currentQId];

    mapping.forEach((origIdx, shuffledIdx) => {
      const optionText = qData.options[origIdx];
      const isSelected = chosenShuffledIndex === shuffledIdx;

      const optBtn = document.createElement("div");
      optBtn.className = `option-item ${isSelected ? "selected" : ""}`;
      optBtn.setAttribute("data-shuffled-index", shuffledIdx);

      optBtn.innerHTML = `
        <div class="option-badge">${letters[shuffledIdx]}</div>
        <div class="option-text">${escapeHtml(optionText)}</div>
      `;

      optBtn.addEventListener("click", () => selectOption(currentQId, shuffledIdx));
      optionsListContainer.appendChild(optBtn);
    });
  }

  // Update Review Button State
  const flagBtn = document.getElementById("btn-flag-review");
  if (flagBtn) {
    const isFlagged = flaggedQuestions.has(currentQId);
    flagBtn.innerHTML = isFlagged 
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> UNMARK REVIEW` 
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> MARK FOR REVIEW`;
  }

  // Navigation button states
  const prevBtn = document.getElementById("btn-prev-question");
  const nextBtn = document.getElementById("btn-next-question");
  if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
  if (nextBtn) {
    if (currentQuestionIndex === orderedQuestionIds.length - 1) {
      nextBtn.textContent = "REVIEW & SUBMIT";
    } else {
      nextBtn.innerHTML = `NEXT <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    }
  }

  // Highlight active palette cell
  updatePaletteHighlights();
}

/**
 * Handle Option Selection
 */
function selectOption(qId, shuffledIdx) {
  userAnswers[qId] = shuffledIdx;

  // Immediate LocalStorage persist
  localStorage.setItem(`technora_ans_${currentUser.uid}`, JSON.stringify(userAnswers));

  // Visual refresh
  renderCurrentQuestion();
  renderNavigatorPalette();

  // Show quick save pulse
  showAutoSaveIndicator();
}

/**
 * Clear current response
 */
function clearCurrentResponse() {
  const currentQId = orderedQuestionIds[currentQuestionIndex];
  delete userAnswers[currentQId];

  localStorage.setItem(`technora_ans_${currentUser.uid}`, JSON.stringify(userAnswers));
  renderCurrentQuestion();
  renderNavigatorPalette();
  showToast("Response cleared for this question.", "info", 1500);
}

/**
 * Toggle Mark for Review
 */
function toggleMarkForReview() {
  const currentQId = orderedQuestionIds[currentQuestionIndex];
  if (flaggedQuestions.has(currentQId)) {
    flaggedQuestions.delete(currentQId);
  } else {
    flaggedQuestions.add(currentQId);
  }

  localStorage.setItem(`technora_flags_${currentUser.uid}`, JSON.stringify(Array.from(flaggedQuestions)));
  renderCurrentQuestion();
  renderNavigatorPalette();
}

/**
 * Render Question Navigator Palette (1 to 20)
 */
function renderNavigatorPalette() {
  const paletteContainer = document.getElementById("navigator-palette-grid");
  if (!paletteContainer) return;

  paletteContainer.innerHTML = "";

  orderedQuestionIds.forEach((qId, idx) => {
    const isAnswered = userAnswers[qId] !== undefined;
    const isFlagged = flaggedQuestions.has(qId);
    const isCurrent = idx === currentQuestionIndex;

    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.textContent = String(idx + 1).padStart(2, '0');

    if (isCurrent) btn.classList.add("current");
    if (isAnswered && isFlagged) {
      btn.classList.add("flagged-answered");
    } else if (isAnswered) {
      btn.classList.add("answered");
    } else if (isFlagged) {
      btn.classList.add("flagged");
    }

    btn.addEventListener("click", () => {
      currentQuestionIndex = idx;
      renderCurrentQuestion();
    });

    paletteContainer.appendChild(btn);
  });

  // Update question counts in summary
  const answeredCount = Object.keys(userAnswers).length;
  const answeredCountEl = document.getElementById("palette-answered-count");
  const remainingCountEl = document.getElementById("palette-remaining-count");
  if (answeredCountEl) answeredCountEl.textContent = answeredCount;
  if (remainingCountEl) remainingCountEl.textContent = orderedQuestionIds.length - answeredCount;
}

function updatePaletteHighlights() {
  const paletteContainer = document.getElementById("navigator-palette-grid");
  if (!paletteContainer) return;
  const buttons = paletteContainer.querySelectorAll(".palette-btn");
  buttons.forEach((btn, idx) => {
    if (idx === currentQuestionIndex) {
      btn.classList.add("current");
    } else {
      btn.classList.remove("current");
    }
  });
}

/**
 * Periodic Sync to Firestore attempts/{uid}
 */
async function syncAttemptToFirestore() {
  if (!currentUser || isSubmitting) return;

  try {
    const answeredCount = Object.keys(userAnswers).length;

    await updateDoc(doc(db, "attempts", currentUser.uid), {
      answers: userAnswers,
      flags: Array.from(flaggedQuestions),
      violationCount: violationCount,
      lastActiveAt: serverTimestamp(),
      answeredCount: answeredCount
    });

    await updateDoc(doc(db, "participants", currentUser.uid), {
      answeredCount: answeredCount,
      status: "IN PROGRESS"
    });

    showAutoSaveIndicator();
  } catch (err) {
    console.warn("Silent sync attempt error:", err.message);
  }
}

function showAutoSaveIndicator() {
  const saveIndicator = document.getElementById("save-indicator-badge");
  if (saveIndicator) {
    saveIndicator.style.opacity = "1";
    setTimeout(() => {
      saveIndicator.style.opacity = "0.4";
    }, 1500);
  }
}

/**
 * Submit Quiz (Manual confirmation or auto-submit)
 */
export async function submitQuiz(isAuto = false) {
  if (isSubmitting) return;
  isSubmitting = true;

  clearInterval(timerInterval);
  clearInterval(autoSyncInterval);

  showToast("Computing arena results and finalizing submission...", "info", 5000);

  try {
    const now = Date.now();
    const elapsedSeconds = Math.min(
      roundDurationSeconds,
      Math.max(1, Math.floor((now - roundStartTimeMs) / 1000))
    );

    // Score Calculation
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    orderedQuestionIds.forEach(qId => {
      const qData = allQuestionsMap[qId];
      const chosenShuffledIdx = userAnswers[qId];

      if (chosenShuffledIdx === undefined) {
        unansweredCount++;
      } else {
        // Find which original option index this shuffled option mapped to
        const mapping = optionMappings[qId] || [0, 1, 2, 3];
        const originalOptionChosen = mapping[chosenShuffledIdx];

        if (originalOptionChosen === qData.correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const finalScore = correctCount; // 1 mark per correct answer, no negative marking

    // 1. Write to results/{uid}
    await setDoc(doc(db, "results", currentUser.uid), {
      uid: currentUser.uid,
      participantId: currentParticipant.participantId || currentUser.email,
      name: currentParticipant.name || "Participant",
      score: finalScore,
      totalQuestions: orderedQuestionIds.length,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      timeTaken: formatTime(elapsedSeconds),
      timeTakenSeconds: elapsedSeconds,
      violationCount: violationCount,
      submittedAt: serverTimestamp(),
      isAutoSubmitted: isAuto
    });

    // 2. Update participant document
    await updateDoc(doc(db, "participants", currentUser.uid), {
      hasAttempted: true,
      status: "COMPLETED",
      score: finalScore,
      timeTaken: formatTime(elapsedSeconds),
      completedAt: serverTimestamp()
    });

    // 3. Update attempt status
    await updateDoc(doc(db, "attempts", currentUser.uid), {
      status: "SUBMITTED",
      submittedAt: serverTimestamp()
    });

    // Cache results in session storage for fast display on result.html
    sessionStorage.setItem("technora_latest_result", JSON.stringify({
      score: finalScore,
      total: orderedQuestionIds.length,
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      timeTaken: formatTime(elapsedSeconds),
      participantId: currentParticipant.participantId || currentUser.email,
      name: currentParticipant.name || "Participant"
    }));

    // Clear local storage exam tokens
    localStorage.removeItem(`technora_ans_${currentUser.uid}`);
    localStorage.removeItem(`technora_flags_${currentUser.uid}`);
    localStorage.removeItem(`technora_violation_${currentUser.uid}`);

    window.location.href = "result.html";

  } catch (error) {
    console.error("Submission failed:", error);
    isSubmitting = false;
    showToast("Submission encountered a network error. Retrying...", "error");
    // Retry once after 2 seconds
    setTimeout(() => submitQuiz(isAuto), 2000);
  }
}

/**
 * Format Question text (supporting markdown code blocks)
 */
function formatQuestionText(text) {
  if (!text) return "";
  
  // Replace ```c ... ``` or ```python ... ``` with styled code block
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let formatted = text.replace(codeBlockRegex, (match, lang, code) => {
    return `<div class="code-block">${escapeHtml(code.trim())}</div>`;
  });

  // Replace single newlines with breaks
  formatted = formatted.replace(/\n\n/g, "<br/><br/>");

  return formatted;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Bind DOM Event Listeners
 */
function bindQuizEvents() {
  const prevBtn = document.getElementById("btn-prev-question");
  const nextBtn = document.getElementById("btn-next-question");
  const clearBtn = document.getElementById("btn-clear-response");
  const flagBtn = document.getElementById("btn-flag-review");
  const submitTriggerBtn = document.getElementById("btn-trigger-submit");

  const confirmModal = document.getElementById("submit-confirm-modal");
  const modalCancelBtn = document.getElementById("btn-modal-cancel");
  const modalConfirmBtn = document.getElementById("btn-modal-confirm");
  const closeAntiCheatBtn = document.getElementById("btn-close-violation-modal");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentQuestionIndex < orderedQuestionIds.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
      } else {
        // On last question, clicking NEXT opens the submit modal
        openSubmitModal();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearCurrentResponse);
  }

  if (flagBtn) {
    flagBtn.addEventListener("click", toggleMarkForReview);
  }

  if (submitTriggerBtn) {
    submitTriggerBtn.addEventListener("click", openSubmitModal);
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", () => {
      if (confirmModal) confirmModal.classList.add("hidden");
    });
  }

  if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener("click", () => {
      if (confirmModal) confirmModal.classList.add("hidden");
      submitQuiz(false);
    });
  }

  if (closeAntiCheatBtn) {
    closeAntiCheatBtn.addEventListener("click", () => {
      const modal = document.getElementById("anti-cheat-modal");
      if (modal) modal.classList.add("hidden");
    });
  }
}

function openSubmitModal() {
  const confirmModal = document.getElementById("submit-confirm-modal");
  const modalAnswered = document.getElementById("modal-summary-answered");
  const modalUnanswered = document.getElementById("modal-summary-unanswered");
  const modalFlagged = document.getElementById("modal-summary-flagged");

  const ansCount = Object.keys(userAnswers).length;
  const unansCount = orderedQuestionIds.length - ansCount;

  if (modalAnswered) modalAnswered.textContent = ansCount;
  if (modalUnanswered) modalUnanswered.textContent = unansCount;
  if (modalFlagged) modalFlagged.textContent = flaggedQuestions.size;

  if (confirmModal) confirmModal.classList.remove("hidden");
}

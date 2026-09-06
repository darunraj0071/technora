/**
 * TECHNORA'26 — ROUND 2: CODE BREAKER
 * Core Participant Assessment Engine
 */

import { 
  db, 
  auth, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp 
} from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { showToast } from "./auth.js";
import { ROUND2_PROBLEMS } from "./round2-problems.js";
import { executeCode, runTestCases } from "./code-execution.js";
import { initAntiCheat as initSecurityGuard } from "./anti-cheat.js";

// State
let currentUser = null;
let participantDoc = null;
let attemptDoc = null;
let lockedLanguage = null;
let currentProblemIndex = 0;
let problems = ROUND2_PROBLEMS;
let roundSettings = null;
let timerInterval = null;
let autoSaveTimeout = null;
let violationCount = 0;

// Elements
const waitingModal = document.getElementById("r2-waiting-modal");
const rulesModal = document.getElementById("r2-rules-modal");
const langModal = document.getElementById("r2-lang-modal");
const submitConfirmModal = document.getElementById("r2-submit-confirm-modal");
const codeTextarea = document.getElementById("ide-code-textarea");
const lineNumbersEl = document.getElementById("ide-line-numbers");
const autoSaveStatusEl = document.getElementById("auto-save-indicator");
const timerDigitsEl = document.getElementById("ide-timer-digits");

// =========================================================================
// 1. INITIALIZATION & AUTH GUARD
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  initLineNumbers();
  setupTextareaTabKey();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user;

    try {
      // Check participant doc
      const pSnap = await getDoc(doc(db, "participants", user.uid));
      if (!pSnap.exists() || pSnap.data().role !== "participant") {
        showToast("Access Denied: Invalid participant account.", "error");
        window.location.href = "index.html";
        return;
      }
      participantDoc = pSnap.data();

      // Check qualification for Round 2
      if (participantDoc.qualifiedForRound2 === false) {
        showToast("Access Denied: Your team was not qualified for Round 2.", "warning");
        setTimeout(() => { window.location.href = "result.html"; }, 1500);
        return;
      }

      // Check if candidate already submitted Round 2
      const resSnap = await getDoc(doc(db, "round2Results", user.uid));
      if (resSnap.exists()) {
        window.location.href = "round2-result.html";
        return;
      }

      // Load or Initialize Attempt State
      await loadAttemptState();

      // Setup Real-time Listener on settings/round2
      listenToRound2Settings();

      // Setup Anti-Cheat
      initAntiCheat();

      // Setup Action Listeners
      initActionListeners();

    } catch (err) {
      console.error("Init Round 2 error:", err);
      showToast("Error initializing Round 2 session: " + err.message, "error");
    }
  });
});

// =========================================================================
// 2. REAL-TIME ROUND 2 STATE & WAITING ROOM
// =========================================================================

function listenToRound2Settings() {
  onSnapshot(doc(db, "settings", "round2"), (snap) => {
    if (!snap.exists()) {
      showWaitingModal("WAITING FOR CONVENOR TO CONFIGURE ROUND 2...");
      return;
    }

    roundSettings = snap.data();
    const status = roundSettings.status || "WAITING";

    if (status === "WAITING") {
      showWaitingModal("Waiting for Round 2 to commence...");
    } else if (status === "LIVE") {
      hideWaitingModal();
      handleRoundLive();
    } else if (status === "ENDED") {
      handleRoundEnded();
    }
  });
}

function showWaitingModal(msg) {
  if (waitingModal) {
    waitingModal.classList.remove("hidden");
    const msgEl = document.getElementById("r2-waiting-msg");
    if (msgEl) msgEl.textContent = msg;
  }
}

function hideWaitingModal() {
  if (waitingModal) waitingModal.classList.add("hidden");
}

function handleRoundLive() {
  // Start server-synced countdown timer
  startTimer();

  // If language not locked, show rules & language selection
  if (!lockedLanguage) {
    if (rulesModal) rulesModal.classList.remove("hidden");
  } else {
    // Already has locked language, display problem
    renderCurrentProblem();
  }
}

function handleRoundEnded() {
  if (timerInterval) clearInterval(timerInterval);
  showToast("ROUND 2 HAS CONCLUDED. Submitting your current solutions...", "warning");
  setTimeout(() => {
    finalizeRound2Submission(true);
  }, 1500);
}

// =========================================================================
// 3. ATTEMPT STATE & LANGUAGE LOCK
// =========================================================================

async function loadAttemptState() {
  const attemptRef = doc(db, "round2Attempts", currentUser.uid);
  const snap = await getDoc(attemptRef);

  if (snap.exists()) {
    attemptDoc = snap.data();
    lockedLanguage = attemptDoc.language || null;
    violationCount = attemptDoc.violationCount || 0;

    if (lockedLanguage) {
      updateLanguageBadge(lockedLanguage);
    }
  } else {
    // Initial attempt template
    attemptDoc = {
      participantId: participantDoc.participantId,
      name: participantDoc.name,
      language: null,
      code: {},
      problemStatus: { p1: "not_attempted", p2: "not_attempted", p3: "not_attempted", p4: "not_attempted" },
      scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
      violationCount: 0,
      startedAt: serverTimestamp()
    };
    await setDoc(attemptRef, attemptDoc);
  }
}

function updateLanguageBadge(lang) {
  const badgeEl = document.getElementById("ide-locked-lang-badge");
  if (badgeEl) {
    const names = { python: "Python 3", cpp: "C++ (GCC)", c: "C (GCC)", java: "Java (OpenJDK)" };
    badgeEl.textContent = names[lang] || lang.toUpperCase();
  }
}

// Rules Confirmation -> Show Language Modal
document.getElementById("btn-r2-rules-accept")?.addEventListener("click", () => {
  if (rulesModal) rulesModal.classList.add("hidden");
  if (langModal) langModal.classList.remove("hidden");
});

// Language Card Selection
let selectedLangTemp = null;
document.querySelectorAll(".lang-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".lang-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedLangTemp = card.getAttribute("data-lang");
    const lockBtn = document.getElementById("btn-lock-language");
    if (lockBtn) lockBtn.disabled = false;
  });
});

// Lock Language Permanently
document.getElementById("btn-lock-language")?.addEventListener("click", async () => {
  if (!selectedLangTemp) return;

  if (!confirm(`LOCK LANGUAGE: ${selectedLangTemp.toUpperCase()}?\n\nYou cannot change your programming language after this point.`)) {
    return;
  }

  lockedLanguage = selectedLangTemp;
  attemptDoc.language = lockedLanguage;

  try {
    await updateDoc(doc(db, "round2Attempts", currentUser.uid), {
      language: lockedLanguage,
      startedAt: serverTimestamp()
    });

    if (langModal) langModal.classList.add("hidden");
    updateLanguageBadge(lockedLanguage);
    showToast(`Programming language locked: ${lockedLanguage.toUpperCase()}`, "success");
    renderCurrentProblem();
  } catch (err) {
    showToast("Error locking language: " + err.message, "error");
  }
});

// =========================================================================
// 4. PROBLEM DISPLAY & CODE EDITOR
// =========================================================================

function renderCurrentProblem() {
  const prob = problems[currentProblemIndex];
  if (!prob) return;

  // Update Left Pane: Title & Category
  document.getElementById("prob-title").textContent = `Problem ${prob.number}: ${prob.title}`;
  document.getElementById("prob-category").textContent = prob.category;
  document.getElementById("prob-difficulty").textContent = prob.difficulty;
  document.getElementById("prob-time-limit").textContent = `${prob.timeLimit}s`;
  document.getElementById("prob-memory-limit").textContent = prob.memoryLimit;

  // Description
  const descEl = document.getElementById("prob-description-content");
  descEl.innerHTML = formatMarkdown(prob.description);

  // Examples
  const exEl = document.getElementById("prob-examples-container");
  exEl.innerHTML = prob.examples.map((ex, i) => `
    <div class="example-box">
      <div class="text-sky-300 font-bold mb-1">Example ${i + 1}</div>
      <div class="text-slate-400">Input:</div>
      <div class="text-white bg-slate-900/80 p-2 rounded my-1">${escapeHtml(ex.input)}</div>
      <div class="text-slate-400">Output:</div>
      <div class="text-white bg-slate-900/80 p-2 rounded my-1">${escapeHtml(ex.output)}</div>
      ${ex.explanation ? `<div class="text-xs text-slate-400 mt-1"><em>Explanation: ${escapeHtml(ex.explanation)}</em></div>` : ''}
    </div>
  `).join("");

  // Update Problem Nav Tabs
  updateProblemTabs();

  // Load Saved Code or Default Starter Code
  loadCodeForProblem(prob.id);

  // Reset Results Console
  resetResultsConsole(prob);
}

function loadCodeForProblem(probId) {
  const lang = lockedLanguage || "python";
  const prob = problems[currentProblemIndex];

  // Check local cache or attemptDoc
  const cached = localStorage.getItem(`r2_code_${currentUser.uid}_${probId}`);
  const remote = attemptDoc?.code?.[probId];
  const initialStarter = prob.starters[lang] || `# Write your ${lang} code here\n`;

  const codeToLoad = cached || remote || initialStarter;
  codeTextarea.value = codeToLoad;
  syncLineNumbers();
}

function saveCurrentProblemCode(silent = false) {
  if (!currentUser) return;
  const probId = problems[currentProblemIndex].id;
  const code = codeTextarea.value;

  // Local storage
  localStorage.setItem(`r2_code_${currentUser.uid}_${probId}`, code);

  // Mark auto-save UI
  if (autoSaveStatusEl) autoSaveStatusEl.textContent = "Saving...";

  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      const updatePayload = {};
      updatePayload[`code.${probId}`] = code;

      // Mark problem in_progress if not yet submitted
      if (attemptDoc.problemStatus[probId] !== "submitted") {
        updatePayload[`problemStatus.${probId}`] = "in_progress";
        attemptDoc.problemStatus[probId] = "in_progress";
        updateProblemTabs();
      }

      await updateDoc(doc(db, "round2Attempts", currentUser.uid), updatePayload);
      if (autoSaveStatusEl) autoSaveStatusEl.textContent = "Saved ●";
    } catch (e) {
      if (autoSaveStatusEl) autoSaveStatusEl.textContent = "Offline (Cached locally)";
    }
  }, 1000);
}

function updateProblemTabs() {
  document.querySelectorAll(".prob-tab").forEach((tab, i) => {
    tab.classList.toggle("active", i === currentProblemIndex);
    const probId = problems[i].id;
    const st = attemptDoc?.problemStatus?.[probId] || "not_attempted";
    tab.classList.toggle("submitted", st === "submitted");
  });
}

function resetResultsConsole(prob) {
  const container = document.getElementById("public-tests-container");
  if (!container) return;

  container.innerHTML = prob.publicTests.map((tc, idx) => `
    <div class="testcase-card" id="tc-card-${tc.id}">
      <div class="flex justify-between items-center mb-2">
        <span class="font-bold text-slate-300">Public Test Case ${idx + 1}</span>
        <span class="tc-badge bg-slate-800 text-slate-400" id="tc-status-${tc.id}">NOT RUN</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-slate-500">Input:</span>
          <pre class="bg-slate-900 p-2 rounded text-slate-300 mt-1">${escapeHtml(tc.input)}</pre>
        </div>
        <div>
          <span class="text-slate-500">Expected Output:</span>
          <pre class="bg-slate-900 p-2 rounded text-emerald-400 mt-1">${escapeHtml(tc.expectedOutput)}</pre>
        </div>
      </div>
      <div class="mt-2 text-xs hidden" id="tc-output-box-${tc.id}">
        <span class="text-slate-500">Your Output:</span>
        <pre class="bg-slate-900 p-2 rounded text-white mt-1" id="tc-actual-${tc.id}"></pre>
      </div>
    </div>
  `).join("");

  document.getElementById("results-summary-banner").textContent = "Run code to evaluate against public test cases.";
}

// =========================================================================
// 5. TEST EXECUTION (RUN CODE & SUBMIT PROBLEM)
// =========================================================================

function initActionListeners() {
  // Problem switching
  document.querySelectorAll(".prob-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      saveCurrentProblemCode(true);
      currentProblemIndex = parseInt(tab.getAttribute("data-index"), 10);
      renderCurrentProblem();
    });
  });

  // Code textarea typing -> auto save + line numbers
  codeTextarea.addEventListener("input", () => {
    syncLineNumbers();
    saveCurrentProblemCode();
  });

  codeTextarea.addEventListener("scroll", () => {
    lineNumbersEl.scrollTop = codeTextarea.scrollTop;
  });

  // Reset starter code button
  document.getElementById("btn-reset-code")?.addEventListener("click", () => {
    const prob = problems[currentProblemIndex];
    const lang = lockedLanguage || "python";
    if (confirm("Reset code to initial problem template? Your current edits for this problem will be overwritten.")) {
      codeTextarea.value = prob.starters[lang] || "";
      syncLineNumbers();
      saveCurrentProblemCode();
      showToast("Code reset to starter template.", "info");
    }
  });

  // Clear code button
  document.getElementById("btn-clear-code")?.addEventListener("click", () => {
    if (confirm("Clear code editor completely?")) {
      codeTextarea.value = "";
      syncLineNumbers();
      saveCurrentProblemCode();
    }
  });

  // RUN CODE (Public Test Cases Only)
  document.getElementById("btn-run-code")?.addEventListener("click", async () => {
    const prob = problems[currentProblemIndex];
    const sourceCode = codeTextarea.value.trim();
    if (!sourceCode) {
      showToast("Editor is empty. Write your code before running tests.", "warning");
      return;
    }

    const runBtn = document.getElementById("btn-run-code");
    runBtn.disabled = true;
    runBtn.textContent = "Executing Tests...";
    document.getElementById("results-summary-banner").textContent = "Running code on public sandbox...";

    try {
      const evalRes = await runTestCases(lockedLanguage, sourceCode, prob.publicTests, prob.timeLimit, (curr, total, item) => {
        updateSingleTestCaseCard(item);
      });

      document.getElementById("results-summary-banner").textContent = 
        `PUBLIC TESTS: ${evalRes.passed} / ${evalRes.total} PASSED (${evalRes.percentage}%)`;

      if (evalRes.passed === evalRes.total) {
        showToast("All public test cases passed! Ready for submission.", "success");
      } else {
        showToast(`${evalRes.failed} public test case(s) failed. Check outputs below.`, "warning");
      }
    } catch (e) {
      showToast("Execution error: " + e.message, "error");
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        RUN CODE
      `;
    }
  });

  // SUBMIT PROBLEM (Public + Hidden Test Cases)
  document.getElementById("btn-submit-problem")?.addEventListener("click", async () => {
    const prob = problems[currentProblemIndex];
    const sourceCode = codeTextarea.value.trim();
    if (!sourceCode) {
      showToast("Cannot submit empty solution.", "warning");
      return;
    }

    if (!confirm(`SUBMIT PROBLEM ${prob.number}?\n\nThis will evaluate your code against all 25+ hidden test cases and record your score for this problem.`)) {
      return;
    }

    const subBtn = document.getElementById("btn-submit-problem");
    subBtn.disabled = true;
    subBtn.textContent = "Evaluating All Tests...";

    try {
      // 1. Evaluate Public Tests (Weight: 20 points)
      const pubRes = await runTestCases(lockedLanguage, sourceCode, prob.publicTests, prob.timeLimit);

      // 2. Evaluate Hidden Tests (Weight: 80 points)
      const hidRes = await runTestCases(lockedLanguage, sourceCode, prob.hiddenTests, prob.timeLimit);

      const pubPoints = Math.round((pubRes.passed / pubRes.total) * 20);
      const hidPoints = Math.round((hidRes.passed / hidRes.total) * 80);
      const problemScore = pubPoints + hidPoints;

      // Update attempt in Firestore
      const updatePayload = {};
      updatePayload[`scores.${prob.id}`] = problemScore;
      updatePayload[`problemStatus.${prob.id}`] = "submitted";
      updatePayload[`code.${prob.id}`] = sourceCode;

      attemptDoc.scores[prob.id] = problemScore;
      attemptDoc.problemStatus[prob.id] = "submitted";

      // Calculate new total
      const newTotal = Object.values(attemptDoc.scores).reduce((a, b) => a + b, 0);
      updatePayload.totalScore = newTotal;

      await updateDoc(doc(db, "round2Attempts", currentUser.uid), updatePayload);

      updateProblemTabs();

      // Show summary
      alert(`PROBLEM ${prob.number} SUBMITTED!\n\nPublic Tests: ${pubRes.passed} / ${pubRes.total} passed\nHidden Tests: ${hidRes.passed} / ${hidRes.total} passed\n\nSCORE EARNED: ${problemScore} / 100 PTS`);
      showToast(`Problem ${prob.number} submitted! Score: ${problemScore} / 100`, "success");

    } catch (e) {
      showToast("Submission failed: " + e.message, "error");
    } finally {
      subBtn.disabled = false;
      subBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        SUBMIT PROBLEM
      `;
    }
  });

  // FINISH ROUND BUTTON
  document.getElementById("btn-finish-round")?.addEventListener("click", () => {
    const submittedCount = Object.values(attemptDoc.problemStatus).filter(s => s === "submitted").length;
    if (confirm(`FINISH ROUND 2 TEST?\n\nYou have submitted ${submittedCount} of 4 problems.\nOnce finalized, you cannot modify your code.`)) {
      finalizeRound2Submission(false);
    }
  });
}

function updateSingleTestCaseCard(item) {
  const card = document.getElementById(`tc-card-${item.id}`);
  const badge = document.getElementById(`tc-status-${item.id}`);
  const outBox = document.getElementById(`tc-output-box-${item.id}`);
  const actualPre = document.getElementById(`tc-actual-${item.id}`);

  if (!card || !badge) return;

  card.classList.remove("passed", "failed");
  badge.classList.remove("passed", "failed");

  if (item.passed) {
    card.classList.add("passed");
    badge.classList.add("passed");
    badge.textContent = `PASSED (${item.executionTimeMs || 0}ms)`;
  } else {
    card.classList.add("failed");
    badge.classList.add("failed");
    badge.textContent = item.errorType || "WRONG ANSWER";
  }

  if (outBox && actualPre) {
    outBox.classList.remove("hidden");
    actualPre.textContent = item.actualOutput || item.stderr || "(No output produced)";
  }
}

// =========================================================================
// 6. FINAL ROUND 2 SUBMISSION
// =========================================================================

async function finalizeRound2Submission(isAutoSubmit = false) {
  if (timerInterval) clearInterval(timerInterval);

  try {
    const totalScore = Object.values(attemptDoc.scores || {}).reduce((a, b) => a + b, 0);

    // Calculate time taken
    let timeTakenSec = 2400;
    if (roundSettings?.startTime) {
      const startMs = roundSettings.startTime.toMillis ? roundSettings.startTime.toMillis() : Date.now();
      timeTakenSec = Math.min(Math.floor((Date.now() - startMs) / 1000), 2400);
    }

    const resultPayload = {
      participantId: participantDoc.participantId,
      name: participantDoc.name,
      language: lockedLanguage || "python",
      p1Score: attemptDoc.scores?.p1 || 0,
      p2Score: attemptDoc.scores?.p2 || 0,
      p3Score: attemptDoc.scores?.p3 || 0,
      p4Score: attemptDoc.scores?.p4 || 0,
      totalScore,
      timeTaken: timeTakenSec,
      violationCount,
      submittedAt: serverTimestamp()
    };

    // Save to round2Results/{uid}
    await setDoc(doc(db, "round2Results", currentUser.uid), resultPayload);

    // Update round2Attempts
    await updateDoc(doc(db, "round2Attempts", currentUser.uid), {
      isSubmitted: true,
      submittedAt: serverTimestamp()
    });

    sessionStorage.setItem("technora_r2_result", JSON.stringify(resultPayload));

    window.location.href = "round2-result.html";

  } catch (err) {
    console.error("Final submit error:", err);
    showToast("Error recording final score: " + err.message, "error");
  }
}

// =========================================================================
// 7. TIMER & ANTI-CHEAT
// =========================================================================

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  const duration = (roundSettings?.duration) || 2400; // 40 mins default

  timerInterval = setInterval(() => {
    let elapsed = 0;
    if (roundSettings?.startTime) {
      const startMs = roundSettings.startTime.toMillis ? roundSettings.startTime.toMillis() : Date.now();
      elapsed = Math.floor((Date.now() - startMs) / 1000);
    }

    const remaining = Math.max(0, duration - elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (timerDigitsEl) {
      timerDigitsEl.textContent = str;
      timerDigitsEl.classList.toggle("urgent", remaining <= 300); // under 5 mins
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
      showToast("Time expired! Submitting solutions automatically...", "warning");
      finalizeRound2Submission(true);
    }
  }, 1000);
}

function initAntiCheat() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      recordViolation("Tab switched or minimized");
    }
  });

  window.addEventListener("blur", () => {
    recordViolation("Window lost focus");
  });

  // Prohibit copy, paste, right-click and dev shortcuts
  initSecurityGuard({
    onViolation: () => recordViolation("Prohibited clipboard action or shortcut attempt")
  });
}

function recordViolation(reason) {
  violationCount++;
  showToast(`ANTI-CHEAT WARNING (${violationCount}): Leaving the test window is prohibited.`, "warning");

  if (currentUser) {
    updateDoc(doc(db, "round2Attempts", currentUser.uid), {
      violationCount
    }).catch(() => {});
  }
}

// =========================================================================
// 8. EDITOR HELPERS (Line numbers, tabs, markdown formatting)
// =========================================================================

function initLineNumbers() {
  syncLineNumbers();
}

function syncLineNumbers() {
  if (!codeTextarea || !lineNumbersEl) return;
  const lines = codeTextarea.value.split("\n").length;
  let numbersHtml = "";
  for (let i = 1; i <= Math.max(lines, 25); i++) {
    numbersHtml += `<div>${i}</div>`;
  }
  lineNumbersEl.innerHTML = numbersHtml;
}

function setupTextareaTabKey() {
  if (!codeTextarea) return;
  codeTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = codeTextarea.selectionStart;
      const end = codeTextarea.selectionEnd;
      codeTextarea.value = codeTextarea.value.substring(0, start) + "    " + codeTextarea.value.substring(end);
      codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
      syncLineNumbers();
    }
  });
}

function formatMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="font-bold text-sky-400 mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n\n/gim, '<br><br>');
  return html;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

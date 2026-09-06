/**
 * TECHNORA'26 — ROUND 1: DEBUG ARENA
 * Complete Administrator Control Engine
 * Handles: Round Lifecycle, Live Participant Monitoring, Credential Generation
 * (via Secondary Auth to prevent Admin logout), and Question Bank Management.
 */

import { 
  db, 
  auth,
  getSecondaryAuth,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch,
  createUserWithEmailAndPassword 
} from "./firebase-config.js";
import { 
  requireAdminAuth, 
  getParticipantEmail, 
  showToast, 
  logoutUser 
} from "./auth.js";
import { DEFAULT_QUESTIONS } from "./default-questions.js";

let participantsList = [];
let questionsList = [];
let unsubscribeParticipants = null;
let unsubscribeRound = null;
let currentRoundStatus = "WAITING";

/**
 * Initialize Admin Core
 */
export function initAdminDashboard() {
  requireAdminAuth((adminUser) => {
    setupAdminHeader(adminUser);
    setupRoundControls();
    listenToRoundSettings();
    listenToLiveParticipants();
  });
}

export function initAdminParticipants() {
  requireAdminAuth((adminUser) => {
    setupAdminHeader(adminUser);
    listenToParticipantsList();
    setupCredentialGenerator();
  });
}

export function initAdminQuestions() {
  requireAdminAuth((adminUser) => {
    setupAdminHeader(adminUser);
    listenToQuestionBank();
    setupQuestionCrud();
  });
}

function setupAdminHeader(adminUser) {
  const adminEmailEl = document.getElementById("admin-user-email");
  if (adminEmailEl) {
    adminEmailEl.textContent = adminUser.email || "Admin";
  }

  const logoutBtn = document.getElementById("admin-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => logoutUser("../admin/index.html"));
  }
}

// =========================================================================
// 1. ROUND LIFECYCLE CONTROLS (settings/round1)
// =========================================================================

function listenToRoundSettings() {
  const roundRef = doc(db, "settings", "round1");

  unsubscribeRound = onSnapshot(roundRef, (docSnap) => {
    const statusPill = document.getElementById("admin-round-status-pill");
    const startBtn = document.getElementById("btn-start-round");
    const endBtn = document.getElementById("btn-end-round");
    const pauseBtn = document.getElementById("btn-pause-round");
    const durationInput = document.getElementById("round-duration-input");

    if (!docSnap.exists()) {
      currentRoundStatus = "WAITING";
    } else {
      const data = docSnap.data();
      currentRoundStatus = (data.status || "WAITING").toUpperCase();
      if (durationInput && data.duration) {
        durationInput.value = Math.floor(data.duration / 60);
      }
    }

    if (statusPill) {
      statusPill.textContent = currentRoundStatus;
      if (currentRoundStatus === "LIVE") {
        statusPill.className = "badge-tech badge-live";
      } else if (currentRoundStatus === "ENDED") {
        statusPill.className = "badge-tech badge-ended";
      } else {
        statusPill.className = "badge-tech badge-waiting";
      }
    }

    // Toggle button active states
    if (startBtn) startBtn.disabled = currentRoundStatus === "LIVE";
    if (endBtn) endBtn.disabled = currentRoundStatus === "ENDED";
    if (pauseBtn) pauseBtn.disabled = currentRoundStatus !== "LIVE";
  });
}

function setupRoundControls() {
  const startBtn = document.getElementById("btn-start-round");
  const pauseBtn = document.getElementById("btn-pause-round");
  const endBtn = document.getElementById("btn-end-round");
  const resetBtn = document.getElementById("btn-reset-round");
  const durationInput = document.getElementById("round-duration-input");

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      const durationMins = parseInt(durationInput ? durationInput.value : "20", 10) || 20;
      const durationSeconds = durationMins * 60;

      try {
        await setDoc(doc(db, "settings", "round1"), {
          status: "LIVE",
          duration: durationSeconds,
          startTime: serverTimestamp(),
          startedBy: auth.currentUser?.email || "Admin",
          updatedAt: serverTimestamp()
        }, { merge: true });

        showToast("ROUND 1 HAS STARTED! Participants are entering the arena.", "success");
      } catch (e) {
        console.error("Failed to start round:", e);
        showToast("Failed to start round: " + e.message, "error");
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "settings", "round1"), {
          status: "WAITING",
          updatedAt: serverTimestamp()
        });
        showToast("Round 1 Paused (Status set to WAITING).", "warning");
      } catch (e) {
        showToast("Error pausing round: " + e.message, "error");
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to conclude Round 1? All active participants will be automatically closed.")) {
        return;
      }
      try {
        await updateDoc(doc(db, "settings", "round1"), {
          status: "ENDED",
          endTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast("ROUND 1 HAS CONCLUDED. Active participants closed.", "info");
      } catch (e) {
        showToast("Error ending round: " + e.message, "error");
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (!confirm("RESET ROUND STATUS? This resets round to WAITING state. It will not wipe participant scores unless manually chosen.")) {
        return;
      }
      try {
        await setDoc(doc(db, "settings", "round1"), {
          status: "WAITING",
          startTime: null,
          endTime: null,
          duration: 1200,
          updatedAt: serverTimestamp()
        });
        showToast("Round 1 status reset to WAITING.", "success");
      } catch (e) {
        showToast("Reset failed: " + e.message, "error");
      }
    });
  }
}

// =========================================================================
// 2. LIVE PARTICIPANT SURVEILLANCE & METRICS
// =========================================================================

function listenToLiveParticipants() {
  const pCol = collection(db, "participants");

  unsubscribeParticipants = onSnapshot(pCol, (snapshot) => {
    participantsList = [];
    snapshot.forEach(docSnap => {
      participantsList.push({ uid: docSnap.id, ...docSnap.data() });
    });

    // Update Dashboard Metrics Cards
    updateLiveMetrics(participantsList);

    // Update Live Monitoring Table
    renderLiveMonitoringTable(participantsList);
  }, (err) => {
    console.error("Live participants monitoring error:", err);
  });
}

function updateLiveMetrics(list) {
  const totalEl = document.getElementById("stat-total-participants");
  const notStartedEl = document.getElementById("stat-not-started");
  const inProgressEl = document.getElementById("stat-in-progress");
  const completedEl = document.getElementById("stat-completed");

  const total = list.filter(p => p.role === "participant").length;
  const notStarted = list.filter(p => p.role === "participant" && (!p.status || p.status === "NOT STARTED")).length;
  const inProgress = list.filter(p => p.role === "participant" && p.status === "IN PROGRESS").length;
  const completed = list.filter(p => p.role === "participant" && (p.status === "COMPLETED" || p.hasAttempted)).length;

  if (totalEl) totalEl.textContent = total;
  if (notStartedEl) notStartedEl.textContent = notStarted;
  if (inProgressEl) inProgressEl.textContent = inProgress;
  if (completedEl) completedEl.textContent = completed;
}

function renderLiveMonitoringTable(list) {
  const tableBody = document.getElementById("live-participants-tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const participantsOnly = list.filter(p => p.role === "participant");

  if (participantsOnly.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 28px; color: var(--text-muted);">
          No participants registered. Generate credentials in the Participants tab.
        </td>
      </tr>
    `;
    return;
  }

  participantsOnly.forEach(p => {
    const row = document.createElement("tr");

    let statusBadgeClass = "badge-waiting";
    const status = p.status || "NOT STARTED";
    if (status === "IN PROGRESS") statusBadgeClass = "badge-live";
    if (status === "COMPLETED") statusBadgeClass = "badge-tech";

    const answeredText = p.answeredCount !== undefined ? `${p.answeredCount} / 20 answered` : (status === "COMPLETED" ? "20 / 20 submitted" : "-");
    const scoreDisplay = p.score !== undefined && (p.hasAttempted || status === "COMPLETED") ? `${p.score} / 20` : "—";
    const violations = p.violationCount || 0;

    row.innerHTML = `
      <td><strong>${escapeHtml(p.participantId || "N/A")}</strong></td>
      <td>${escapeHtml(p.name || "Participant")}</td>
      <td><span class="badge-tech ${statusBadgeClass}">${status}</span></td>
      <td>${answeredText}</td>
      <td>
        <span class="badge-tech ${violations > 0 ? 'badge-live' : 'badge-waiting'}">
          ${violations}
        </span>
      </td>
      <td><strong>${scoreDisplay}</strong></td>
    `;

    tableBody.appendChild(row);
  });
}

// =========================================================================
// 3. PARTICIPANTS MANAGEMENT & CREDENTIAL GENERATION
// =========================================================================

function listenToParticipantsList() {
  const pCol = collection(db, "participants");
  const tableBody = document.getElementById("participants-table-tbody");
  const searchInput = document.getElementById("participants-search-input");

  onSnapshot(pCol, (snapshot) => {
    participantsList = [];
    snapshot.forEach(docSnap => {
      participantsList.push({ uid: docSnap.id, ...docSnap.data() });
    });

    renderParticipantsTable(participantsList);
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = participantsList.filter(p => 
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.participantId && p.participantId.toLowerCase().includes(term))
      );
      renderParticipantsTable(filtered);
    });
  }
}

function renderParticipantsTable(list) {
  const tableBody = document.getElementById("participants-table-tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  const participantsOnly = list.filter(p => p.role === "participant");

  if (participantsOnly.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 36px; color: var(--text-muted);">
          No participants found. Click "Generate Participant" to onboard participants.
        </td>
      </tr>
    `;
    return;
  }

  participantsOnly.forEach(p => {
    const row = document.createElement("tr");
    const status = p.status || "NOT STARTED";
    const violations = p.violationCount || 0;
    const scoreText = p.score !== undefined && p.hasAttempted ? `${p.score} / 20` : "—";
    const isActive = p.isActive !== false;

    row.innerHTML = `
      <td><strong>${escapeHtml(p.participantId || "N/A")}</strong></td>
      <td>${escapeHtml(p.name || "Participant")}</td>
      <td>
        <span class="badge-tech ${status === 'COMPLETED' ? 'badge-tech' : status === 'IN PROGRESS' ? 'badge-live' : 'badge-waiting'}">
          ${status}
        </span>
      </td>
      <td>${scoreText}</td>
      <td>
        <span class="badge-tech ${violations > 0 ? 'badge-live' : 'badge-waiting'}">${violations}</span>
      </td>
      <td>
        <span class="badge-tech ${isActive ? 'badge-tech' : 'badge-ended'}">
          ${isActive ? 'ACTIVE' : 'DISABLED'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap: 8px;">
          <button class="btn-cyber-outline py-1 px-2 text-xs" onclick="window.toggleParticipantActive('${p.uid}', ${isActive})">
            ${isActive ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-cyber-danger py-1 px-2 text-xs" onclick="window.resetParticipantAttempt('${p.uid}', '${escapeHtml(p.participantId || p.name)}')">
            Reset
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function setupCredentialGenerator() {
  const openModalBtn = document.getElementById("btn-open-generate-modal");
  const modal = document.getElementById("credential-generator-modal");
  const closeBtn = document.getElementById("btn-close-credential-modal");
  const form = document.getElementById("form-generate-credential");

  const resultModal = document.getElementById("credential-result-modal");
  const closeResultBtn = document.getElementById("btn-close-result-modal");
  const copyBtn = document.getElementById("btn-copy-credentials");

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      // Suggest next participant ID (e.g. TECH001)
      const pIdInput = document.getElementById("gen-participant-id");
      const nextNum = String(participantsList.filter(p => p.role === "participant").length + 1).padStart(3, '0');
      if (pIdInput && !pIdInput.value) {
        pIdInput.value = `TECH${nextNum}`;
      }
      if (modal) modal.classList.remove("hidden");
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (closeResultBtn && resultModal) {
    closeResultBtn.addEventListener("click", () => resultModal.classList.add("hidden"));
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("gen-participant-name").value.trim();
      const participantId = document.getElementById("gen-participant-id").value.trim().toUpperCase();

      if (!name || !participantId) {
        showToast("Please provide both Participant Name and ID.", "error");
        return;
      }

      // Generate secure 6-character alphanumeric temporary password (e.g. X7K9P2)
      const password = generateSecurePassword(6);
      const email = getParticipantEmail(participantId);

      const submitBtn = form.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;

      try {
        // Use secondary Auth app so admin isn't kicked out!
        const secondaryAuth = getSecondaryAuth();
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUid = userCred.user.uid;

        // Create Firestore participant doc
        await setDoc(doc(db, "participants", newUid), {
          participantId: participantId,
          name: name,
          email: email,
          role: "participant",
          isActive: true,
          hasAttempted: false,
          status: "NOT STARTED",
          score: 0,
          violationCount: 0,
          createdAt: serverTimestamp()
        });

        // Hide generation form modal
        if (modal) modal.classList.add("hidden");
        form.reset();

        // Display credentials in result modal with Copy button
        const resId = document.getElementById("res-participant-id");
        const resPass = document.getElementById("res-participant-password");
        if (resId) resId.textContent = participantId;
        if (resPass) resPass.textContent = password;

        if (resultModal) resultModal.classList.remove("hidden");
        showToast(`Participant ${participantId} successfully created!`, "success");

      } catch (err) {
        console.error("Participant creation error:", err);
        showToast("Creation failed: " + (err.code === "auth/email-already-in-use" ? "Participant ID already exists." : err.message), "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const pId = document.getElementById("res-participant-id").textContent;
      const pass = document.getElementById("res-participant-password").textContent;
      const textToCopy = `TECHNORA'26 — ROUND 1 DEBUG ARENA\nParticipant ID: ${pId}\nPassword: ${pass}\nPortal: ${window.location.origin}/index.html`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Credentials copied to clipboard!", "success");
      }).catch(() => {
        showToast("Could not copy automatically. Please copy manually.", "warning");
      });
    });
  }
}

function generateSecurePassword(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // clear readable chars
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// Global window actions for table buttons
window.toggleParticipantActive = async (uid, currentActive) => {
  try {
    await updateDoc(doc(db, "participants", uid), {
      isActive: !currentActive
    });
    showToast(`Participant status updated to ${!currentActive ? 'ACTIVE' : 'DISABLED'}.`, "info");
  } catch (e) {
    showToast("Error updating status: " + e.message, "error");
  }
};

window.resetParticipantAttempt = async (uid, participantId) => {
  if (!confirm(`RESET ATTEMPT FOR ${participantId}?\nThis will clear their score and allow them to take Round 1 again.`)) {
    return;
  }

  try {
    // Delete attempt & result docs
    await deleteDoc(doc(db, "attempts", uid)).catch(() => {});
    await deleteDoc(doc(db, "results", uid)).catch(() => {});

    // Update participant doc
    await updateDoc(doc(db, "participants", uid), {
      hasAttempted: false,
      status: "NOT STARTED",
      score: 0,
      violationCount: 0,
      answeredCount: 0,
      timeTaken: null
    });

    showToast(`Attempt for ${participantId} has been successfully reset.`, "success");
  } catch (e) {
    showToast("Reset failed: " + e.message, "error");
  }
};

// =========================================================================
// 4. QUESTION BANK MANAGEMENT & 1-CLICK SEEDER
// =========================================================================

function listenToQuestionBank() {
  const qCol = collection(db, "questions");
  const container = document.getElementById("questions-list-container");
  const filterSelect = document.getElementById("category-filter-select");

  onSnapshot(qCol, (snapshot) => {
    questionsList = [];
    snapshot.forEach(docSnap => {
      questionsList.push({ id: docSnap.id, ...docSnap.data() });
    });

    // If Firestore question collection is currently empty, show prominent Seeder card
    renderQuestionsList(questionsList);
  });

  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      const selectedCat = e.target.value;
      if (!selectedCat || selectedCat === "ALL") {
        renderQuestionsList(questionsList);
      } else {
        const filtered = questionsList.filter(q => q.category === selectedCat);
        renderQuestionsList(filtered);
      }
    });
  }
}

function renderQuestionsList(list) {
  const container = document.getElementById("questions-list-container");
  const countBadge = document.getElementById("questions-count-badge");
  if (!container) return;

  if (countBadge) countBadge.textContent = `${list.length} Questions`;

  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `
      <div class="glass-panel p-8 text-center">
        <h3 class="font-mono text-lg font-bold text-sky-400 mb-2">Question Bank Empty</h3>
        <p class="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          No questions found in Firestore. You can seed the 20 pre-verified hard technical MCQs with a single click.
        </p>
        <button id="btn-empty-seed-trigger" class="btn-cyber-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Import 20 Verified Hard Questions Now
        </button>
      </div>
    `;

    const seedBtn = document.getElementById("btn-empty-seed-trigger");
    if (seedBtn) seedBtn.addEventListener("click", seedDefaultQuestions);
    return;
  }

  list.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "glass-panel p-5 mb-4";

    const letters = ["A", "B", "C", "D"];
    let optionsHtml = "";
    (q.options || []).forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correctAnswer;
      optionsHtml += `
        <div style="font-family: var(--font-mono); font-size: 0.85rem; padding: 6px 12px; margin-top: 4px; border-radius: 6px; background: ${isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.5)'}; border: 1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.5)' : 'rgba(56, 189, 248, 0.1)'}; color: ${isCorrect ? '#34d399' : 'var(--text-secondary)'};">
          <strong>${letters[optIdx]}.</strong> ${escapeHtml(opt)} ${isCorrect ? '✓ (Correct)' : ''}
        </div>
      `;
    });

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
        <div style="display:flex; gap: 8px; align-items:center;">
          <span class="badge-tech">${q.category || 'General'}</span>
          <span class="badge-tech badge-waiting">${q.difficulty || 'hard'}</span>
          <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">#${idx + 1} (${q.id})</span>
        </div>
        <div style="display:flex; gap: 6px;">
          <button class="btn-cyber-outline py-1 px-2 text-xs" onclick="window.editQuestion('${q.id}')">Edit</button>
          <button class="btn-cyber-danger py-1 px-2 text-xs" onclick="window.deleteQuestion('${q.id}')">Delete</button>
        </div>
      </div>
      <div style="font-family: var(--font-sans); font-size: 0.95rem; margin-bottom: 14px; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(q.question)}</div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px;">
        ${optionsHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function setupQuestionCrud() {
  const openModalBtn = document.getElementById("btn-add-question");
  const seedBtn = document.getElementById("btn-seed-all-questions");
  const modal = document.getElementById("question-editor-modal");
  const closeBtn = document.getElementById("btn-close-question-modal");
  const form = document.getElementById("form-question-editor");

  if (seedBtn) {
    seedBtn.addEventListener("click", seedDefaultQuestions);
  }

  if (openModalBtn && modal) {
    openModalBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("edit-question-id").value = "";
      document.getElementById("question-modal-title").textContent = "Add Technical MCQ";
      modal.classList.remove("hidden");
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const qId = document.getElementById("edit-question-id").value || `q_${Date.now()}`;
      const questionText = document.getElementById("input-q-text").value.trim();
      const optA = document.getElementById("input-q-optA").value.trim();
      const optB = document.getElementById("input-q-optB").value.trim();
      const optC = document.getElementById("input-q-optC").value.trim();
      const optD = document.getElementById("input-q-optD").value.trim();
      const correctIdx = parseInt(document.getElementById("select-q-correct").value, 10);
      const category = document.getElementById("select-q-category").value;
      const difficulty = document.getElementById("select-q-difficulty").value;

      try {
        await setDoc(doc(db, "questions", qId), {
          question: questionText,
          options: [optA, optB, optC, optD],
          correctAnswer: correctIdx,
          category: category,
          difficulty: difficulty,
          active: true,
          updatedAt: serverTimestamp()
        });

        if (modal) modal.classList.add("hidden");
        showToast("Question saved successfully!", "success");
      } catch (err) {
        showToast("Failed to save question: " + err.message, "error");
      }
    });
  }
}

/**
 * 1-Click Seeder for all 20 verified questions
 */
export async function seedDefaultQuestions() {
  if (!confirm("This will import all 20 verified hard technical questions into Firestore. Proceed?")) {
    return;
  }

  try {
    showToast("Importing 20 verified technical questions...", "info");
    const batch = writeBatch(db);

    DEFAULT_QUESTIONS.forEach(q => {
      const qRef = doc(db, "questions", q.id);
      batch.set(qRef, {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category,
        difficulty: q.difficulty,
        explanation: q.explanation || "",
        active: true,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
    showToast("All 20 questions successfully seeded into Firestore!", "success");
  } catch (err) {
    console.error("Seeding error:", err);
    showToast("Seeding failed: " + err.message, "error");
  }
}

window.editQuestion = (id) => {
  const q = questionsList.find(item => item.id === id);
  if (!q) return;

  const modal = document.getElementById("question-editor-modal");
  document.getElementById("edit-question-id").value = q.id;
  document.getElementById("input-q-text").value = q.question || "";
  document.getElementById("input-q-optA").value = (q.options && q.options[0]) || "";
  document.getElementById("input-q-optB").value = (q.options && q.options[1]) || "";
  document.getElementById("input-q-optC").value = (q.options && q.options[2]) || "";
  document.getElementById("input-q-optD").value = (q.options && q.options[3]) || "";
  document.getElementById("select-q-correct").value = q.correctAnswer !== undefined ? q.correctAnswer : 0;
  document.getElementById("select-q-category").value = q.category || "Python";
  document.getElementById("select-q-difficulty").value = q.difficulty || "hard";
  document.getElementById("question-modal-title").textContent = `Edit Question (${q.id})`;

  if (modal) modal.classList.remove("hidden");
};

window.deleteQuestion = async (id) => {
  if (!confirm(`Delete question ${id}? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "questions", id));
    showToast("Question deleted.", "info");
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
};

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

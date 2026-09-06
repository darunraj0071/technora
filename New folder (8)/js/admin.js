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
  getDocs,
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
import { ROUND2_PROBLEMS } from "./round2-problems.js";
import { ROUND3_PROBLEMS } from "./round3-problems.js";

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
    setupRound2Controls();
    listenToRound2SettingsAdmin();
    listenToLiveRound2Participants();
    setupRound3Controls();
    listenToRound3SettingsAdmin();
    listenToLiveRound3Participants();
    setupTeamQualificationControls();
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

export function initAdminRound2Problems() {
  requireAdminAuth((adminUser) => {
    setupAdminHeader(adminUser);
    renderRound2ProblemsList();
    setupRound2SeedButton();
  });
}

export function initAdminRound3Problems() {
  requireAdminAuth((adminUser) => {
    setupAdminHeader(adminUser);
    renderRound3ProblemsList();
    setupRound3SeedButton();
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

let r1TimerInterval = null;

function listenToRoundSettings() {
  const roundRef = doc(db, "settings", "round1");

  unsubscribeRound = onSnapshot(roundRef, (docSnap) => {
    const statusPill = document.getElementById("admin-round-status-pill");
    const startBtn = document.getElementById("btn-start-round");
    const endBtn = document.getElementById("btn-end-round");
    const pauseBtn = document.getElementById("btn-pause-round");
    const durationInput = document.getElementById("round-duration-input");
    const timerEl = document.getElementById("r1-countdown-timer");

    if (!docSnap.exists()) {
      currentRoundStatus = "WAITING";
      if (timerEl) timerEl.textContent = "20:00";
    } else {
      const data = docSnap.data();
      currentRoundStatus = (data.status || "WAITING").toUpperCase();
      const durSec = data.duration || 1200;
      if (durationInput && data.duration) {
        durationInput.value = Math.floor(data.duration / 60);
      }

      // Live Server Timer Countdown for Round 1
      if (currentRoundStatus === "LIVE" && data.startTime) {
        if (r1TimerInterval) clearInterval(r1TimerInterval);

        const computeAndDisplay = () => {
          let startMs = Date.now();
          if (data.startTime.toMillis) {
            startMs = data.startTime.toMillis();
          } else if (data.startTime.seconds) {
            startMs = data.startTime.seconds * 1000;
          } else if (typeof data.startTime === "string" || typeof data.startTime === "number") {
            startMs = new Date(data.startTime).getTime();
          }
          const elapsed = Math.floor((Date.now() - startMs) / 1000);
          const remaining = Math.max(0, durSec - elapsed);

          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          if (timerEl) {
            timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }
          if (remaining <= 0) {
            clearInterval(r1TimerInterval);
            if (timerEl) timerEl.textContent = "00:00 (TIME'S UP)";
          }
        };

        computeAndDisplay();
        r1TimerInterval = setInterval(computeAndDisplay, 1000);
      } else {
        if (r1TimerInterval) clearInterval(r1TimerInterval);
        const mins = Math.floor(durSec / 60);
        const secs = durSec % 60;
        if (timerEl) {
          timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
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
// ROUND 2 ADMIN CONTROLS & TELEMETRY
// =========================================================================

let r2TimerInterval = null;

function setupRound2Controls() {
  const startBtn = document.getElementById("btn-start-round2");
  const endBtn = document.getElementById("btn-end-round2");
  const resetBtn = document.getElementById("btn-reset-round2");

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      if (!confirm("START ROUND 2: CODE BREAKER?\nAll candidates currently waiting in the lounge will immediately enter the coding arena.")) {
        return;
      }
      try {
        await setDoc(doc(db, "settings", "round2"), {
          status: "LIVE",
          startTime: serverTimestamp(),
          duration: 2400, // 40 mins
          totalProblems: 4,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showToast("ROUND 2 STARTED! Candidates are entering the Code Breaker arena.", "success");
      } catch (e) {
        showToast("Error starting Round 2: " + e.message, "error");
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener("click", async () => {
      if (!confirm("END ROUND 2 NOW?\nAll candidate code editors will be closed and current solutions evaluated.")) {
        return;
      }
      try {
        await updateDoc(doc(db, "settings", "round2"), {
          status: "ENDED",
          endTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast("ROUND 2 HAS ENDED. Active coding sessions finalized.", "info");
      } catch (e) {
        showToast("Error ending Round 2: " + e.message, "error");
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (!confirm("RESET ROUND 2 STATUS TO WAITING?")) {
        return;
      }
      try {
        await setDoc(doc(db, "settings", "round2"), {
          status: "WAITING",
          startTime: null,
          endTime: null,
          duration: 2400,
          totalProblems: 4,
          updatedAt: serverTimestamp()
        });
        showToast("Round 2 status reset to WAITING.", "success");
      } catch (e) {
        showToast("Error resetting Round 2: " + e.message, "error");
      }
    });
  }
}

function listenToRound2SettingsAdmin() {
  const statusBadge = document.getElementById("r2-round-status-badge");
  const timerEl = document.getElementById("r2-countdown-timer");
  const startBtn = document.getElementById("btn-start-round2");
  const endBtn = document.getElementById("btn-end-round2");

  onSnapshot(doc(db, "settings", "round2"), (snap) => {
    if (!snap.exists()) {
      if (statusBadge) {
        statusBadge.textContent = "WAITING";
        statusBadge.className = "badge-tech badge-waiting text-xs mt-1";
      }
      if (startBtn) startBtn.disabled = false;
      if (endBtn) endBtn.disabled = true;
      return;
    }

    const data = snap.data();
    const status = data.status || "WAITING";

    if (statusBadge) {
      statusBadge.textContent = status;
      if (status === "LIVE") {
        statusBadge.className = "badge-tech badge-live text-xs mt-1";
      } else if (status === "ENDED") {
        statusBadge.className = "badge-tech badge-ended text-xs mt-1";
      } else {
        statusBadge.className = "badge-tech badge-waiting text-xs mt-1";
      }
    }

    if (startBtn) startBtn.disabled = (status === "LIVE");
    if (endBtn) endBtn.disabled = (status !== "LIVE");

    // Live Server Timer Countdown
    if (status === "LIVE" && data.startTime) {
      if (r2TimerInterval) clearInterval(r2TimerInterval);

      const duration = data.duration || 2400;
      r2TimerInterval = setInterval(() => {
        let startMs = Date.now();
        if (data.startTime.toMillis) {
          startMs = data.startTime.toMillis();
        } else if (data.startTime.seconds) {
          startMs = data.startTime.seconds * 1000;
        } else if (typeof data.startTime === "string" || typeof data.startTime === "number") {
          startMs = new Date(data.startTime).getTime();
        }
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        const remaining = Math.max(0, duration - elapsed);

        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (timerEl) {
          timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        if (remaining <= 0) {
          clearInterval(r2TimerInterval);
          if (timerEl) timerEl.textContent = "00:00 (TIME'S UP)";
        }
      }, 1000);
    } else {
      if (r2TimerInterval) clearInterval(r2TimerInterval);
      if (timerEl) timerEl.textContent = "40:00";
    }
  });
}

function listenToLiveRound2Participants() {
  const tableBody = document.getElementById("live-round2-tbody");
  if (!tableBody) return;

  onSnapshot(collection(db, "round2Attempts"), (snap) => {
    tableBody.innerHTML = "";
    const list = [];
    snap.forEach(docSnap => {
      list.push({ uid: docSnap.id, ...docSnap.data() });
    });

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 28px; color: var(--text-muted);" class="font-mono text-xs">
            No active candidates in Round 2 yet.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(item => {
      const row = document.createElement("tr");

      const pStatusMap = item.problemStatus || {};
      const submittedCount = Object.values(pStatusMap).filter(s => s === "submitted").length;
      const score = item.totalScore !== undefined ? item.totalScore : 0;
      const violations = item.violationCount || 0;
      const lang = item.language ? item.language.toUpperCase() : "NOT LOCKED";

      let status = "LOBBY";
      let badgeClass = "badge-waiting";

      if (item.isSubmitted) {
        status = "COMPLETED";
        badgeClass = "badge-tech";
      } else if (item.language) {
        status = "CODING";
        badgeClass = "badge-live";
      }

      row.innerHTML = `
        <td><strong>${escapeHtml(item.participantId || "N/A")}</strong></td>
        <td>${escapeHtml(item.name || "Candidate")}</td>
        <td><span class="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-sky-400 font-mono text-xs">${lang}</span></td>
        <td><strong>${submittedCount} / 4</strong></td>
        <td><strong class="text-sky-400">${score} / 400</strong></td>
        <td><span class="badge-tech ${violations > 0 ? 'badge-live' : 'badge-waiting'}">${violations}</span></td>
        <td><span class="badge-tech ${badgeClass}">${status}</span></td>
      `;

      tableBody.appendChild(row);
    });
  });
}

// =========================================================================
// ROUND 3 ADMIN CONTROLS & TELEMETRY
// =========================================================================

let r3TimerInterval = null;

function setupRound3Controls() {
  const startBtn = document.getElementById("btn-start-round3");
  const endBtn = document.getElementById("btn-end-round3");
  const resetBtn = document.getElementById("btn-reset-round3");

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      if (!confirm("START ROUND 3: FINAL BOSS?\nAll candidates waiting in the lounge will immediately enter the Final Boss coding arena.")) {
        return;
      }
      try {
        await setDoc(doc(db, "settings", "round3"), {
          status: "LIVE",
          startTime: serverTimestamp(),
          duration: 3000, // 50 mins
          totalProblems: 2,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showToast("ROUND 3 STARTED! Candidates are entering the Final Boss arena.", "success");
      } catch (e) {
        showToast("Error starting Round 3: " + e.message, "error");
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener("click", async () => {
      if (!confirm("END ROUND 3 NOW?\nAll candidate code editors will be closed and solutions finalized.")) {
        return;
      }
      try {
        await updateDoc(doc(db, "settings", "round3"), {
          status: "ENDED",
          endTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast("ROUND 3 HAS ENDED. Active coding sessions finalized.", "info");
      } catch (e) {
        showToast("Error ending Round 3: " + e.message, "error");
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      if (!confirm("RESET ROUND 3 STATUS TO WAITING?")) {
        return;
      }
      try {
        await setDoc(doc(db, "settings", "round3"), {
          status: "WAITING",
          startTime: null,
          endTime: null,
          duration: 3000,
          totalProblems: 2,
          updatedAt: serverTimestamp()
        });
        showToast("Round 3 status reset to WAITING.", "success");
      } catch (e) {
        showToast("Error resetting Round 3: " + e.message, "error");
      }
    });
  }
}

function listenToRound3SettingsAdmin() {
  const statusBadge = document.getElementById("r3-round-status-badge");
  const timerEl = document.getElementById("r3-countdown-timer");
  const startBtn = document.getElementById("btn-start-round3");
  const endBtn = document.getElementById("btn-end-round3");

  onSnapshot(doc(db, "settings", "round3"), (snap) => {
    if (!snap.exists()) {
      if (statusBadge) {
        statusBadge.textContent = "WAITING";
        statusBadge.className = "badge-tech badge-waiting text-xs mt-1";
      }
      if (startBtn) startBtn.disabled = false;
      if (endBtn) endBtn.disabled = true;
      return;
    }

    const data = snap.data();
    const status = data.status || "WAITING";

    if (statusBadge) {
      statusBadge.textContent = status;
      if (status === "LIVE") {
        statusBadge.className = "badge-tech badge-live text-xs mt-1 bg-indigo-900/40 border-indigo-500 text-indigo-300";
      } else if (status === "ENDED") {
        statusBadge.className = "badge-tech badge-ended text-xs mt-1";
      } else {
        statusBadge.className = "badge-tech badge-waiting text-xs mt-1";
      }
    }

    if (startBtn) startBtn.disabled = (status === "LIVE");
    if (endBtn) endBtn.disabled = (status !== "LIVE");

    // Live Server Timer Countdown
    if (status === "LIVE" && data.startTime) {
      if (r3TimerInterval) clearInterval(r3TimerInterval);

      const duration = data.duration || 3000;
      r3TimerInterval = setInterval(() => {
        let startMs = Date.now();
        if (data.startTime.toMillis) {
          startMs = data.startTime.toMillis();
        } else if (data.startTime.seconds) {
          startMs = data.startTime.seconds * 1000;
        } else if (typeof data.startTime === "string" || typeof data.startTime === "number") {
          startMs = new Date(data.startTime).getTime();
        }
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        const remaining = Math.max(0, duration - elapsed);

        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (timerEl) {
          timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        if (remaining <= 0) {
          clearInterval(r3TimerInterval);
          if (timerEl) timerEl.textContent = "00:00 (TIME'S UP)";
        }
      }, 1000);
    } else {
      if (r3TimerInterval) clearInterval(r3TimerInterval);
      if (timerEl) timerEl.textContent = "50:00";
    }
  });
}

function listenToLiveRound3Participants() {
  const tableBody = document.getElementById("live-round3-tbody");
  if (!tableBody) return;

  onSnapshot(collection(db, "round3Attempts"), (snap) => {
    tableBody.innerHTML = "";
    const list = [];
    snap.forEach(docSnap => {
      list.push({ uid: docSnap.id, ...docSnap.data() });
    });

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 28px; color: var(--text-muted);" class="font-mono text-xs">
            No active candidates in Round 3 Final Boss yet.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(item => {
      const row = document.createElement("tr");

      const pStatusMap = item.problemStatus || {};
      const submittedCount = Object.values(pStatusMap).filter(s => s === "submitted").length;
      const score = item.totalScore !== undefined ? item.totalScore : 0;
      const violations = item.violationCount || 0;
      const lang = item.language ? item.language.toUpperCase() : "NOT LOCKED";

      let status = "LOBBY";
      let badgeClass = "badge-waiting";

      if (item.isSubmitted) {
        status = "COMPLETED";
        badgeClass = "badge-tech";
      } else if (item.language) {
        status = "CODING";
        badgeClass = "badge-live";
      }

      row.innerHTML = `
        <td><strong>${escapeHtml(item.participantId || "N/A")}</strong></td>
        <td>${escapeHtml(item.name || "Candidate")}</td>
        <td><span class="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-indigo-400 font-mono text-xs">${lang}</span></td>
        <td><strong>${submittedCount} / 2</strong></td>
        <td><strong class="text-indigo-400">${score} / 500</strong></td>
        <td><span class="badge-tech ${violations > 0 ? 'badge-live' : 'badge-waiting'}">${violations}</span></td>
        <td><span class="badge-tech ${badgeClass}">${status}</span></td>
      `;

      tableBody.appendChild(row);
    });
  });
}

// =========================================================================
// TEAM QUALIFICATION / CUTOFF ENGINE (ROUND 2 & ROUND 3 FILTERS)
// =========================================================================

function setupTeamQualificationControls() {
  const btnQualifyR2 = document.getElementById("btn-qualify-r2");
  const countR2Input = document.getElementById("qualify-r2-count");
  const statusR2 = document.getElementById("qualify-r2-status");

  const btnQualifyR3 = document.getElementById("btn-qualify-r3");
  const countR3Input = document.getElementById("qualify-r3-count");
  const statusR3 = document.getElementById("qualify-r3-status");

  if (btnQualifyR2) {
    btnQualifyR2.addEventListener("click", async () => {
      const topN = parseInt(countR2Input ? countR2Input.value : "18", 10) || 18;
      if (!confirm(`Qualify Top ${topN} Teams for Round 2 based on Round 1 standings?`)) return;

      btnQualifyR2.disabled = true;
      if (statusR2) statusR2.textContent = "Computing standings...";

      try {
        const r1Snap = await getDocs(collection(db, "results"));
        const results = [];
        r1Snap.forEach(d => results.push({ uid: d.id, ...d.data() }));

        results.sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0);
        });

        const qualifiedUids = new Set(results.slice(0, topN).map(r => r.uid));

        const pSnap = await getDocs(collection(db, "participants"));
        const batch = writeBatch(db);

        pSnap.forEach(d => {
          if (d.data().role === "participant") {
            const isQual = qualifiedUids.has(d.id);
            batch.update(doc(db, "participants", d.id), {
              qualifiedForRound2: isQual
            });
          }
        });

        batch.set(doc(db, "settings", "round2"), {
          qualifiedCount: topN,
          qualifiedAt: serverTimestamp()
        }, { merge: true });

        await batch.commit();

        showToast(`Success! Top ${qualifiedUids.size} teams qualified for Round 2.`, "success");
        if (statusR2) statusR2.textContent = `✓ Top ${qualifiedUids.size} qualified`;
      } catch (err) {
        console.error("Qualify R2 error:", err);
        showToast("Error qualifying teams: " + err.message, "error");
        if (statusR2) statusR2.textContent = "Error";
      } finally {
        btnQualifyR2.disabled = false;
      }
    });
  }

  if (btnQualifyR3) {
    btnQualifyR3.addEventListener("click", async () => {
      const topN = parseInt(countR3Input ? countR3Input.value : "8", 10) || 8;
      if (!confirm(`Qualify Top ${topN} Finalist Teams for Round 3 based on cumulative R1 + R2 standings?`)) return;

      btnQualifyR3.disabled = true;
      if (statusR3) statusR3.textContent = "Computing finalists...";

      try {
        const r1Snap = await getDocs(collection(db, "results"));
        const r2Snap = await getDocs(collection(db, "round2Results"));

        const r1Map = {};
        r1Snap.forEach(d => { r1Map[d.id] = d.data(); });

        const r2Map = {};
        r2Snap.forEach(d => { r2Map[d.id] = d.data(); });

        const allUids = new Set([...Object.keys(r1Map), ...Object.keys(r2Map)]);
        const combined = [];

        allUids.forEach(uid => {
          const r1 = r1Map[uid] || {};
          const r2 = r2Map[uid] || {};
          const totalScore = (Number(r1.score) || 0) + (Number(r2.totalScore) || 0);
          const r2Score = Number(r2.totalScore) || 0;
          const totalTime = (Number(r1.timeTakenSeconds) || 0) + (Number(r2.timeTaken) || 0);

          combined.push({ uid, totalScore, r2Score, totalTime });
        });

        combined.sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          if (b.r2Score !== a.r2Score) return b.r2Score - a.r2Score;
          return a.totalTime - b.totalTime;
        });

        const qualifiedUids = new Set(combined.slice(0, topN).map(r => r.uid));

        const pSnap = await getDocs(collection(db, "participants"));
        const batch = writeBatch(db);

        pSnap.forEach(d => {
          if (d.data().role === "participant") {
            const isQual = qualifiedUids.has(d.id);
            batch.update(doc(db, "participants", d.id), {
              qualifiedForRound3: isQual
            });
          }
        });

        batch.set(doc(db, "settings", "round3"), {
          qualifiedCount: topN,
          qualifiedAt: serverTimestamp()
        }, { merge: true });

        await batch.commit();

        showToast(`Success! Top ${qualifiedUids.size} finalist teams qualified for Round 3.`, "success");
        if (statusR3) statusR3.textContent = `✓ Top ${qualifiedUids.size} finalists qualified`;
      } catch (err) {
        console.error("Qualify R3 error:", err);
        showToast("Error qualifying finalists: " + err.message, "error");
        if (statusR3) statusR3.textContent = "Error";
      } finally {
        btnQualifyR3.disabled = false;
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

    let qualBadge = '<span class="badge-tech badge-waiting text-[10px]">Round 1</span>';
    if (p.qualifiedForRound3) {
      qualBadge = '<span class="badge-tech text-[10px] bg-purple-900/40 border-purple-500 text-purple-300">R3 Finalist</span>';
    } else if (p.qualifiedForRound2) {
      qualBadge = '<span class="badge-tech text-[10px] bg-emerald-900/40 border-emerald-500 text-emerald-300">R2 Qualified</span>';
    } else if (p.qualifiedForRound2 === false) {
      qualBadge = '<span class="badge-tech badge-ended text-[10px]">Eliminated</span>';
    }

    row.innerHTML = `
      <td><strong>${escapeHtml(p.participantId || "N/A")}</strong></td>
      <td><strong class="text-white">${escapeHtml(p.name || "Team")}</strong></td>
      <td>
        <span class="badge-tech ${status === 'COMPLETED' ? 'badge-tech' : status === 'IN PROGRESS' ? 'badge-live' : 'badge-waiting'}">
          ${status}
        </span>
      </td>
      <td>${qualBadge}</td>
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
        <div style="display:flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn-cyber-outline py-1 px-2 text-xs" onclick="window.toggleParticipantActive('${p.uid}', ${isActive})">
            ${isActive ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-cyber-outline py-1 px-2 text-xs text-amber-400 border-amber-500/50" onclick="window.resetParticipantAttempt('${p.uid}', '${escapeHtml(p.participantId || p.name)}')">
            Reset
          </button>
          <button class="btn-cyber-danger py-1 px-2 text-xs" onclick="window.deleteParticipant('${p.uid}', '${escapeHtml(p.participantId || p.name)}')">
            Delete
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
      // Suggest next Team ID (e.g. TECH001)
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
        showToast("Please provide both Team Name and Team ID.", "error");
        return;
      }

      // Generate password in format: technora@<teamname>
      const cleanTeam = name.replace(/[^a-zA-Z0-9]/g, "");
      const password = `technora@${cleanTeam || participantId.toLowerCase()}`;
      const email = getParticipantEmail(participantId);

      const submitBtn = form.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;

      try {
        // Use secondary Auth app so admin isn't logged out
        const secondaryAuth = getSecondaryAuth();
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUid = userCred.user.uid;

        // Create Firestore participant doc
        await setDoc(doc(db, "participants", newUid), {
          participantId: participantId,
          name: name,
          teamName: name,
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
        const resTeam = document.getElementById("res-team-name");
        const resId = document.getElementById("res-participant-id");
        const resPass = document.getElementById("res-participant-password");
        if (resTeam) resTeam.textContent = name;
        if (resId) resId.textContent = participantId;
        if (resPass) resPass.textContent = password;

        if (resultModal) resultModal.classList.remove("hidden");
        showToast(`Team "${name}" (${participantId}) successfully registered!`, "success");

      } catch (err) {
        console.error("Team creation error:", err);
        showToast("Creation failed: " + (err.code === "auth/email-already-in-use" ? "Team ID already exists." : err.message), "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const team = document.getElementById("res-team-name")?.textContent || "Team";
      const pId = document.getElementById("res-participant-id").textContent;
      const pass = document.getElementById("res-participant-password").textContent;
      const textToCopy = `TECHNORA'26 — TOURNAMENT CREDENTIALS\nTeam Name: ${team}\nTeam ID: ${pId}\nPassword: ${pass}\nPortal: ${window.location.origin}/index.html`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Team credentials copied to clipboard!", "success");
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
  if (!confirm(`RESET ATTEMPTS FOR TEAM ${participantId}?\n\nThis will clear all test scores and attempts (Round 1, Round 2, Round 3) from Firebase, allowing the team to start fresh.`)) {
    return;
  }

  try {
    // Purge attempt & result docs across all 3 rounds directly from Firestore
    await Promise.allSettled([
      deleteDoc(doc(db, "attempts", uid)),
      deleteDoc(doc(db, "results", uid)),
      deleteDoc(doc(db, "round2Attempts", uid)),
      deleteDoc(doc(db, "round2Results", uid)),
      deleteDoc(doc(db, "round3Attempts", uid)),
      deleteDoc(doc(db, "round3Results", uid))
    ]);

    // Reset participant doc state
    await updateDoc(doc(db, "participants", uid), {
      hasAttempted: false,
      status: "NOT STARTED",
      score: 0,
      violationCount: 0,
      answeredCount: 0,
      timeTaken: null,
      qualifiedForRound2: null,
      qualifiedForRound3: null
    });

    showToast(`All test attempts for Team ${participantId} have been reset in Firestore.`, "success");
  } catch (e) {
    showToast("Reset failed: " + e.message, "error");
  }
};

window.deleteParticipant = async (uid, participantId) => {
  if (!confirm(`⚠️ PERMANENTLY DELETE TEAM ${participantId} DIRECTLY FROM FIREBASE?\n\nThis will permanently delete:\n- Team profile in Firestore (participants/${uid})\n- Round 1 attempt & scores\n- Round 2 code & results\n- Round 3 code & results\n- Remove immediately from all live leaderboards.\n\nAre you sure?`)) {
    return;
  }

  try {
    // Delete directly from all Firebase Firestore collections in parallel
    await Promise.allSettled([
      deleteDoc(doc(db, "participants", uid)),
      deleteDoc(doc(db, "attempts", uid)),
      deleteDoc(doc(db, "results", uid)),
      deleteDoc(doc(db, "round2Attempts", uid)),
      deleteDoc(doc(db, "round2Results", uid)),
      deleteDoc(doc(db, "round3Attempts", uid)),
      deleteDoc(doc(db, "round3Results", uid))
    ]);

    showToast(`Team ${participantId} directly deleted from Firebase Firestore!`, "success");
  } catch (e) {
    showToast("Delete failed: " + e.message, "error");
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

// =========================================================================
// ROUND 2 PROBLEM REPOSITORY FUNCTIONS
// =========================================================================

function renderRound2ProblemsList() {
  const container = document.getElementById("r2-problems-list");
  if (!container) return;

  container.innerHTML = ROUND2_PROBLEMS.map((p) => `
    <div class="glass-panel p-6 border-sky-950">
      <div class="flex justify-between items-start mb-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="badge-tech badge-live text-xs">PROBLEM ${p.number}</span>
            <span class="badge-tech badge-waiting text-xs">${p.difficulty}</span>
            <span class="font-mono text-xs text-sky-400">${p.category}</span>
          </div>
          <h2 class="font-display text-xl font-bold text-white">${p.title}</h2>
        </div>
        <div class="text-right text-xs font-mono text-slate-400">
          <div>Time Limit: <strong class="text-white">${p.timeLimit}s</strong></div>
          <div>Memory Limit: <strong class="text-white">${p.memoryLimit}</strong></div>
          <div>Points: <strong class="text-emerald-400">${p.points} Pts</strong></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono mb-4">
        <div class="bg-slate-900/70 p-3 rounded border border-slate-800">
          <div class="text-sky-400 font-bold mb-1">PUBLIC TEST CASES (${p.publicTests.length})</div>
          <div class="text-slate-400">Evaluated on [RUN CODE]. Visible in contestant test drawer.</div>
        </div>
        <div class="bg-slate-900/70 p-3 rounded border border-slate-800">
          <div class="text-amber-400 font-bold mb-1">HIDDEN TEST CASES (${p.hiddenTests.length})</div>
          <div class="text-slate-400">Evaluated on [SUBMIT PROBLEM] for official scoring. Never exposed.</div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
        <span>Starter Templates:</span>
        <span class="px-2 py-0.5 bg-slate-800 text-sky-300 rounded">Python 3</span>
        <span class="px-2 py-0.5 bg-slate-800 text-sky-300 rounded">C++</span>
        <span class="px-2 py-0.5 bg-slate-800 text-sky-300 rounded">C</span>
        <span class="px-2 py-0.5 bg-slate-800 text-sky-300 rounded">Java</span>
      </div>
    </div>
  `).join("");
}

function setupRound2SeedButton() {
  const btn = document.getElementById("btn-seed-round2-problems");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Seeding Problems...";

    try {
      const batch = writeBatch(db);
      ROUND2_PROBLEMS.forEach(prob => {
        const ref = doc(db, "round2Problems", prob.id);
        batch.set(ref, {
          ...prob,
          active: true
        });
      });
      await batch.commit();

      showToast("4 Hard Coding Problems successfully seeded to Firestore round2Problems collection!", "success");
    } catch (err) {
      console.error("Round 2 seeding error:", err);
      showToast("Seeding failed: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        ⚡ SEED 4 ROUND 2 PROBLEMS TO FIRESTORE
      `;
    }
  });
}

// =========================================================================
// ROUND 3 PROBLEM REPOSITORY FUNCTIONS
// =========================================================================

function renderRound3ProblemsList() {
  const container = document.getElementById("r3-problems-list");
  if (!container) return;

  container.innerHTML = ROUND3_PROBLEMS.map((p) => `
    <div class="glass-panel p-6 border-indigo-950 bg-slate-950/70">
      <div class="flex justify-between items-start mb-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="badge-tech badge-live text-xs bg-indigo-900/60 border-indigo-500 text-indigo-300">FINAL BOSS • PROBLEM ${p.number}</span>
            <span class="badge-tech badge-waiting text-xs border-purple-500/50 text-purple-300">${p.difficulty}</span>
            <span class="font-mono text-xs text-sky-400">${p.category}</span>
          </div>
          <h2 class="font-display text-xl font-bold text-white">${p.title}</h2>
        </div>
        <div class="text-right text-xs font-mono text-slate-400">
          <div>Time Limit: <strong class="text-white">${p.timeLimit}s</strong></div>
          <div>Memory Limit: <strong class="text-white">${p.memoryLimit}</strong></div>
          <div>Points: <strong class="text-indigo-400">${p.points} Pts</strong></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono mb-4">
        <div class="bg-slate-900/70 p-3 rounded border border-slate-800">
          <div class="text-indigo-400 font-bold mb-1">PUBLIC TEST CASES (${p.publicTests.length})</div>
          <div class="text-slate-400">Evaluated on [RUN CODE]. Visible in candidate test drawer.</div>
        </div>
        <div class="bg-slate-900/70 p-3 rounded border border-slate-800">
          <div class="text-purple-400 font-bold mb-1">HIDDEN TEST CASES (${p.hiddenTests.length})</div>
          <div class="text-slate-400">Evaluated on [SUBMIT PROBLEM] for official scoring (250 Marks). Never exposed.</div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
        <span>Starter Code (~60 lines):</span>
        <span class="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded">Python 3</span>
        <span class="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded">C++</span>
        <span class="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded">C</span>
        <span class="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded">Java</span>
      </div>
    </div>
  `).join("");
}

function setupRound3SeedButton() {
  const btn = document.getElementById("btn-seed-round3-problems");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Seeding Final Boss Problems...";

    try {
      const batch = writeBatch(db);
      ROUND3_PROBLEMS.forEach(prob => {
        const ref = doc(db, "round3Problems", prob.id);
        batch.set(ref, {
          ...prob,
          active: true
        });
      });
      await batch.commit();

      showToast("2 Hard+ Final Boss Problems successfully seeded to Firestore round3Problems collection!", "success");
    } catch (err) {
      console.error("Round 3 seeding error:", err);
      showToast("Seeding failed: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        ⚡ SEED 2 ROUND 3 PROBLEMS TO FIRESTORE
      `;
    }
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

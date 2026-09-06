/**
 * TECHNORA'26 — 3-ROUND UNIFIED LEADERBOARD
 * Live Real-Time Leaderboard Engine
 * 
 * Merges scores from:
 * - results/{uid} (Round 1: 20 marks)
 * - round2Results/{uid} (Round 2: 400 marks)
 * - round3Results/{uid} (Round 3: 500 marks)
 * 
 * Total: 920 marks
 * 
 * Sorting Hierarchy:
 * 1. Highest total score
 * 2. Highest Round 3 (Final Boss) score
 * 3. Highest Round 2 (Code Breaker) score
 * 4. Lowest total completion time
 */

import { 
  db, 
  collection, 
  onSnapshot 
} from "./firebase-config.js";

let r1ResultsMap = new Map();
let r2ResultsMap = new Map();
let r3ResultsMap = new Map();
let mergedList = [];

export function initLeaderboard(tableBodyId, searchInputId = null, isAdmin = false) {
  const tableBody = document.getElementById(tableBodyId);
  const searchInput = searchInputId ? document.getElementById(searchInputId) : null;

  if (!tableBody) return;

  // Real-time listener for Round 1
  onSnapshot(collection(db, "results"), (r1Snap) => {
    r1ResultsMap.clear();
    r1Snap.forEach(docSnap => {
      r1ResultsMap.set(docSnap.id, { uid: docSnap.id, ...docSnap.data() });
    });
    recomputeAndRenderLeaderboard(tableBody, searchInput, isAdmin);
  }, (err) => console.error("R1 Leaderboard sync error:", err));

  // Real-time listener for Round 2
  onSnapshot(collection(db, "round2Results"), (r2Snap) => {
    r2ResultsMap.clear();
    r2Snap.forEach(docSnap => {
      r2ResultsMap.set(docSnap.id, { uid: docSnap.id, ...docSnap.data() });
    });
    recomputeAndRenderLeaderboard(tableBody, searchInput, isAdmin);
  }, (err) => console.error("R2 Leaderboard sync error:", err));

  // Real-time listener for Round 3 (Final Boss)
  onSnapshot(collection(db, "round3Results"), (r3Snap) => {
    r3ResultsMap.clear();
    r3Snap.forEach(docSnap => {
      r3ResultsMap.set(docSnap.id, { uid: docSnap.id, ...docSnap.data() });
    });
    recomputeAndRenderLeaderboard(tableBody, searchInput, isAdmin);
  }, (err) => console.error("R3 Leaderboard sync error:", err));

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      filterAndRender(tableBody, searchInput.value, isAdmin);
    });
  }
}

function recomputeAndRenderLeaderboard(tableBody, searchInput, isAdmin) {
  const allUids = new Set([
    ...r1ResultsMap.keys(), 
    ...r2ResultsMap.keys(), 
    ...r3ResultsMap.keys()
  ]);
  mergedList = [];

  allUids.forEach(uid => {
    const r1 = r1ResultsMap.get(uid) || {};
    const r2 = r2ResultsMap.get(uid) || {};
    const r3 = r3ResultsMap.get(uid) || {};

    const participantId = r1.participantId || r2.participantId || r3.participantId || "N/A";
    const name = r1.name || r2.name || r3.name || "Participant";
    
    const r1Score = Number(r1.score) || 0;
    const r2Score = Number(r2.totalScore) || 0;
    const r3Score = Number(r3.totalScore) || 0;
    const totalScore = r1Score + r2Score + r3Score;

    const r1TimeSec = Number(r1.timeTakenSeconds) || 0;
    const r2TimeSec = Number(r2.timeTaken) || 0;
    const r3TimeSec = Number(r3.timeUsed) || 0;
    const totalTimeSec = r1TimeSec + r2TimeSec + r3TimeSec;

    const violations = (r1.violationCount || 0) + (r2.violationCount || 0) + (r3.violationCount || 0);

    mergedList.push({
      uid,
      participantId,
      name,
      r1Score,
      r2Score,
      r3Score,
      totalScore,
      r1Attempted: !!r1.participantId,
      r2Attempted: !!r2.participantId,
      r3Attempted: !!r3.participantId,
      totalTimeSec,
      violations
    });
  });

  // 4-Tier Sort: 1st Total Score desc, 2nd R3 score desc, 3rd R2 score desc, 4th Total Time asc
  mergedList.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.r3Score !== a.r3Score) {
      return b.r3Score - a.r3Score;
    }
    if (b.r2Score !== a.r2Score) {
      return b.r2Score - a.r2Score;
    }
    return a.totalTimeSec - b.totalTimeSec;
  });

  const term = searchInput ? searchInput.value : "";
  filterAndRender(tableBody, term, isAdmin);
  updateSummaryStats(mergedList);
  renderChampionsPodium(mergedList);
}

function filterAndRender(tableBody, term, isAdmin) {
  const searchTerm = (term || "").toLowerCase().trim();
  const filtered = mergedList.filter(item => 
    (item.name && item.name.toLowerCase().includes(searchTerm)) ||
    (item.participantId && item.participantId.toLowerCase().includes(searchTerm))
  );

  renderLeaderboardRows(tableBody, filtered, isAdmin);
}

function renderLeaderboardRows(container, list, isAdmin) {
  container.innerHTML = "";

  if (list.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="${isAdmin ? 8 : 7}" style="text-align:center; padding: 36px; color: var(--text-muted);" class="font-mono text-xs">
        No assessment submissions recorded yet. Rankings will update automatically as candidates complete Round 1, Round 2 &amp; Round 3.
      </td>
    `;
    container.appendChild(emptyRow);
    return;
  }

  list.forEach((entry, idx) => {
    const rank = idx + 1;
    const row = document.createElement("tr");

    let rankDisplay = `#${rank}`;
    let rankBadgeClass = "font-mono font-bold text-slate-300";

    if (rank === 1) {
      rankBadgeClass = "text-yellow-400 font-bold font-mono";
      rankDisplay = `🥇 #1`;
    } else if (rank === 2) {
      rankBadgeClass = "text-slate-200 font-bold font-mono";
      rankDisplay = `🥈 #2`;
    } else if (rank === 3) {
      rankBadgeClass = "text-amber-500 font-bold font-mono";
      rankDisplay = `🥉 #3`;
    }

    const m = Math.floor(entry.totalTimeSec / 60);
    const s = entry.totalTimeSec % 60;
    const formattedTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    let adminViolationCol = "";
    if (isAdmin) {
      adminViolationCol = `
        <td>
          <span class="badge-tech ${entry.violations > 0 ? 'badge-live' : 'badge-waiting'}">
            ${entry.violations}
          </span>
        </td>
      `;
    }

    row.innerHTML = `
      <td class="${rankBadgeClass}">${rankDisplay}</td>
      <td>
        <div class="font-bold text-white">${escapeHtml(entry.name)}</div>
        <div class="font-mono text-[11px] text-sky-400">${escapeHtml(entry.participantId)}</div>
      </td>
      <td>
        <span class="font-mono text-slate-300">
          ${entry.r1Attempted ? `${entry.r1Score} / 20` : '—'}
        </span>
      </td>
      <td>
        <span class="font-mono text-sky-300">
          ${entry.r2Attempted ? `${entry.r2Score} / 400` : '—'}
        </span>
      </td>
      <td>
        <span class="font-mono text-indigo-300">
          ${entry.r3Attempted ? `${entry.r3Score} / 500` : '—'}
        </span>
      </td>
      <td>
        <span class="font-mono font-black text-emerald-400 text-base">
          ${entry.totalScore} <span class="text-xs text-slate-500 font-normal">/ 920</span>
        </span>
      </td>
      <td class="font-mono text-slate-400 text-xs">
        ${formattedTime}
      </td>
      ${adminViolationCol}
    `;

    container.appendChild(row);
  });
}

function updateSummaryStats(list) {
  const totalSubmissionsEl = document.getElementById("stat-total-submissions");
  const highestScoreEl = document.getElementById("stat-highest-score");
  const avgScoreEl = document.getElementById("stat-average-score");

  if (totalSubmissionsEl) totalSubmissionsEl.textContent = list.length;

  if (list.length > 0) {
    const highest = Math.max(...list.map(r => r.totalScore));
    const sum = list.reduce((acc, curr) => acc + curr.totalScore, 0);
    const avg = (sum / list.length).toFixed(1);

    if (highestScoreEl) highestScoreEl.textContent = `${highest} / 920`;
    if (avgScoreEl) avgScoreEl.textContent = `${avg} / 920`;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderChampionsPodium(list) {
  const podiumEl = document.getElementById("champions-podium");
  const container = document.getElementById("podium-cards-container");
  if (!podiumEl || !container) return;

  if (list.length === 0) {
    podiumEl.classList.add("hidden");
    return;
  }

  podiumEl.classList.remove("hidden");
  container.innerHTML = "";

  const champions = list.slice(0, 2);

  champions.forEach((champ, idx) => {
    const isWinner = idx === 0;
    const medal = isWinner ? "🥇" : "🥈";
    const title = isWinner ? "1ST PLACE — GRAND CHAMPION" : "2ND PLACE — RUNNER-UP";
    const borderClass = isWinner ? "border-yellow-500/60 bg-yellow-950/20" : "border-slate-400/60 bg-slate-900/40";
    const textAccent = isWinner ? "text-yellow-400" : "text-slate-300";

    const m = Math.floor(champ.totalTimeSec / 60);
    const s = champ.totalTimeSec % 60;
    const formattedTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const card = document.createElement("div");
    card.className = `glass-panel p-5 border ${borderClass} relative overflow-hidden flex flex-col justify-between`;
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <span class="text-xs font-mono font-bold ${textAccent} tracking-wider flex items-center gap-1">
            <span>${medal}</span> ${title}
          </span>
          <h3 class="text-xl font-bold text-white mt-1">${escapeHtml(champ.name)}</h3>
          <div class="font-mono text-xs text-sky-400 font-semibold">${escapeHtml(champ.participantId)}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-mono text-slate-400 uppercase">Total Score</div>
          <div class="text-2xl font-black font-mono ${isWinner ? 'text-yellow-400' : 'text-slate-200'}">
            ${champ.totalScore} <span class="text-xs text-slate-500 font-normal">/ 920</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-2 pt-3 border-t border-sky-950/50 text-center font-mono text-xs">
        <div class="bg-black/30 p-1.5 rounded">
          <div class="text-[10px] text-slate-500">R1</div>
          <div class="text-slate-300 font-bold">${champ.r1Score}/20</div>
        </div>
        <div class="bg-black/30 p-1.5 rounded">
          <div class="text-[10px] text-slate-500">R2</div>
          <div class="text-sky-300 font-bold">${champ.r2Score}/400</div>
        </div>
        <div class="bg-black/30 p-1.5 rounded">
          <div class="text-[10px] text-slate-500">R3</div>
          <div class="text-indigo-300 font-bold">${champ.r3Score}/500</div>
        </div>
        <div class="bg-black/30 p-1.5 rounded">
          <div class="text-[10px] text-slate-500">Time</div>
          <div class="text-emerald-400 font-bold">${formattedTime}</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}


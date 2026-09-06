/**
 * TECHNORA'26 — ROUND 1: DEBUG ARENA
 * Live Real-Time Leaderboard Engine
 * 
 * Sorts primarily by highest score, with lowest completion time as tie-breaker.
 * Real-time onSnapshot listener on `results` collection.
 */

import { 
  db, 
  collection, 
  onSnapshot 
} from "./firebase-config.js";

let unsubscribeLeaderboard = null;
let allResults = [];

export function initLeaderboard(tableBodyId, searchInputId = null, isAdmin = false) {
  const tableBody = document.getElementById(tableBodyId);
  const searchInput = searchInputId ? document.getElementById(searchInputId) : null;

  if (!tableBody) return;

  // Real-time snapshot listener on results collection
  const resultsCol = collection(db, "results");

  unsubscribeLeaderboard = onSnapshot(resultsCol, (snapshot) => {
    allResults = [];

    snapshot.forEach(docSnap => {
      allResults.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort: 1st by score descending, 2nd by timeTakenSeconds ascending
    allResults.sort((a, b) => {
      const scoreA = Number(a.score) || 0;
      const scoreB = Number(b.score) || 0;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      const timeA = Number(a.timeTakenSeconds) || 999999;
      const timeB = Number(b.timeTakenSeconds) || 999999;
      return timeA - timeB;
    });

    renderLeaderboardRows(tableBody, allResults, isAdmin);
    updateSummaryStats(allResults);
  }, (error) => {
    console.error("Leaderboard real-time subscription error:", error);
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = allResults.filter(r => 
        (r.name && r.name.toLowerCase().includes(term)) ||
        (r.participantId && r.participantId.toLowerCase().includes(term))
      );
      renderLeaderboardRows(tableBody, filtered, isAdmin);
    });
  }
}

function renderLeaderboardRows(container, resultsList, isAdmin) {
  container.innerHTML = "";

  if (resultsList.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="${isAdmin ? 6 : 4}" style="text-align:center; padding: 36px; color: var(--text-muted);">
        No submissions recorded yet. The arena is awaiting participant test completions.
      </td>
    `;
    container.appendChild(emptyRow);
    return;
  }

  resultsList.forEach((entry, idx) => {
    const rank = idx + 1;
    const row = document.createElement("tr");

    let rankBadgeClass = "rank-default";
    let rankDisplay = `#${rank}`;
    if (rank === 1) {
      rankBadgeClass = "text-yellow-400 font-bold";
      rankDisplay = `🥇 #1`;
    } else if (rank === 2) {
      rankBadgeClass = "text-slate-300 font-bold";
      rankDisplay = `🥈 #2`;
    } else if (rank === 3) {
      rankBadgeClass = "text-amber-600 font-bold";
      rankDisplay = `🥉 #3`;
    }

    const participantName = escapeHtml(entry.name || "Anonymous");
    const participantId = escapeHtml(entry.participantId || "N/A");
    const scoreText = `${entry.score !== undefined ? entry.score : 0} / ${entry.totalQuestions || 20}`;
    const timeText = entry.timeTaken || "N/A";
    const violations = entry.violationCount || 0;

    let adminExtraCols = "";
    if (isAdmin) {
      adminExtraCols = `
        <td><span class="badge-tech ${violations > 0 ? 'badge-live' : 'badge-waiting'}">${violations}</span></td>
        <td>
          <button class="btn-cyber-outline py-1 px-3 text-xs" onclick="window.viewParticipantDetail('${entry.uid || entry.id}')">
            Audit
          </button>
        </td>
      `;
    }

    row.innerHTML = `
      <td class="${rankBadgeClass}">${rankDisplay}</td>
      <td>
        <div style="font-weight: 600; color: var(--text-primary);">${participantName}</div>
        <div style="font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-mono);">${participantId}</div>
      </td>
      <td>
        <span style="font-weight: 700; color: var(--cyan-bright); font-family: var(--font-mono); font-size: 1rem;">
          ${scoreText}
        </span>
      </td>
      <td style="font-family: var(--font-mono); color: var(--text-secondary);">
        ${timeText}
      </td>
      ${adminExtraCols}
    `;

    container.appendChild(row);
  });
}

function updateSummaryStats(resultsList) {
  const totalSubmissionsEl = document.getElementById("stat-total-submissions");
  const highestScoreEl = document.getElementById("stat-highest-score");
  const avgScoreEl = document.getElementById("stat-average-score");

  if (totalSubmissionsEl) totalSubmissionsEl.textContent = resultsList.length;

  if (resultsList.length > 0) {
    const highest = Math.max(...resultsList.map(r => Number(r.score) || 0));
    const sum = resultsList.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    const avg = (sum / resultsList.length).toFixed(1);

    if (highestScoreEl) highestScoreEl.textContent = `${highest} / 20`;
    if (avgScoreEl) avgScoreEl.textContent = `${avg} / 20`;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

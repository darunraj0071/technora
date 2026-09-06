/**
 * TECHNORA'26 — Anti-Cheat & Security Hardening Module
 * Prevents clipboard theft, copy-paste, right-click inspection,
 * and unauthorized developer shortcuts during active assessments.
 */

import { showToast } from "./auth.js";

export function initAntiCheat(options = {}) {
  const { onViolation = null } = options;

  let lastWarningTime = 0;
  function triggerWarning(msg = "Clipboard operations & shortcuts are strictly disabled during the assessment!") {
    const now = Date.now();
    if (now - lastWarningTime > 2000) {
      showToast(`⚠️ ${msg}`, "error", 3000);
      lastWarningTime = now;
      if (typeof onViolation === "function") {
        onViolation();
      }
    }
  }

  // 1. Disable Right-Click Context Menu
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    triggerWarning("Right-click context menu is prohibited.");
    return false;
  }, { capture: true });

  // 2. Disable Copy, Cut, Paste events
  ["copy", "cut", "paste"].forEach((evt) => {
    document.addEventListener(evt, (e) => {
      e.preventDefault();
      triggerWarning(`Action [${evt.toUpperCase()}] is blocked.`);
      return false;
    }, { capture: true });
  });

  // 3. Disable Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U, F12, DevTools)
  document.addEventListener("keydown", (e) => {
    const key = e.key ? e.key.toLowerCase() : "";
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // F12 or F11
    if (e.key === "F12") {
      e.preventDefault();
      e.stopPropagation();
      triggerWarning("Developer Tools (F12) blocked.");
      return false;
    }

    if (isCtrlOrMeta) {
      // Ctrl+C, Ctrl+V, Ctrl+X
      if (key === "c" || key === "v" || key === "x") {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning(`Ctrl+${key.toUpperCase()} is disabled.`);
        return false;
      }

      // Ctrl+U (View Source)
      if (key === "u") {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning("View Source is prohibited.");
        return false;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning("Developer inspection is prohibited.");
        return false;
      }

      // Ctrl+S (Save Page)
      if (key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+P (Print Page)
      if (key === "p") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }, { capture: true });

  // 4. Disable Drag and Drop text extraction
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
    return false;
  });
}

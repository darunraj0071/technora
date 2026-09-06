/**
 * TECHNORA'26 — Proctored Anti-Cheating & Integrity Engine
 * Adapted from VetriPath Learn Proctored Architecture
 * Features:
 *  1. Anti-Screenshot & Screen Snipping Interception (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5)
 *  2. Instant Clipboard Buffer Wipe on Capture Attempt
 *  3. Screenshot Security Blackout Curtain
 *  4. Background Defocus / Snipping Tool Obscure Guard
 *  5. Complete Right-Click & Mobile Long-Press (Google Lens) Prohibition
 *  6. Drag-and-Drop Content Theft Prevention
 *  7. Code-Editor Safe (permits normal typing inside code editor & inputs)
 *  8. DevTools & View Source Shortcut Elimination
 */

(function () {
  let blurOverlay = null;

  function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    return tag === 'textarea' || tag === 'input' || el.isContentEditable ||
           el.classList.contains('editor-textarea') || el.id === 'code-editor' ||
           el.classList.contains('monaco-editor') || el.closest('#code-editor') ||
           el.closest('.monaco-editor') || el.classList.contains('code-input');
  }

  function showSecurityToast(msg, type = "error") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.style.cssText = "background: rgba(15, 23, 42, 0.95); border: 1px solid #ef4444; color: #fca5a5; padding: 12px 18px; border-radius: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; margin-bottom: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 10px; z-index: 99999999;";
    toast.innerHTML = `<span>🛡️</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // --- 1. Anti-Screenshot & Screen Capture Protection Curtain ---
  function triggerScreenshotBlockShield(reason = "Screenshot attempt intercepted") {
    let shield = document.getElementById('screenshot-security-shield');
    if (!shield) {
      shield = document.createElement('div');
      shield.id = 'screenshot-security-shield';
      shield.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(3, 7, 18, 0.98); z-index: 9999999;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
        padding: 1.5rem; box-sizing: border-box;
      `;

      shield.innerHTML = `
        <div style="width: 100%; max-width: 480px; padding: 2.5rem 2rem; border-radius: 20px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.5); box-shadow: 0 0 50px rgba(239, 68, 68, 0.35); background: radial-gradient(circle at top, rgba(239, 68, 68, 0.15) 0%, rgba(8, 12, 24, 0.98) 70%); font-family: 'Space Grotesk', sans-serif;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1.2rem; border: 2px solid rgba(239, 68, 68, 0.4);">
            🛡️
          </div>
          <span style="display:inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.2); color: #f87171; border-radius: 9999px; font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase; margin-bottom: 0.8rem;">Security Shield Active</span>
          <h3 style="font-size: 1.4rem; font-weight: 800; margin: 0 0 0.5rem; color: #ffffff; letter-spacing: 0.5px;">SCREENSHOT / SCAN RESTRICTED</h3>
          <p style="color: #cbd5e1; font-size: 0.88rem; font-family: 'Inter', sans-serif; line-height: 1.6; margin-bottom: 1.8rem;">
            Screenshots, screen recordings, text extraction, and Google Lens scans are strictly restricted to safeguard tournament assessment integrity.
          </p>
          <button id="btn-resume-shield" style="width: 100%; padding: 0.85rem; border-radius: 30px; font-weight: 700; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; border: none; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
            Resume Workstation
          </button>
        </div>
      `;
      document.body.appendChild(shield);

      shield.querySelector('#btn-resume-shield').addEventListener('click', () => {
        shield.remove();
      });
    }

    // Clear clipboard immediately so captured screenshot or image buffer is wiped
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {});
      }
    } catch (e) {}

    showSecurityToast("⚠️ Screenshot / Capture attempt blocked by tournament security engine.");
  }

  // --- 2. Background Focus Guard Overlay (Obscures content during Snipping Tool or Tab Switch) ---
  function ensureFocusGuard() {
    if (!blurOverlay && document.body) {
      blurOverlay = document.createElement('div');
      blurOverlay.id = 'security-defocus-guard';
      blurOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: #030712; z-index: 999990;
        display: none; opacity: 0; transition: opacity 0.15s ease;
        pointer-events: none;
      `;
      document.body.appendChild(blurOverlay);
    }
  }

  // --- 3. Global Event Handlers ---
  const options = { capture: true, passive: false };

  // A. Block Right-Click Context Menu & Mobile Long-Press (Google Lens Trigger)
  window.addEventListener('contextmenu', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    e.stopPropagation();
    showSecurityToast("Right-click context menu and Google Lens scan are restricted.");
    return false;
  }, options);

  document.addEventListener('contextmenu', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, options);

  // B. Block Text Selection outside inputs
  document.addEventListener('selectstart', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    return false;
  }, options);

  document.addEventListener('selectionchange', () => {
    const activeEl = document.activeElement;
    if (!isEditableElement(activeEl)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        sel.removeAllRanges();
      }
    }
  });

  // C. Block Copy & Cut outside editable input elements
  document.addEventListener('copy', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    e.stopPropagation();
    if (e.clipboardData) e.clipboardData.setData('text/plain', '');
    showSecurityToast("Content copying is strictly disabled.");
    return false;
  }, options);

  document.addEventListener('cut', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, options);

  // D. Block Dragging
  document.addEventListener('dragstart', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, options);

  document.addEventListener('drop', (e) => {
    if (isEditableElement(e.target)) return true;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, options);

  // E. Screenshot & Screen Capture Keyboard Shortcuts
  window.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      triggerScreenshotBlockShield("PrintScreen capture detected");
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      triggerScreenshotBlockShield("PrintScreen capture detected");
      return false;
    }

    if (isEditableElement(e.target)) {
      return true;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    const key = e.key ? e.key.toLowerCase() : '';

    // Screenshot shortcuts: Win+Shift+S, Ctrl+Shift+S, Cmd+Shift+3/4/5
    if ((isCtrl && e.shiftKey && (key === 's' || key === '3' || key === '4' || key === '5')) ||
        (e.metaKey && e.shiftKey && (key === 's' || key === '3' || key === '4' || key === '5'))) {
      e.preventDefault();
      e.stopPropagation();
      triggerScreenshotBlockShield("Screenshot shortcut detected");
      return false;
    }

    // Developer Tools & View Source Combos (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
    if (e.key === 'F12' || (isCtrl && (key === 'u' || (e.shiftKey && (key === 'i' || key === 'j' || key === 'c'))))) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast("Developer tools shortcuts are restricted.");
      return false;
    }
  }, options);

  // F. Focus Guard on Visibility Change & Blur
  document.addEventListener('DOMContentLoaded', ensureFocusGuard);
  if (document.body) ensureFocusGuard();

  window.addEventListener('blur', () => {
    if (blurOverlay) {
      blurOverlay.style.display = 'block';
      setTimeout(() => { if (blurOverlay) blurOverlay.style.opacity = '0.92'; }, 10);
    }
  });

  window.addEventListener('focus', () => {
    if (blurOverlay) {
      blurOverlay.style.opacity = '0';
      setTimeout(() => { if (blurOverlay) blurOverlay.style.display = 'none'; }, 150);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && blurOverlay) {
      blurOverlay.style.display = 'block';
      blurOverlay.style.opacity = '0.92';
    } else if (!document.hidden && blurOverlay) {
      blurOverlay.style.opacity = '0';
      setTimeout(() => { if (blurOverlay) blurOverlay.style.display = 'none'; }, 150);
    }
  });
})();


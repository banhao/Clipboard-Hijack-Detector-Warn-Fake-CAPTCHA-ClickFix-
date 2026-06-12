// Stream your custom config.json patterns over to the main world
chrome.storage.local.get("clipboardPatterns", (data) => {
  if (data.clipboardPatterns && data.clipboardPatterns.length > 0) {
    try {
        // Drop patterns into sessionStorage so clipboard-shield.js can read them instantly next page load
        sessionStorage.setItem("__SHIELD_LIVE_PATTERNS__", JSON.stringify(data.clipboardPatterns));
    } catch(e) {}

    // Dispatch event to catch any active dynamic updates happening live
    const upgradeEvent = new CustomEvent("UPGRADE_ENTERPRISE_PATTERNS", {
        detail: data.clipboardPatterns
    });
    window.dispatchEvent(upgradeEvent);
  }
});

// --- Frame & Popup Interception ---
document.addEventListener("DOMContentLoaded", () => {
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach(iframe => auditFrame(iframe));

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'IFRAME') auditFrame(node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

function auditFrame(iframe) {
  try {
    const currentDomain = window.location.hostname;
    const frameUrl = new URL(iframe.src || iframe.dataset.src);
    if (frameUrl.hostname && frameUrl.hostname !== currentDomain) {
      fetchFrameSource(frameUrl.href);
    }
  } catch(e) {}
}

async function fetchFrameSource(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    console.groupCollapsed(`⚠️ [FRAME SOURCE CODE DETECTED] Source for: ${url}`);
    console.log(html);
    console.groupEnd();
  } catch (err) {}
}

// ClickFix Defuser UI Neutralizer
const clickFixDefuser = new MutationObserver((mutations) => {
    const targetText = "Verification Steps";
    const runKeyText = "Press & hold the Windows Key";
    
    if (document.body && (document.body.innerText.includes(targetText) || document.body.innerText.includes(runKeyText))) {
        const fakeCaptchaWrapper = document.getElementById("_U57DFVW5");
        const instructionModal = document.getElementById("_zAJCucaH");
        
        if (fakeCaptchaWrapper) fakeCaptchaWrapper.remove();
        if (instructionModal) instructionModal.remove();

        document.querySelectorAll("ol, div, p").forEach(el => {
            if (el.innerText.includes("Windows Key") && el.innerText.includes("Ctrl + V")) {
                const container = el.closest('div');
                if (container) {
                    container.innerHTML = `<div style="padding:20px; color:red; font-weight:bold; background:#fee; border:2px solid red;">
                        [SHIELD ALERT] A known ClickFix Malware/Fake CAPTCHA injection was blocked on this page.
                    </div>`;
                }
            }
        });
        clickFixDefuser.disconnect();
    }
});
clickFixDefuser.observe(document.documentElement, { childList: true, subtree: true });

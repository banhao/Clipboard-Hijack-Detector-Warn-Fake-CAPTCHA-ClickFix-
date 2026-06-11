// --- Feature 1 & 2: Absorbed Inject.js Core Functionality into Content Context ---
const injectionCode = `
(function() {
    'use strict';
    let SUSPICIOUS_PATTERNS = [];

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SET_PATTERNS") {
        SUSPICIOUS_PATTERNS = event.data.patterns.map(p => new RegExp(p, 'i'));
      }
    });

    function looksMalicious(text) {
        if (!text || typeof text !== 'string' || text.length < 20) return false;
        return SUSPICIOUS_PATTERNS.some(re => re.test(text));
    }

    if (navigator?.clipboard) {
        const originalWrite = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function(text) {
            if (looksMalicious(text)) {
                console.warn('[CLIPBOARD SHIELD] Blocked: \\n', text.substring(0, 300));
                alert('⚠️ Suspicious clipboard write blocked!\\nLooks like a fake CAPTCHA / ClickFix attempt.\\n\\nDo NOT paste anything into Run (Win+R)!');
                return Promise.reject(new DOMException('Blocked by enterprise security policy', 'NotAllowedError'));
            }
            return originalWrite ? originalWrite.apply(this, arguments) : Promise.resolve();
        };
    }

    const origExec = Document.prototype.execCommand;
    Document.prototype.execCommand = function(cmd, ...args) {
        if (cmd?.toLowerCase() === 'copy') {
            const selection = document.getSelection();
            const activeEl = document.activeElement;
            let wouldBeCopied = '';
            if (activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'INPUT') {
                wouldBeCopied = activeEl.value.substring(activeEl.selectionStart || 0, activeEl.selectionEnd || activeEl.value.length);
            } else if (selection?.rangeCount) {
                wouldBeCopied = selection.toString();
            }
            if (looksMalicious(wouldBeCopied)) {
                console.warn('[CLIPBOARD SHIELD] Blocked copy attempt:\\n', wouldBeCopied.substring(0, 300));
                alert('⚠️ Suspicious copy blocked!\\nFake verification / malware attempt detected.\\n\\nNever paste website instructions into Win+R!');
                return false;
            }
        }
        return origExec.apply(this, [cmd, ...args]);
    };

    window.addEventListener('click', function(e) {
        let element = e.target;
        while (element) {
            if (element.id === '_MRBCrI1t' || element.id === '_NWg3RDKU' || element.innerText?.includes("I'm not a robot")) {
                console.error("⛔ [SHIELD BIAS] Blocked malicious click attempt on Fake Verification UI.");
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                return false;
            }
            element = element.parentElement;
        }
    }, true);
})();`;

// Injecting code cleanly without requiring an external asset file
const script = document.createElement('script');
script.textContent = injectionCode;
(document.head || document.documentElement).appendChild(script);
script.remove();

// Pass stored storage patterns down to the injected page context
chrome.storage.local.get("clipboardPatterns", (data) => {
  window.postMessage({ type: "SET_PATTERNS", patterns: data.clipboardPatterns || [] }, "*");
});

// --- Feature 3: Frame & Popup Interception ---
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

// ClickFix Defuser
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
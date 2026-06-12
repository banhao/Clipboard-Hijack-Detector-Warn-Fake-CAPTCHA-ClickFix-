(function() {
    'use strict';

    // 1. Instantly pull patterns synced into sessionStorage by content.js
    let cachedPatterns = [];
    try {
        const sessionData = sessionStorage.getItem("__SHIELD_LIVE_PATTERNS__");
        if (sessionData) {
            cachedPatterns = JSON.parse(sessionData);
        }
    } catch (e) {
        console.error("[CLIPBOARD SHIELD] Error reading session patterns cache:", e);
    }

    // Fallback baseline patterns in case storage isn't fully ready on the very first boot
    if (!cachedPatterns || cachedPatterns.length === 0) {
        cachedPatterns = ["powershell", "mshta", "cmd", "clickfix", "win\\+r", "iex"];
    }

    // Convert the string array fetched from config.json into live RegExp objects
    let SUSPICIOUS_PATTERNS = cachedPatterns.map(p => new RegExp(p, 'i'));

    // 2. Keep a backup listener active to dynamically catch updates pushed mid-session
    window.addEventListener("UPGRADE_ENTERPRISE_PATTERNS", (event) => {
        if (event.detail && Array.isArray(event.detail)) {
            SUSPICIOUS_PATTERNS = event.detail.map(p => new RegExp(p, 'i'));
        }
    });

    function looksMalicious(text) {
        if (!text || typeof text !== 'string' || text.length < 20) return false;
        return SUSPICIOUS_PATTERNS.some(re => re.test(text));
    }

    // Intercept Modern Clipboard API
    if (navigator?.clipboard) {
        const originalWrite = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function(text) {
            if (looksMalicious(text)) {
                console.warn('[CLIPBOARD SHIELD] Blocked malicious MAIN-world write:\n', text.substring(0, 300));
                alert('⚠️ Suspicious clipboard write blocked!\nLooks like a fake CAPTCHA / ClickFix attempt.\n\nDo NOT paste anything into Run (Win+R)!');
                return Promise.reject(new DOMException('Blocked by enterprise anti-hijack script', 'NotAllowedError'));
            }
            return originalWrite ? originalWrite.apply(this, arguments) : Promise.resolve();
        };
    }

    // Intercept Legacy Document ExecCommand API
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
                console.warn('[CLIPBOARD SHIELD] Blocked legacy copy attempt:\n', wouldBeCopied.substring(0, 300));
                alert('⚠️ Suspicious copy blocked!\nFake verification / malware attempt detected.\n\nNever paste website instructions into Win+R!');
                return false;
            }
        }
        return origExec.apply(this, [cmd, ...args]);
    };
})();

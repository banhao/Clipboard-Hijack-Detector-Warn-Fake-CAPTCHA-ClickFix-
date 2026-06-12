// Default baseline patterns if remote configuration fetch fails on first boot
const defaultBlacklist = [];

// 1. Define your permanent enterprise GitHub URL as a hardcoded constant
const MASTER_CONFIG_URL = "https://raw.githubusercontent.com/banhao/Clipboard-Hijack-Detector-Warn-Fake-CAPTCHA-ClickFix-/refs/heads/main/extension/config.json";

// Create the synchronization alarm and trigger initial fetch when installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    blacklist: defaultBlacklist,
    clipboardPatterns: ["powershell", "mshta", "cmd", "clickfix", "win\\+r"] 
  }, () => {
    updateBlockingRules();
  });

  // Check the GitHub file for updates every 60 minutes
  chrome.alarms.create("syncConfig", { periodInMinutes: 5 });
  
  // Run an immediate synchronization sync right now
  fetchAndApplyRemoteConfig();
});

// Periodic alarm listener to check for updates
chrome.alarms.onAlarm.addListener(handleAlarm);

async function handleAlarm(alarm) {
  if (alarm.name === "syncConfig") {
    console.log("Alarm triggered: Syncing remote config from master source...");
    console.log(new Date());
    await fetchAndApplyRemoteConfig();
  }
}

// Dedicated synchronization engine
async function fetchAndApplyRemoteConfig() {
  // Uses the hardcoded master URL directly
  try {
    const response = await fetch(`${MASTER_CONFIG_URL}?nocache=${Date.now()}`, { cache: "no-store" });
    
    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const config = await response.json();
    
    if (config.blacklist && config.clipboardPatterns) {
      await chrome.storage.local.set({
        blacklist: config.blacklist,
        clipboardPatterns: config.clipboardPatterns
      });
      
      console.log(`[CONFIG LOAD SUCCESS] Successfully synchronized configuration profile from GitHub.\n` +
                  `- Loaded Domains: ${config.blacklist.length}\n` +
                  `- Loaded Clipboard RegEx Patterns: ${config.clipboardPatterns.length}`);
      
      updateBlockingRules();
    }
  } catch (err) {
    console.error("[CONFIG LOAD ERROR] Failed to fetch remote config from:", MASTER_CONFIG_URL, "\nDetails:", err);
  }
}

// Net Request Rule Compiler for Domain Blocking
async function updateBlockingRules() {
  const data = await chrome.storage.local.get("blacklist");
  const blacklist = data.blacklist || [];
  
  const rules = blacklist.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: domain, resourceTypes: ["main_frame", "sub_frame"] }
  }));

  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(rule => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: rules
  });
}

// Manual force sync instruction capability (e.g. from options page)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "force_sync") {
    fetchAndApplyRemoteConfig().then(() => sendResponse({ success: true }));
    return true; 
  }
});

// Synchronize immediately on workstation/browser startup or waking up
chrome.runtime.onStartup.addListener(() => {
  fetchAndApplyRemoteConfig();
});

chrome.windows.onCreated.addListener(() => {
  fetchAndApplyRemoteConfig();
});

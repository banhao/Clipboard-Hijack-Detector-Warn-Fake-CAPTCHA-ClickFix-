// Default patterns if remote/local files are empty
const defaultBlacklist = [];

// 1. ONLY create the alarm once when installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    blacklist: defaultBlacklist,
    clipboardPatterns: ["powershell", "mshta", "cmd", "clickfix", "win\\+r"] 
  }, () => {
    updateBlockingRules();
  });

  // Create alarm here so it isn't constantly reset
  chrome.alarms.create("syncConfig", { periodInMinutes: 60 });
});

// 2. Use a named or static listener that persists across service worker restarts
chrome.alarms.onAlarm.addListener(handleAlarm);

async function handleAlarm(alarm) {
  if (alarm.name === "syncConfig") {
    console.log("Alarm triggered: Syncing remote config...");
    await fetchAndApplyRemoteConfig();
  }
}

// Dedicated function to handle fetching, logging, and application
async function fetchAndApplyRemoteConfig() {
  const data = await chrome.storage.local.get(["remoteConfigUrl"]);
  if (!data.remoteConfigUrl) {
    console.warn("[CONFIG] No remote URL configured yet.");
    return;
  }

  try {
    // Added a cache-buster so updates on your network share pull instantly
    const response = await fetch(`${data.remoteConfigUrl}?nocache=${Date.now()}`, { cache: "no-store" });
    
    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const config = await response.json();
    
    if (config.blacklist && config.clipboardPatterns) {
      await chrome.storage.local.set({
        blacklist: config.blacklist,
        clipboardPatterns: config.clipboardPatterns
      });
      
      console.log(`[CONFIG LOAD SUCCESS] Successfully synchronized configuration profile.\n` +
                  `- Loaded Domains: ${config.blacklist.length}\n` +
                  `- Loaded Clipboard RegEx Patterns: ${config.clipboardPatterns.length}`);
      
      updateBlockingRules();
    } else {
      console.warn("[CONFIG LOAD ERROR] JSON structure is missing 'blacklist' or 'clipboardPatterns' keys.", config);
    }
  } catch (err) {
    // This will print out clear network/SSL/CORS issues if they happen
    console.error("[CONFIG LOAD ERROR] Failed to fetch remote config from path:", data.remoteConfigUrl, "\nDetails:", err);
  }
}

// 3. Keep your rule compiler function
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

// Listen for forced manual sync instructions from the options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "force_sync") {
    fetchAndApplyRemoteConfig().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
  }
});

// Sync immediately whenever the worker boots up or a profile wakes up
chrome.runtime.onStartup.addListener(() => {
  fetchAndApplyRemoteConfig();
});

// Trigger a fast configuration check when a window is maximized/opened
chrome.windows.onCreated.addListener(() => {
  fetchAndApplyRemoteConfig();
});

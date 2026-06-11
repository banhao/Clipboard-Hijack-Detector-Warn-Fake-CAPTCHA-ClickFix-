document.getElementById('save').addEventListener('click', () => {
  const remoteUrl = document.getElementById('remoteUrl').value;
  const domainsStr = document.getElementById('blacklistDomains').value;
  
  const blacklist = domainsStr.split(',').map(d => d.trim()).filter(Boolean);

  chrome.storage.local.set({
    remoteConfigUrl: remoteUrl,
    blacklist: blacklist
  }, () => {
    // FIX: Use Manifest V3 messaging instead of getBackgroundPage()
    chrome.runtime.sendMessage({ action: "force_sync" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Messaging error:", chrome.runtime.lastError);
      } else if (response && response.success) {
        alert("Configurations saved and synced successfully.");
      }
    });
  });
});

// Load stored values when the options page opens
chrome.storage.local.get(["remoteConfigUrl", "blacklist"], (data) => {
  if (data.remoteConfigUrl) document.getElementById('remoteUrl').value = data.remoteConfigUrl;
  if (data.blacklist) document.getElementById('blacklistDomains').value = data.blacklist.join(', ');
});

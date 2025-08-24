// Background script for Chrome extension
console.log('Background script loaded');

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

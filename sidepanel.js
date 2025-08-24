document.addEventListener('DOMContentLoaded', function() {
  // Set up storage listener to handle data updates from MutationObserver
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.extractedData) {
      const newData = changes.extractedData.newValue;
      const timestamp = changes.timestamp ? changes.timestamp.newValue : new Date().toISOString();
      const changedValues = changes.changes ? changes.changes.newValue : {};
      
      console.log(`Data updated at ${timestamp}:`, newData);
      console.log('Changed values:', changedValues);
      
      // Here you would update your charts when implemented
      // For now, just log the changes
    }
  });
  
  document.getElementById('actionBtn').addEventListener('click', function() {
    console.log('Extract Data button clicked');
    
    // Try to get data from the current tab's content and set up the observer
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: extractDataFromCurrentPage
      }, function(results) {
        if (results && results[0] && results[0].result) {
          const data = results[0].result;
          
          // Store initial data in chrome.storage for later use with charting
          chrome.storage.local.set({
            extractedData: data,
            timestamp: new Date().toISOString(),
            changes: {}
          }, function() {
            console.log('Data extracted and observer set up successfully');
          });
          
          // Only log to console, no UI display
          console.log('Initial data extraction:', data);
        } else {
          console.error('No data found or error occurred');
        }
      });
    });
  });
});

// Function that will be injected into the current page
function extractDataFromCurrentPage() {
  // Check if data-extractor.js is already injected
  if (!window.extractAllDataFromDiv) {
    console.log('Injecting data-extractor.js script');
    
    // First, inject the data-extractor.js script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('data-extractor.js');
    script.onload = function() {
      console.log('data-extractor.js loaded successfully');
      // The MutationObserver will be set up automatically by data-extractor.js
    };
    document.head.appendChild(script);
    
    // Return a message that the script is being injected
    return { status: 'injecting_script', message: 'Setting up data extraction and MutationObserver' };
  }
  
  // Look for the specific div that contains our data
  const targetDiv = document.querySelector('div[style*="padding: 30px; font-size: 6cqmin"]');
  
  if (!targetDiv) {
    console.error('Target div not found');
    return { error: 'Target div not found' };
  }
  
  if (!targetDiv.children) {
    return { error: 'Target div has no children' };
  }
  
  // Use the extractAllDataFromDiv function from the injected script
  try {
    // If the script is already injected, we can use the global function
    const extractedData = window.extractAllDataFromDiv(targetDiv);
    
    // Check if MutationObserver is already set up
    if (!window.observer) {
      console.log('Setting up MutationObserver');
      // The setupMutationObserver function should be defined in data-extractor.js
      // and made available on the window object
      if (typeof window.setupMutationObserver === 'function') {
        window.observer = window.setupMutationObserver();
      } else {
        console.warn('setupMutationObserver function not found, using data-extractor.js default observer');
      }
    } else {
      console.log('MutationObserver already set up');
    }
    
    return extractedData;
  } catch (error) {
    return { error: 'Error extracting data: ' + error.message };
  }
}

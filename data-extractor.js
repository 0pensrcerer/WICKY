// Paste the function into the console
function extractAllDataFromDiv(parentDiv) {
    const labels = [
        'SmartFlow:', 'MomoFlow:', 'SmartTally:', 'MomoTally:', 'Net Call Flow:', 'Net Put Flow:',
        'Net Call Prem:', 'Net Put Prem:', 'NOFA:', 'Call Wall All:', 'Put Wall All:', 'Zero Gamma Flip All:',
        'Gamma Gravity All:', 'Call Wall 7:', 'Put Wall 7:', 'Zero Gamma Flip 7:', 'Gamma Gravity 7:',
        'Call Wall 0:', 'Put Wall 0:', 'Zero Gamma Flip 0:', 'Gamma Gravity 0:'
    ];
    const data = {};
    Array.from(parentDiv.children).forEach(div => {
        const spans = div.querySelectorAll('span');
        if (spans.length > 0) {
            const label = spans[0].textContent.trim();
            const value = div.textContent.replace(label, '').trim();
            if (labels.includes(label)) {
                data[label.replace(':', '')] = value;
            }
        }
    });
    return data;
}

// Select the parentDiv element with more specific selector
const parentDiv = document.querySelector('div[style*="padding: 30px; font-size: 6cqmin"]');

// Store previous values to detect changes
let previousValues = {};

// Initial extraction
if (parentDiv) {
    const result = extractAllDataFromDiv(parentDiv);
    previousValues = result;
    console.log('Initial data extraction:', result);
} else {
    console.error('Target div not found. Please check if the selector is correct.');
}

// Set up MutationObserver to watch for changes
function setupMutationObserver() {
    if (!parentDiv) return;
    
    const observer = new MutationObserver((mutations) => {
        // Extract data after mutation
        const newData = extractAllDataFromDiv(parentDiv);
        
        // Check if any values have changed
        const changedValues = {};
        let hasChanges = false;
        
        Object.keys(newData).forEach(key => {
            if (newData[key] !== previousValues[key]) {
                changedValues[key] = {
                    from: previousValues[key],
                    to: newData[key]
                };
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            console.log('Values changed:', changedValues);
            console.log('Current data:', newData);
            
            // Update previous values
            previousValues = {...newData};
            
            // You could store this data for charting later
            if (window.chrome && chrome.storage) {
                chrome.storage.local.set({
                    extractedData: newData,
                    timestamp: new Date().toISOString(),
                    changes: changedValues
                });
            }
        }
    });
    
    // Start observing with configuration
    observer.observe(parentDiv, {
        childList: true,      // Watch for changes to child elements
        subtree: true,       // Watch the entire subtree
        characterData: true, // Watch for changes to text content
        attributes: true     // Watch for changes to attributes
    });
    
    console.log('MutationObserver set up to monitor data changes');
    return observer;
}

// Initialize the observer
const observer = setupMutationObserver();

// Make functions available to the window object
window.extractAllDataFromDiv = extractAllDataFromDiv;
window.setupMutationObserver = setupMutationObserver;
window.observer = observer;
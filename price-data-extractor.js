function setupPriceMutationObserver() {
    const targetSpan = document.querySelector('span.higlight-number.shade1');
    
    if (!targetSpan) {
        console.warn('Target span with class "higlight-number shade1" not found');
        return null;
    }

    // Function to extract and process the highlighted number
    function extractHighlightedNumber() {
        const value = parseFloat(targetSpan.textContent);
        return isNaN(value) ? null : value;
    }

    // Callback function for mutation observer
    function handleMutation(mutations) {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const newValue = extractHighlightedNumber();
                if (newValue !== null) {
                    console.log('Price updated:', newValue);
                    
                    // Store price data in chrome.storage for sidepanel access
                    chrome.storage.local.set({
                        priceData: {
                            value: newValue,
                            timestamp: new Date().toISOString()
                        }
                    }).catch(error => {
                        console.error('Error storing price data:', error);
                    });
                }
            }
        });
    }

    // Create and configure the mutation observer
    const observer = new MutationObserver(handleMutation);
    
    // Start observing the target span for changes
    observer.observe(targetSpan, {
        childList: true,
        characterData: true,
        subtree: true
    });

    // Return the observer and initial value
    return {
        observer: observer,
        initialValue: extractHighlightedNumber(),
        disconnect: () => observer.disconnect()
    };
}

// Initialize the mutation observer
const priceObserver = setupPriceMutationObserver();
if (priceObserver) {
    console.log('Price mutation observer initialized with initial value:', priceObserver.initialValue);
}

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

// Select the parentDiv element (replace '#yourDivId' with the actual ID or selector)
const parentDiv = document.querySelector('div[style*="padding: 30px"]');

// Call the function and log the result
const result = extractAllDataFromDiv(parentDiv);
console.log(result);
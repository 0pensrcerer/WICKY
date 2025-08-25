document.addEventListener('DOMContentLoaded', function() {
  // Chart data structure
  window.chartData = {
    selectedMetric: null,
    chartStartTime: null,
    currentMinuteData: {
      timestamp: null,
      value: 0
    },
    minuteData: [],
    chart: null
  };
  
  // Initialize UI
  initializeUI();
  
  // Set up storage listener to handle data updates from MutationObserver
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.extractedData) {
      const newData = changes.extractedData.newValue;
      const timestamp = changes.timestamp ? changes.timestamp.newValue : new Date().toISOString();
      const changedValues = changes.changes ? changes.changes.newValue : {};
      
      console.log(`Data updated at ${timestamp}:`, newData);
      console.log('Changed values:', changedValues);
      
      // Process data for the chart
      if (window.chartData.selectedMetric && Object.keys(changedValues).length > 0) {
        processDataChange(changedValues, newData);
      }
    }
  });

// Function to initialize UI
function initializeUI() {
  const metricSelector = document.getElementById('metric-selector');
  const metrics = [
    'SmartFlow', 'MomoFlow', 'SmartTally', 'MomoTally', 'Net Call Flow', 'Net Put Flow',
    'Net Call Prem', 'Net Put Prem', 'NOFA', 'Call Wall All', 'Put Wall All', 'Zero Gamma Flip All',
    'Gamma Gravity All', 'Call Wall 7', 'Put Wall 7', 'Zero Gamma Flip 7', 'Gamma Gravity 7',
    'Call Wall 0', 'Put Wall 0', 'Zero Gamma Flip 0', 'Gamma Gravity 0'
  ];
  
  // Clear existing options
  metricSelector.innerHTML = '<option value="" disabled selected>Select a metric</option>';
  
  // Add options for each metric
  metrics.forEach(metric => {
    const option = document.createElement('option');
    option.value = metric;
    option.textContent = metric;
    metricSelector.appendChild(option);
  });
  
  // Add event listener for metric selection
  metricSelector.addEventListener('change', function() {
    const selectedMetric = this.value;
    if (selectedMetric) {
      initializeChart(selectedMetric);
    }
  });
}

// Function to get the most recent 5-minute boundary
function getMostRecent5MinuteBoundary(currentTime) {
  const boundary = new Date(currentTime);
  const minutes = boundary.getMinutes();
  
  // Round down to the nearest 5-minute boundary (0, 5, 10, 15, etc.)
  const roundedMinutes = Math.floor(minutes / 5) * 5;
  
  boundary.setMinutes(roundedMinutes);
  boundary.setSeconds(0);
  boundary.setMilliseconds(0);
  
  return boundary;
}

// Function to initialize the chart
function initializeChart(metricName) {
  // Reset chart data
  window.chartData.selectedMetric = metricName;
  
  // Set chart start time to the most recent 5-minute boundary
  const now = new Date();
  window.chartData.chartStartTime = getMostRecent5MinuteBoundary(now);
  window.chartData.minuteData = [];
  window.chartData.currentMinuteData = {
    timestamp: new Date(),
    value: 0
  };
  
  // Initialize the 5-minute window with proper boundary times
  for (let i = 0; i < 5; i++) {
    const minuteTime = new Date(window.chartData.chartStartTime);
    minuteTime.setMinutes(window.chartData.chartStartTime.getMinutes() + i);
    
    window.chartData.minuteData.push({
      x: minuteTime,
      y: 0
    });
  }
  
  // Create or update the chart
  const ctx = document.getElementById('metric-chart').getContext('2d');
  
  if (window.chartData.chart) {
    window.chartData.chart.destroy();
  }
  
  const chartConfig = {
    type: 'bar',
    data: {
      datasets: [{
        label: `${metricName} Changes`,
        data: window.chartData.minuteData,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'minute',
            displayFormats: {
              minute: 'HH:mm'
            }
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          beginAtZero: true,
          min: -20000000,
          max: 20000000,
          title: {
            display: true,
            text: 'Change Sum'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: `${metricName} Changes Over Time`
        }
      }
    }
  };
  
  window.chartData.chart = new Chart(ctx, chartConfig);
  
  // Update UI
  document.getElementById('current-metric').textContent = `Current metric: ${metricName}`;
  updateTimeWindowDisplay();
}

// Function to process data changes
function processDataChange(changes, newData) {
  if (!window.chartData.selectedMetric || !changes[window.chartData.selectedMetric]) {
    return; // No changes for the selected metric
  }
  
  const change = changes[window.chartData.selectedMetric];
  const fromValue = parseFloat(change.from.replace(/,/g, '')) || 0;
  const toValue = parseFloat(change.to.replace(/,/g, '')) || 0;
  const changeValue = toValue - fromValue;
  
  const now = new Date();
  const currentMinute = now.getMinutes();
  
  // Check if we're in a new minute - if so, reset the current minute data
  if (!window.chartData.currentMinuteData.timestamp || 
      window.chartData.currentMinuteData.timestamp.getMinutes() !== currentMinute) {
    window.chartData.currentMinuteData = {
      timestamp: now,
      value: changeValue // Start fresh for this minute
    };
  } else {
    // Same minute, add to the change sum
    window.chartData.currentMinuteData.value += changeValue;
  }
  
  // Update the chart
  updateChart(changeValue);
}

// Function to update the chart
function updateChart(changeValue) {
  if (!window.chartData.chart) return;
  
  const now = new Date();
  const currentMinute = now.getMinutes();
  const chartStartMinute = window.chartData.chartStartTime.getMinutes();
  
  // Check if we need to start a new 5-minute window
  // Handle minute rollover (e.g., from 59 to 0)
  let minuteDiff = currentMinute - chartStartMinute;
  if (minuteDiff < 0) {
    minuteDiff += 60; // Handle hour rollover
  }
  
  if (minuteDiff >= 5) {
    // Reset the chart for a new 5-minute window
    window.chartData.chartStartTime = getMostRecent5MinuteBoundary(now);
    window.chartData.minuteData = [];
    
    // Initialize new window with proper 5-minute boundaries
    for (let i = 0; i < 5; i++) {
      const minuteTime = new Date(window.chartData.chartStartTime);
      minuteTime.setMinutes(window.chartData.chartStartTime.getMinutes() + i);
      
      window.chartData.minuteData.push({
        x: minuteTime,
        y: 0
      });
    }
    
    window.chartData.chart.data.datasets[0].data = window.chartData.minuteData;
  }
  
  // Calculate the correct minute index based on the current time and chart start
  const updatedChartStartMinute = window.chartData.chartStartTime.getMinutes();
  let minuteIndex = currentMinute - updatedChartStartMinute;
  if (minuteIndex < 0) {
    minuteIndex += 60; // Handle hour rollover
  }
  
  // Update the current minute's data point
  if (minuteIndex >= 0 && minuteIndex < 5) {
    window.chartData.minuteData[minuteIndex].y = window.chartData.currentMinuteData.value;
  }
  
  // Check if we need to update the y-axis scale
  updateYAxisScale(window.chartData.chart, window.chartData.currentMinuteData.value);
  
  // Update the chart
  window.chartData.chart.update();
  
  // Update the time window display
  updateTimeWindowDisplay();
}

// Function to update the y-axis scale
function updateYAxisScale(chart, newValue) {
  const currentMax = chart.options.scales.y.max || 20000000;
  const currentMin = chart.options.scales.y.min || -20000000;
  
  if (newValue > currentMax) {
    // Increase max in 20M increments
    chart.options.scales.y.max = Math.ceil(newValue / 20000000) * 20000000;
  } else if (newValue < currentMin) {
    // Decrease min in 20M increments
    chart.options.scales.y.min = Math.floor(newValue / 20000000) * 20000000;
  }
  
  chart.update('none'); // Update without animation for better performance
}

// Function to update the time window display
function updateTimeWindowDisplay() {
  if (!window.chartData.chartStartTime) return;
  
  const startTime = window.chartData.chartStartTime;
  const endTime = new Date(startTime);
  endTime.setMinutes(startTime.getMinutes() + 4);
  endTime.setSeconds(59);
  
  const formatTime = (time) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  document.getElementById('time-window').textContent = 
    `Time window: ${formatTime(startTime)} - ${formatTime(endTime)}`;
}
  
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
  // Define the data extraction function inline
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
  
  // Make the function available globally if not already defined
  if (!window.extractAllDataFromDiv) {
    window.extractAllDataFromDiv = extractAllDataFromDiv;
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
    
    // Set up MutationObserver if not already done
    if (!window.observer) {
      console.log('Setting up MutationObserver');
      
      // Store previous values to detect changes
      if (!window.previousValues) {
        window.previousValues = extractedData;
      }
      
      const observer = new MutationObserver((mutations) => {
        // Extract data after mutation
        const newData = window.extractAllDataFromDiv(targetDiv);
        
        // Check if any values have changed
        const changedValues = {};
        let hasChanges = false;
        
        Object.keys(newData).forEach(key => {
          if (newData[key] !== window.previousValues[key]) {
            changedValues[key] = {
              from: window.previousValues[key],
              to: newData[key]
            };
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          console.log('Values changed:', changedValues);
          console.log('Current data:', newData);
          
          // Update previous values
          window.previousValues = {...newData};
          
          // Store data for charting
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
      observer.observe(targetDiv, {
        childList: true,      // Watch for changes to child elements
        subtree: true,       // Watch the entire subtree
        characterData: true, // Watch for changes to text content
        attributes: true     // Watch for changes to attributes
      });
      
      window.observer = observer;
      console.log('MutationObserver set up to monitor data changes');
    } else {
      console.log('MutationObserver already set up');
    }
    
    return extractedData;
  } catch (error) {
    return { error: 'Error extracting data: ' + error.message };
  }
}

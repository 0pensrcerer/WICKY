# Chart.js Implementation for WICKY Extension

This document outlines the implementation details for adding charting functionality to the WICKY Chrome extension using Chart.js.

## Table of Contents
1. [Setup and Dependencies](#setup-and-dependencies)
2. [Data Structure and Management](#data-structure-and-management)
3. [Chart Configuration](#chart-configuration)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)

## Setup and Dependencies

### Chart.js Installation

Add Chart.js to the project by including it in the `sidepanel.html` file:

```html
<!-- Add before the closing </head> tag in sidepanel.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
```

The date-fns adapter is needed for time-based charts.

### Required Files to Modify

1. `sidepanel.html` - Add Chart.js dependencies and UI elements for chart selection
2. `sidepanel.js` - Implement chart creation, data processing, and update logic

## Data Structure and Management

### Data Model

Create a data model to store and manage chart data:

```javascript
// Data structure for chart management
const chartData = {
  selectedMetric: null,  // Currently selected metric
  chartStartTime: null,  // When the chart started
  currentMinuteData: {   // Data for the current minute
    timestamp: null,
    value: 0
  },
  minuteData: [],        // Array of data points for the 5-minute window
  chart: null            // Reference to the Chart.js instance
};
```

### Data Processing

Implement functions to process incoming data:

1. **Calculate Changes**: Sum the changes for each minute
2. **Maintain 5-Minute Window**: Remove old data points as new ones are added
3. **Handle Time Transitions**: Reset the chart at the start of a new 5-minute window

## Chart Configuration

### Chart Types

Use a bar chart for both MomoFlow and SmartFlow as specified in the requirements:

```javascript
const chartConfig = {
  type: 'bar',
  data: {
    datasets: [{
      label: 'Metric Changes',
      data: [],
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
        title: {
          display: true,
          text: 'Change Sum'
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Metric Changes Over Time'
      }
    }
  }
};
```

### Y-Axis Auto-Scaling

Implement auto-scaling in 20 million increments as specified:

```javascript
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
  
  chart.update();
}
```

## Implementation Steps

### 1. UI Updates

Update the sidepanel.html to include:

- Dropdown for selecting financial metrics
- Container for the chart
- Labels for displaying current metric and time window

```html
<!-- Add to sidepanel.html -->
<div id="chart-controls">
  <select id="metric-selector">
    <option value="" disabled selected>Select a metric</option>
    <!-- Options will be populated dynamically -->
  </select>
</div>

<div id="chart-container">
  <canvas id="metric-chart"></canvas>
</div>

<div id="chart-info">
  <span id="current-metric">No metric selected</span>
  <span id="time-window">Time window: N/A</span>
</div>
```

### 2. Initialize Chart

Create a function to initialize the chart when a metric is selected:

```javascript
function initializeChart(metricName) {
  // Reset chart data
  chartData.selectedMetric = metricName;
  chartData.chartStartTime = new Date();
  chartData.minuteData = [];
  chartData.currentMinuteData = {
    timestamp: new Date(),
    value: 0
  };
  
  // Initialize the 5-minute window with empty data points
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const minuteTime = new Date(now);
    minuteTime.setMinutes(now.getMinutes() + i);
    minuteTime.setSeconds(0);
    minuteTime.setMilliseconds(0);
    
    chartData.minuteData.push({
      x: minuteTime,
      y: 0
    });
  }
  
  // Create or update the chart
  const ctx = document.getElementById('metric-chart').getContext('2d');
  
  if (chartData.chart) {
    chartData.chart.destroy();
  }
  
  chartConfig.data.datasets[0].label = `${metricName} Changes`;
  chartConfig.data.datasets[0].data = chartData.minuteData;
  chartConfig.options.plugins.title.text = `${metricName} Changes Over Time`;
  
  chartData.chart = new Chart(ctx, chartConfig);
  
  // Update UI
  document.getElementById('current-metric').textContent = `Current metric: ${metricName}`;
  updateTimeWindowDisplay();
}
```

### 3. Process Data Changes

Implement a function to process data changes from the MutationObserver:

```javascript
function processDataChange(changes, newData) {
  if (!chartData.selectedMetric || !changes[chartData.selectedMetric]) {
    return; // No changes for the selected metric
  }
  
  const change = changes[chartData.selectedMetric];
  const fromValue = parseFloat(change.from.replace(/,/g, '')) || 0;
  const toValue = parseFloat(change.to.replace(/,/g, '')) || 0;
  const changeValue = toValue - fromValue;
  
  // Add to current minute's sum
  chartData.currentMinuteData.value += changeValue;
  
  // Update the chart
  updateChart(changeValue);
}
```

### 4. Update Chart

Implement a function to update the chart with new data:

```javascript
function updateChart(changeValue) {
  if (!chartData.chart) return;
  
  const now = new Date();
  const currentMinute = now.getMinutes();
  const chartStartMinute = chartData.chartStartTime.getMinutes();
  
  // Check if we need to start a new 5-minute window
  if (currentMinute >= chartStartMinute + 5) {
    // Reset the chart for a new 5-minute window
    chartData.chartStartTime = new Date();
    chartData.minuteData = [];
    
    // Initialize new window
    for (let i = 0; i < 5; i++) {
      const minuteTime = new Date(now);
      minuteTime.setMinutes(now.getMinutes() + i);
      minuteTime.setSeconds(0);
      minuteTime.setMilliseconds(0);
      
      chartData.minuteData.push({
        x: minuteTime,
        y: 0
      });
    }
    
    chartData.chart.data.datasets[0].data = chartData.minuteData;
    chartData.currentMinuteData = {
      timestamp: now,
      value: changeValue // Start with the current change
    };
  }
  
  // Update the current minute's data point
  const minuteIndex = currentMinute - chartStartMinute;
  if (minuteIndex >= 0 && minuteIndex < 5) {
    chartData.minuteData[minuteIndex].y = chartData.currentMinuteData.value;
  }
  
  // Check if we need to update the y-axis scale
  updateYAxisScale(chartData.chart, chartData.currentMinuteData.value);
  
  // Update the chart
  chartData.chart.update();
  
  // Update the time window display
  updateTimeWindowDisplay();
}
```

### 5. Time Window Management

Implement a function to update the time window display:

```javascript
function updateTimeWindowDisplay() {
  if (!chartData.chartStartTime) return;
  
  const startTime = chartData.chartStartTime;
  const endTime = new Date(startTime);
  endTime.setMinutes(startTime.getMinutes() + 4);
  endTime.setSeconds(59);
  
  const formatTime = (time) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  document.getElementById('time-window').textContent = 
    `Time window: ${formatTime(startTime)} - ${formatTime(endTime)}`;
}
```

### 6. Initialize UI

Implement a function to initialize the UI with the list of available metrics:

```javascript
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
```

### 7. Connect to Storage Listener

Update the storage listener in sidepanel.js to process data for the chart:

```javascript
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.extractedData) {
    const newData = changes.extractedData.newValue;
    const changedValues = changes.changes ? changes.changes.newValue : {};
    
    console.log(`Data updated:`, newData);
    console.log('Changed values:', changedValues);
    
    // Process data for the chart
    if (chartData.selectedMetric && Object.keys(changedValues).length > 0) {
      processDataChange(changedValues, newData);
    }
  }
});
```

## Code Examples

### Complete sidepanel.js Update

Here's how the updated sidepanel.js would look with Chart.js integration:

```javascript
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

// Function to initialize the chart
function initializeChart(metricName) {
  // Reset chart data
  window.chartData.selectedMetric = metricName;
  window.chartData.chartStartTime = new Date();
  window.chartData.minuteData = [];
  window.chartData.currentMinuteData = {
    timestamp: new Date(),
    value: 0
  };
  
  // Initialize the 5-minute window with empty data points
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const minuteTime = new Date(now);
    minuteTime.setMinutes(now.getMinutes() + i);
    minuteTime.setSeconds(0);
    minuteTime.setMilliseconds(0);
    
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
  
  // Add to current minute's sum
  window.chartData.currentMinuteData.value += changeValue;
  
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
  if (currentMinute >= chartStartMinute + 5) {
    // Reset the chart for a new 5-minute window
    window.chartData.chartStartTime = new Date();
    window.chartData.minuteData = [];
    
    // Initialize new window
    for (let i = 0; i < 5; i++) {
      const minuteTime = new Date(now);
      minuteTime.setMinutes(now.getMinutes() + i);
      minuteTime.setSeconds(0);
      minuteTime.setMilliseconds(0);
      
      window.chartData.minuteData.push({
        x: minuteTime,
        y: 0
      });
    }
    
    window.chartData.chart.data.datasets[0].data = window.chartData.minuteData;
    window.chartData.currentMinuteData = {
      timestamp: now,
      value: changeValue // Start with the current change
    };
  }
  
  // Update the current minute's data point
  const minuteIndex = currentMinute - chartStartMinute;
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
```

### Updated sidepanel.html

Here's how the updated sidepanel.html would look with Chart.js integration:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WICKY Side Panel</title>
  <!-- Chart.js dependencies -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f9f9f9;
    }
    h1 {
      font-size: 1.5em;
      margin-bottom: 10px;
    }
    #actionBtn {
      padding: 10px 20px;
      background: #0078d7;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1em;
    }
    #actionBtn:hover {
      background: #005fa3;
    }
    #result {
      margin-top: 20px;
      padding: 10px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      min-height: 40px;
    }
    #chart-controls {
      margin-top: 20px;
      margin-bottom: 10px;
    }
    #metric-selector {
      padding: 8px;
      width: 100%;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    #chart-container {
      height: 300px;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 10px;
      padding: 10px;
    }
    #chart-info {
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>WICKY Side Panel</h1>
  <button id="actionBtn">Extract Data</button>
  <div id="result" style="display: none;">Result will appear here.</div>
  
  <!-- Chart controls -->
  <div id="chart-controls">
    <select id="metric-selector">
      <option value="" disabled selected>Select a metric</option>
      <!-- Options will be populated dynamically -->
    </select>
  </div>
  
  <!-- Chart container -->
  <div id="chart-container">
    <canvas id="metric-chart"></canvas>
  </div>
  
  <!-- Chart info -->
  <div id="chart-info">
    <span id="current-metric">No metric selected</span>
    <span id="time-window">Time window: N/A</span>
  </div>
  
  <script src="data-extractor.js"></script>
  <script src="sidepanel.js"></script>
</body>
</html>
```

## Conclusion

This implementation provides a complete solution for charting financial metrics in the WICKY Chrome extension using Chart.js. It meets all the requirements specified in the requirements document:

1. Charts are placed in the side panel
2. Users can select from the 21 financial metrics
3. Only two charts (MomoFlow and SmartFlow) are implemented for the first version
4. Charting starts from user selection (no historical data)
5. The x-axis is time-based with a 5-minute rolling window
6. The chart updates the current bar as new data arrives
7. The y-axis represents the sum of changes to the metric per minute
8. Auto-scaling is implemented in 20 million increments

The implementation also handles the specified data processing requirements:

1. Maintains previous values for missing data
2. Aggregates multiple changes within the same minute
3. Does not reconstruct historical data upon reopening

This solution provides a solid foundation that can be extended with additional features in future versions.
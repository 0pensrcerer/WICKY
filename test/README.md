# 🧪 Chrome Extension Test Environment

## Overview
This directory contains test files for the BigShort Chrome Extension. The test environment simulates the exact data structure that the extension expects to find on the actual BigShort website.

## Files
- `test-bigshort.html` - Main test page that simulates BigShort data structure
- `README.md` - This file with test instructions

## 🎯 Purpose
The test environment allows you to:
- Test data extraction functionality without needing the real BigShort website
- Simulate data changes to test MutationObserver and change detection
- Verify extension functionality in a controlled environment
- Debug issues without external dependencies

## 🚀 How to Use

### 1. Open the Test Page
```bash
# Option 1: Direct file access
# Open test-bigshort.html directly in Chrome using file:// protocol

# Option 2: Local server (if needed)
cd test
python -m http.server 8000
# Then navigate to http://localhost:8000/test-bigshort.html
```

### 2. Load Your Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select your extension directory
5. Ensure the extension is enabled

### 3. Test the Extension
1. Navigate to the test page (`test-bigshort.html`)
2. Open the extension sidepanel on that page
3. Use the test controls to simulate data changes:
   - **Update Random Values**: Changes 2-5 random values slightly
   - **Update Single Value**: Changes one value significantly  
   - **Randomize All Data**: Completely randomizes all values
   - **Start Auto Update**: Automatically updates data every 2 seconds
   - **Stop Auto Update**: Stops automatic updates
   - **Reset to Defaults**: Restores original test values

### 4. Verify Functionality
Check that your extension:
- ✅ Detects the `div[style*="padding: 30px"]` container
- ✅ Extracts all 21 key-value pairs correctly
- ✅ Responds to DOM changes via MutationObserver
- ✅ Stores data changes in IndexedDB
- ✅ Updates the sidepanel display in real-time
- ✅ Triggers alarms when thresholds are met

## 🔍 Test Scenarios

### Basic Functionality
- Load the page and verify initial data extraction
- Check that all 21 metrics are detected and displayed

### Change Detection
- Use "Update Random Values" and verify changes are detected
- Use "Update Single Value" and verify specific changes
- Start auto-update and verify continuous monitoring

### Edge Cases  
- Use "Randomize All Data" to test with extreme values
- Test with very large positive and negative numbers
- Verify the extension handles data format changes gracefully

### Performance Testing
- Run auto-update for extended periods
- Verify memory usage doesn't grow excessively
- Check that database storage is working correctly

## 🐛 Debugging

### Console Logs to Watch For
```javascript
// From data-extractor.js
"Looking for BigShort key-value pairs..."
"Found containers with padding 30px: 1"
"Extracted: SmartFlow = 11,707,981"
"Total key-value pairs extracted: 21"

// From polling-manager.js  
"MutationObserver-based monitoring started"
"Significant data changes detected (mutation-triggered)"

// From sidepanel.js
"Found key-value pairs: {SmartFlow: {value: '11,707,981', ...}, ...}"
```

### Common Issues
- **No data extracted**: Check that the HTML structure matches exactly
- **Changes not detected**: Verify MutationObserver is running
- **Sidepanel not updating**: Check Chrome messaging between content and sidepanel
- **Database errors**: Look for IndexedDB permission or storage issues

## 📊 Data Structure
The test page contains these BigShort metrics:
- SmartFlow, MomoFlow
- SmartTally, MomoTally  
- Net Call Flow, Net Put Flow
- Net Call Prem, Net Put Prem
- NOFA
- Call Wall All, Put Wall All
- Zero Gamma Flip All, Gamma Gravity All
- Call Wall 7, Put Wall 7, Zero Gamma Flip 7, Gamma Gravity 7
- Call Wall 0, Put Wall 0, Zero Gamma Flip 0, Gamma Gravity 0

## 🎨 Visual Feedback
The test page provides visual feedback:
- **Green highlighting**: Shows which values were just updated
- **Status panel**: Displays current test status and statistics
- **Real-time counters**: Shows update frequency and timing

## 🔧 Customization
You can modify the test environment by:
- Adjusting update intervals in the JavaScript
- Adding new test metrics to the data structure
- Changing the styling to match different themes
- Adding new test scenarios or edge cases

## 📝 Notes
- The test page uses the exact HTML structure that your extension expects
- All colors and styling match the BigShort theme for realism
- The `div[style*="padding: 30px"]` selector is specifically targeted
- Test data includes both positive and negative values with proper formatting

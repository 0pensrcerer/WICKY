# Alarm System Implementation Plan

Based on the finalized requirements in the UI requirements document, this plan outlines a simplified but effective approach to implementing the alarm functionality for the WICKY metric monitoring system.

## 1. Architecture Overview

### Core Components
- **SingleAlarmManager**: Manages one alarm at a time per metric
- **Alarm**: Simple alarm object with basic configuration
- **AlarmUI**: Minimal UI for creation and display
- **AlarmChecker**: Real-time alarm evaluation
- **AudioAlarmNotifier**: Handles audio alert playback

### Data Structure
```javascript
class Alarm {
  constructor(metricName, threshold, isAbsolute, direction) {
    this.metricName = metricName;
    this.threshold = parseFloat(threshold); // e.g., 100, -20
    this.isAbsolute = isAbsolute; // true for absolute value checking
    this.direction = direction; // 'above' or 'below'
    this.isActive = true;
    this.isTriggered = false;
    this.hasBeenAcknowledged = false;
    this.createdAt = new Date();
    this.triggerHistory = []; // Array of trigger timestamps
  }
}
```

## 2. Implementation Decisions (Based on Final Requirements)

### Alarm Creation & Configuration
1. **Multiple alarms per metric**: NO - Only one alarm at a time
2. **Default threshold**: No default (empty field)
3. **Threshold validation**: No validation required
4. **Absolute value toggle**: Checkbox
5. **Alarm labeling**: No labeling needed

### Alarm Triggering & Behavior
6. **Trigger response**: Audio tone (high-low alternating for 3 seconds)
7. **Trigger frequency**: Only trigger once per 5-minute boundary
8. **Auto-reset**: Yes, automatically reset at each new 5-minute boundary
9. **Acknowledge function**: "Acknowledge" button to stop audio alarm
10. **Multiple triggers**: N/A (only one alarm at a time)

### Alarm Management
11. **Disable functionality**: No disable option
12. **Edit thresholds**: No editing - delete and recreate only
13. **Delete option**: Single "Delete" button
14. **Status display**: Yes, show current status
15. **Trigger history**: Yes, maintain history log

### UI/UX Design
16. **Button placement**: At the top next to the popout button
17. **Alarm display**: Below the two charts
18. **Chart representation**: No visual representation on charts
19. **Threshold lines**: No threshold lines on charts
20. **Metric switching**: Delete alarm when switching metrics

### Technical Implementation
21. **Checking frequency**: Real-time using existing parsed data
22. **Performance**: Simple single alarm checking
23. **Maximum alarms**: One alarm at a time
24. **Missing data**: Skip evaluation, maintain previous state

## 3. Implementation Phases

### Phase 1: Core Alarm Infrastructure
- Create Alarm and SingleAlarmManager classes
- Implement single alarm storage (in-memory)
- Add simple alarm creation UI modal
- Basic threshold input handling

### Phase 2: Alarm Evaluation Engine
- Integrate with existing data processing pipeline
- Implement threshold checking logic (above/below/absolute)
- Handle 5-minute boundary resets
- Add metric switching alarm deletion

### Phase 3: Audio Alert System
- Implement audio tone generation (high-low alternating)
- Add 3-second timer for audio playback
- Create acknowledge button functionality
- Handle audio permissions

### Phase 4: UI Integration & History
- Add alarm display below charts
- Implement alarm status indicators
- Add trigger history tracking
- Polish and error handling

## 4. File Modifications Required

### New Files
- `single-alarm-manager.js` - Core single alarm functionality
- `audio-alarm.js` - Audio alert generation and playback

### Modified Files
- `sidepanel.html` - Add alarm UI elements (button and display area)
- `sidepanel.js` - Integrate alarm checking with data processing

## 5. UI Components Specification

### Alarm Creation Modal
```html
<div id="alarm-modal" class="modal">
  <div class="modal-content">
    <h3>Create Alarm</h3>
    
    <label>Threshold Value:</label>
    <input type="text" id="alarm-threshold" placeholder="100m or -20m">
    
    <label>Direction:</label>
    <select id="alarm-direction">
      <option value="above">Above threshold</option>
      <option value="below">Below threshold</option>
    </select>
    
    <label>
      <input type="checkbox" id="alarm-absolute"> Use absolute value
    </label>
    
    <div class="modal-actions">
      <button id="create-alarm-btn">Create Alarm</button>
      <button id="cancel-alarm-btn">Cancel</button>
    </div>
  </div>
</div>
```

### Alarm Display Area (Below Charts)
```html
<div id="alarm-display" class="alarm-display">
  <div id="no-alarm" class="no-alarm-message">No alarm set</div>
  <div id="active-alarm" class="active-alarm" style="display: none;">
    <div class="alarm-info">
      <span class="alarm-status">●</span>
      <span class="alarm-details">Alarm: <span id="alarm-threshold-display"></span> (<span id="alarm-direction-display"></span>)</span>
      <button id="acknowledge-alarm" class="acknowledge-btn" style="display: none;">Acknowledge</button>
      <button id="delete-alarm" class="delete-btn">Delete</button>
    </div>
    <div class="alarm-history">
      <details>
        <summary>Trigger History</summary>
        <div id="trigger-history-list"></div>
      </details>
    </div>
  </div>
</div>
```

## 6. Integration Points

### Data Processing Integration
```javascript
// In sidepanel.js processDataChange function
function processDataChange(changedValues, newData) {
  // Existing logic...
  
  // Add single alarm checking
  if (window.singleAlarmManager && window.singleAlarmManager.hasAlarm()) {
    const currentMetric = window.chartData.selectedMetric;
    const currentValue = window.chartData.currentMinuteData.value;
    window.singleAlarmManager.checkAlarm(currentMetric, currentValue);
  }
}
```

### Metric Selection Integration
```javascript
// In sidepanel.js metric selector change event
metricSelector.addEventListener('change', function() {
  const selectedMetric = this.value;
  if (selectedMetric) {
    // Delete existing alarm when switching metrics
    if (window.singleAlarmManager && window.singleAlarmManager.hasAlarm()) {
      window.singleAlarmManager.deleteAlarm();
      updateAlarmDisplay();
    }
    initializeChart(selectedMetric);
  }
});
```

### Audio Alert Integration
```javascript
// Audio context for generating tones
class AudioAlarmNotifier {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.timeoutId = null;
  }
  
  async playAlarmTone() {
    if (this.isPlaying) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isPlaying = true;
      
      // Play alternating high-low tones for 3 seconds
      this.playAlternatingTones();
      
      // Stop after 3 seconds
      this.timeoutId = setTimeout(() => {
        this.stopAlarmTone();
      }, 3000);
    } catch (error) {
      console.warn('Audio alarm failed:', error);
    }
  }
  
  playAlternatingTones() {
    // Implementation for high-low alternating tones
    // High tone (800Hz) for 0.5s, low tone (400Hz) for 0.5s, repeat
  }
  
  stopAlarmTone() {
    this.isPlaying = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
```

## 7. Testing Strategy


### User Acceptance Tests
- Create alarm workflow
- Alarm triggering with audio alert
- Acknowledge button functionality
- Delete and recreate workflow
- Metric switching behavior

## 8. Performance Considerations

- Simple single alarm evaluation (minimal overhead)
- Audio context management (create/destroy as needed)
- Efficient trigger history storage (limit to last 20 triggers)


## 9. Error Handling

- Graceful degradation when audio is blocked/unavailable
- Handle invalid threshold input formats
- Recovery from audio context failures
- Fallback behavior for missing metric data
- Safe alarm deletion on metric switching

## 10. Key Implementation Details

### Threshold Value Parsing
- Support formats: "100m", "-20m", "2b", "500"
- Convert 'm' suffix to millions, 'b' to billions
- Handle negative values correctly
- Default to raw number if no suffix

### Audio Alert Specifications
- High tone: 800Hz for 0.5 seconds
- Low tone: 400Hz for 0.5 seconds
- Total duration: 3 seconds (3 cycles)
- Acknowledge button stops audio immediately
- Auto-stop after 3 seconds if not acknowledged

### 5-Minute Boundary Logic
- Reset alarm trigger state at each new 5-minute boundary
- Track boundary timestamps to prevent multiple triggers
- Maintain trigger history across boundaries
- Clear triggered state when new boundary starts

This simplified implementation plan provides a focused approach to building an effective single-alarm system that meets all the specified requirements while maintaining simplicity and reliability.
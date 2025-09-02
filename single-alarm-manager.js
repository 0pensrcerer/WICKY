// SingleAlarmManager - Manages a single alarm for the currently selected metric
class SingleAlarmManager {
  constructor() {
    this.alarm = null;
    this.triggerHistory = [];
    this.hasTriggeredThisBoundary = false;
    this.currentBoundaryStart = null;
  }

  // Create a new alarm (replaces any existing alarm)
  createAlarm(threshold, isAbsolute = false, metric = null) {
    this.alarm = {
      threshold: this.parseThreshold(threshold),
      isAbsolute: isAbsolute,
      metric: metric || window.chartData?.selectedMetric,
      createdAt: new Date(),
      isActive: true
    };
    
    // Reset trigger state for new alarm
    this.hasTriggeredThisBoundary = false;
    this.updateCurrentBoundary();
    
    console.log('Alarm created:', this.alarm);
    return this.alarm;
  }

  // Delete the current alarm
  deleteAlarm() {
    this.alarm = null;
    this.hasTriggeredThisBoundary = false;
    this.currentBoundaryStart = null;
    console.log('Alarm deleted');
  }

  // Get the current alarm
  getCurrentAlarm() {
    return this.alarm;
  }

  // Check if alarm should trigger based on current data
  checkAlarm(currentValue, currentMetric) {
    if (!this.alarm || !this.alarm.isActive) {
      return false;
    }

    // Check if metric matches
    if (this.alarm.metric !== currentMetric) {
      return false;
    }

    // Update boundary tracking
    this.updateCurrentBoundary();

    // Don't trigger if already triggered this boundary
    if (this.hasTriggeredThisBoundary) {
      return false;
    }

    // Check threshold condition
    const shouldTrigger = this.evaluateThreshold(currentValue);
    
    if (shouldTrigger) {
      this.triggerAlarm(currentValue);
      return true;
    }

    return false;
  }

  // Evaluate if current value meets threshold condition
  evaluateThreshold(currentValue) {
    if (!this.alarm) return false;

    const threshold = this.alarm.threshold;
    const isAbsolute = this.alarm.isAbsolute;

    if (isAbsolute) {
      // For absolute value, trigger if change magnitude exceeds threshold
      return Math.abs(currentValue) >= Math.abs(threshold);
    } else {
      // For regular threshold, check if value crosses the threshold
      if (threshold >= 0) {
        // Positive threshold - trigger when value goes above
        return currentValue >= threshold;
      } else {
        // Negative threshold - trigger when value goes below
        return currentValue <= threshold;
      }
    }
  }

  // Trigger the alarm
  triggerAlarm(currentValue) {
    const triggerEvent = {
      timestamp: new Date(),
      value: currentValue,
      threshold: this.alarm.threshold,
      isAbsolute: this.alarm.isAbsolute,
      metric: this.alarm.metric
    };

    this.triggerHistory.push(triggerEvent);
    this.hasTriggeredThisBoundary = true;

    console.log('Alarm triggered:', triggerEvent);
    
    // Trigger audio alert
    if (window.audioAlarmNotifier) {
      window.audioAlarmNotifier.playAlarm();
    }

    // Update UI to show triggered state
    this.updateAlarmDisplay();
  }

  // Acknowledge the alarm (stops audio)
  acknowledgeAlarm() {
    if (window.audioAlarmNotifier) {
      window.audioAlarmNotifier.stopAlarm();
    }
    console.log('Alarm acknowledged');
  }

  // Update current 5-minute boundary tracking
  updateCurrentBoundary() {
    const now = new Date();
    const currentBoundary = this.getMostRecent5MinuteBoundary(now);
    
    // If we're in a new boundary, reset trigger state
    if (!this.currentBoundaryStart || 
        currentBoundary.getTime() !== this.currentBoundaryStart.getTime()) {
      this.currentBoundaryStart = currentBoundary;
      this.hasTriggeredThisBoundary = false;
    }
  }

  // Get the most recent 5-minute boundary
  getMostRecent5MinuteBoundary(currentTime) {
    const boundary = new Date(currentTime);
    const minutes = boundary.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    
    boundary.setMinutes(roundedMinutes);
    boundary.setSeconds(0);
    boundary.setMilliseconds(0);
    
    return boundary;
  }

  // Parse threshold string (supports formats like "100m", "-20m", "2b")
  parseThreshold(thresholdStr) {
    if (typeof thresholdStr === 'number') {
      return thresholdStr;
    }

    const str = thresholdStr.toString().toLowerCase().trim();
    
    // Extract number and unit
    const match = str.match(/^([+-]?\d*\.?\d+)([kmb]?)$/);
    
    if (!match) {
      // If no match, try to parse as plain number
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }

    const [, numberPart, unit] = match;
    let value = parseFloat(numberPart);

    // Apply unit multiplier
    switch (unit) {
      case 'k':
        value *= 1000;
        break;
      case 'm':
        value *= 1000000;
        break;
      case 'b':
        value *= 1000000000;
        break;
      // No unit means use value as-is
    }

    return value;
  }

  // Get trigger history
  getTriggerHistory() {
    return this.triggerHistory;
  }

  // Clear trigger history
  clearTriggerHistory() {
    this.triggerHistory = [];
  }

  // Update alarm display in UI
  updateAlarmDisplay() {
    const alarmDisplay = document.getElementById('alarm-display');
    if (!alarmDisplay) return;

    if (this.alarm) {
      const thresholdDisplay = this.formatThreshold(this.alarm.threshold);
      const absoluteText = this.alarm.isAbsolute ? ' (Absolute)' : '';
      const statusText = this.hasTriggeredThisBoundary ? 'TRIGGERED' : 'Active';
      const statusClass = this.hasTriggeredThisBoundary ? 'triggered' : 'active';
      
      alarmDisplay.innerHTML = `
        <div class="alarm-info">
          <div class="alarm-status ${statusClass}">${statusText}</div>
          <div class="alarm-details">
            <strong>${this.alarm.metric}</strong><br>
            Threshold: ${thresholdDisplay}${absoluteText}
          </div>
          <button id="acknowledge-btn" class="acknowledge-btn" ${!this.hasTriggeredThisBoundary ? 'style="display:none"' : ''}>Acknowledge</button>
          <button id="delete-alarm-btn" class="delete-btn">Delete Alarm</button>
        </div>
        <div class="trigger-history">
          <h4>Trigger History (${this.triggerHistory.length})</h4>
          <div class="history-list">
            ${this.triggerHistory.slice(-5).reverse().map(trigger => 
              `<div class="history-item">
                ${trigger.timestamp.toLocaleTimeString()}: ${this.formatThreshold(trigger.value)}
              </div>`
            ).join('')}
          </div>
        </div>
      `;

      // Add event listeners
      const acknowledgeBtn = document.getElementById('acknowledge-btn');
      if (acknowledgeBtn) {
        acknowledgeBtn.addEventListener('click', () => this.acknowledgeAlarm());
      }

      const deleteBtn = document.getElementById('delete-alarm-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.deleteAlarm();
          this.updateAlarmDisplay();
        });
      }
    } else {
      alarmDisplay.innerHTML = '<div class="no-alarm">No alarm set</div>';
    }
  }

  // Format threshold value for display
  formatThreshold(value) {
    if (Math.abs(value) >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'b';
    } else if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'm';
    } else if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    } else {
      return value.toString();
    }
  }
}

// Initialize global alarm manager
window.singleAlarmManager = new SingleAlarmManager();
// AudioAlarmNotifier - Handles audio alarm notifications with alternating tones
class AudioAlarmNotifier {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.oscillators = [];
    this.gainNodes = [];
    this.timeoutId = null;
    this.intervalId = null;
    
    // Audio configuration
    this.highFreq = 800; // Hz
    this.lowFreq = 400;  // Hz
    this.toneDuration = 200; // ms per tone
    this.totalDuration = 3000; // ms total alarm duration
    this.volume = 0.3; // Volume level (0.0 to 1.0)
  }

  // Initialize audio context (must be called after user interaction)
  async initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume context if suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        console.log('Audio context initialized');
        return true;
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        return false;
      }
    }
    return true;
  }

  // Play the alarm with alternating high-low tones
  async playAlarm() {
    // Don't play if already playing
    if (this.isPlaying) {
      return;
    }

    // Initialize audio context if needed
    const audioReady = await this.initAudioContext();
    if (!audioReady) {
      console.error('Cannot play alarm: audio context not available');
      return;
    }

    this.isPlaying = true;
    console.log('Starting alarm audio');

    // Start alternating tone pattern
    this.startAlternatingTones();

    // Stop alarm after total duration
    this.timeoutId = setTimeout(() => {
      this.stopAlarm();
    }, this.totalDuration);
  }

  // Start the alternating tone pattern
  startAlternatingTones() {
    let isHighTone = true;
    let startTime = this.audioContext.currentTime;
    
    const playTone = () => {
      if (!this.isPlaying) return;
      
      const frequency = isHighTone ? this.highFreq : this.lowFreq;
      this.playTone(frequency, this.toneDuration / 1000); // Convert to seconds
      
      isHighTone = !isHighTone;
    };

    // Play first tone immediately
    playTone();

    // Set up interval for subsequent tones
    this.intervalId = setInterval(playTone, this.toneDuration);
  }

  // Play a single tone at specified frequency and duration
  playTone(frequency, duration) {
    if (!this.audioContext || !this.isPlaying) return;

    try {
      // Create oscillator for the tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Configure oscillator
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      // Configure gain (volume) with envelope to avoid clicks
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01); // Quick fade in
      gainNode.gain.linearRampToValueAtTime(this.volume, now + duration - 0.01); // Hold
      gainNode.gain.linearRampToValueAtTime(0, now + duration); // Quick fade out

      // Connect audio nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start and stop the tone
      oscillator.start(now);
      oscillator.stop(now + duration);

      // Store references for cleanup
      this.oscillators.push(oscillator);
      this.gainNodes.push(gainNode);

      // Clean up when tone ends
      oscillator.onended = () => {
        this.cleanupOscillator(oscillator, gainNode);
      };

    } catch (error) {
      console.error('Error playing tone:', error);
    }
  }

  // Stop the alarm
  stopAlarm() {
    if (!this.isPlaying) return;

    console.log('Stopping alarm audio');
    this.isPlaying = false;

    // Clear timers
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop all active oscillators
    this.stopAllOscillators();
  }

  // Stop all active oscillators
  stopAllOscillators() {
    const now = this.audioContext ? this.audioContext.currentTime : 0;
    
    this.oscillators.forEach(oscillator => {
      try {
        if (oscillator.playbackState !== oscillator.FINISHED_STATE) {
          oscillator.stop(now);
        }
      } catch (error) {
        // Oscillator might already be stopped
      }
    });

    // Clear arrays
    this.oscillators = [];
    this.gainNodes = [];
  }

  // Clean up individual oscillator
  cleanupOscillator(oscillator, gainNode) {
    const oscIndex = this.oscillators.indexOf(oscillator);
    if (oscIndex > -1) {
      this.oscillators.splice(oscIndex, 1);
    }

    const gainIndex = this.gainNodes.indexOf(gainNode);
    if (gainIndex > -1) {
      this.gainNodes.splice(gainIndex, 1);
    }
  }

  // Check if alarm is currently playing
  isAlarmPlaying() {
    return this.isPlaying;
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Get current volume
  getVolume() {
    return this.volume;
  }

  // Test the alarm (useful for setup/debugging)
  async testAlarm() {
    console.log('Testing alarm audio...');
    await this.playAlarm();
  }

  // Cleanup resources
  destroy() {
    this.stopAlarm();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Initialize global audio alarm notifier
window.audioAlarmNotifier = new AudioAlarmNotifier();

// Initialize audio context on first user interaction
document.addEventListener('click', async () => {
  if (window.audioAlarmNotifier && !window.audioAlarmNotifier.audioContext) {
    await window.audioAlarmNotifier.initAudioContext();
  }
}, { once: true });
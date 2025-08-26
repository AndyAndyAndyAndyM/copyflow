// PomodoroTimer.js - Focus timer with fullscreen mode integration

class PomodoroTimer {
    constructor() {
        // Timer settings (in seconds)
        this.workDuration = 25 * 60; // 25 minutes
        this.shortBreakDuration = 5 * 60; // 5 minutes
        this.longBreakDuration = 15 * 60; // 15 minutes
        this.longBreakInterval = 4; // Every 4 sessions
        
        // Timer state
        this.timeRemaining = this.workDuration;
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work'; // 'work', 'short-break', 'long-break'
        this.completedSessions = 0;
        this.timerInterval = null;
        
        // Focus mode state
        this.isFocusMode = false;
        this.focusContext = null; // Store context when entering focus mode
        
        // Audio context for notifications
        this.audioContext = null;
        this.audioEnabled = true;
        
        this.initializeTimer();
    }

    initializeTimer() {
        // Get DOM elements
        this.timerContainer = document.getElementById('pomodoroTimer');
        this.displayElement = document.getElementById('pomodoroDisplay');
        this.statusElement = document.getElementById('pomodoroStatus');
        this.startButton = document.getElementById('pomodoroStart');
        this.pauseButton = document.getElementById('pomodoroPause');
        this.sessionCountElement = document.getElementById('sessionCount');
        this.dailyCountElement = document.getElementById('dailyCount');
        
        // Get editor elements for focus mode
        this.editorModal = document.getElementById('itemEditor');
        this.editorHeader = document.querySelector('.editor-header');
        
        // Load saved preferences and counts
        this.loadTimerState();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update display
        this.updateDisplay();
        this.updateCounts();
        
        console.log('PomodoroTimer initialized');
    }

    setupEventListeners() {
        // Keyboard shortcuts (only when editor is open)
        document.addEventListener('keydown', (e) => {
            if (this.isEditorOpen()) {
                // Spacebar to start/pause (when not in input fields)
                if (e.code === 'Space' && !this.isInInputField(e.target)) {
                    e.preventDefault();
                    this.toggleTimer();
                }
                
                // Ctrl+R to reset
                if (e.ctrlKey && e.key === 'r') {
                    e.preventDefault();
                    this.resetTimer();
                }
            }
        });

        // Visibility change handling (pause timer if tab becomes inactive)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning && !this.isFocusMode) {
                // Don't auto-pause in focus mode, but show notification
                this.showNotification('Timer continues running in background');
            }
        });

        console.log('PomodoroTimer event listeners setup complete');
    }

    // TIMER CONTROL METHODS

    startTimer() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        
        // Enter focus mode for work sessions
        if (this.currentSession === 'work' && this.isEditorOpen()) {
            this.enterFocusMode();
        }
        
        // Start countdown
        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
        
        // Update UI
        this.updateTimerControls();
        this.updateEditorHeader();
        
        // Play start sound
        this.playSound('start');
        
        // Save state
        this.saveTimerState();
        
        console.log(`Started ${this.currentSession} timer: ${this.formatTime(this.timeRemaining)}`);
    }

    pauseTimer() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isPaused = true;
        
        // Clear interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Exit focus mode when paused
        if (this.isFocusMode) {
            this.exitFocusMode();
        }
        
        // Update UI
        this.updateTimerControls();
        this.updateEditorHeader();
        
        // Save state
        this.saveTimerState();
        
        console.log(`Paused ${this.currentSession} timer: ${this.formatTime(this.timeRemaining)}`);
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    resetTimer() {
        // Stop timer
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Reset to work session
        this.currentSession = 'work';
        this.timeRemaining = this.workDuration;
        
        // Exit focus mode
        if (this.isFocusMode) {
            this.exitFocusMode();
        }
        
        // Update UI
        this.updateDisplay();
        this.updateTimerControls();
        this.updateEditorHeader();
        
        // Save state
        this.saveTimerState();
        
        console.log('Reset timer');
    }

    skipSession() {
        // Stop current timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Complete current session
        this.completeSession();
        
        console.log(`Skipped ${this.currentSession} session`);
    }

    // TIMER LOGIC

    tick() {
        this.timeRemaining--;
        
        // Update display
        this.updateDisplay();
        
        // Check if session is complete
        if (this.timeRemaining <= 0) {
            this.completeSession();
        }
        
        // Play warning sound at 1 minute remaining for work sessions
        if (this.timeRemaining === 60 && this.currentSession === 'work') {
            this.playSound('warning');
        }
    }

    completeSession() {
        // Stop timer
        this.isRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Handle session completion
        if (this.currentSession === 'work') {
            this.completedSessions++;
            this.incrementDailyCount();
            
            // Determine next session type
            if (this.completedSessions % this.longBreakInterval === 0) {
                this.currentSession = 'long-break';
                this.timeRemaining = this.longBreakDuration;
            } else {
                this.currentSession = 'short-break';
                this.timeRemaining = this.shortBreakDuration;
            }
            
            this.showSessionCompleteNotification('Work session complete! Time for a break.');
            
        } else {
            // Break is over, back to work
            this.currentSession = 'work';
            this.timeRemaining = this.workDuration;
            
            this.showSessionCompleteNotification('Break over! Ready for another focus session?');
        }
        
        // Exit focus mode
        if (this.isFocusMode) {
            this.exitFocusMode();
        }
        
        // Update UI
        this.updateDisplay();
        this.updateTimerControls();
        this.updateCounts();
        this.updateEditorHeader();
        
        // Play completion sound
        this.playSound('complete');
        
        // Save state
        this.saveTimerState();
        
        console.log(`Completed ${this.currentSession} session, next: ${this.currentSession}`);
    }

    // FOCUS MODE METHODS

    enterFocusMode() {
        if (this.isFocusMode || !this.isEditorOpen()) return;
        
        // Store current context
        this.focusContext = {
            scrollPosition: window.pageYOffset,
            editorScrollPosition: this.getRichEditorScrollPosition()
        };
        
        // Apply fullscreen styles to editor modal
        this.editorModal.classList.add('true-fullscreen');
        
        // Update focus mode state
        this.isFocusMode = true;
        
        // Hide cursor after delay
        setTimeout(() => {
            if (this.isFocusMode) {
                document.body.style.cursor = 'none';
            }
        }, 3000);
        
        // Show focus mode indicator
        this.showFocusIndicator();
        
        // Save RichTextEditor context
        if (window.richTextEditor) {
            window.richTextEditor.saveContent();
        }
        
        console.log('Entered focus mode');
    }

    exitFocusMode() {
        if (!this.isFocusMode) return;
        
        // Remove fullscreen styles
        this.editorModal.classList.remove('true-fullscreen');
        
        // Restore cursor
        document.body.style.cursor = '';
        
        // Restore context
        if (this.focusContext) {
            // Restore scroll positions after a brief delay
            setTimeout(() => {
                if (this.focusContext.editorScrollPosition) {
                    this.setRichEditorScrollPosition(this.focusContext.editorScrollPosition);
                }
            }, 100);
        }
        
        // Update state
        this.isFocusMode = false;
        this.focusContext = null;
        
        // Hide focus indicator
        this.hideFocusIndicator();
        
        console.log('Exited focus mode');
    }

    // UI UPDATE METHODS

    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.textContent = this.formatTime(this.timeRemaining);
        }
        
        if (this.statusElement) {
            const statusMessages = {
                'work': this.isRunning ? 'Focus time' : 'Ready to focus',
                'short-break': this.isRunning ? 'Break time' : 'Ready for break',
                'long-break': this.isRunning ? 'Long break' : 'Ready for long break'
            };
            
            this.statusElement.textContent = statusMessages[this.currentSession];
        }
    }

    updateTimerControls() {
        if (this.startButton && this.pauseButton) {
            if (this.isRunning) {
                this.startButton.style.display = 'none';
                this.pauseButton.style.display = 'inline-block';
            } else {
                this.startButton.style.display = 'inline-block';
                this.pauseButton.style.display = 'none';
            }
        }
    }

    updateCounts() {
        if (this.sessionCountElement) {
            this.sessionCountElement.textContent = this.completedSessions;
        }
        
        if (this.dailyCountElement) {
            const dailyCount = this.getDailyCount();
            this.dailyCountElement.textContent = dailyCount;
        }
    }

    updateEditorHeader() {
        if (!this.editorHeader) return;
        
        // Remove existing pomodoro classes
        this.editorHeader.classList.remove('pomodoro-active', 'pomodoro-break');
        
        // Add appropriate class based on current session
        if (this.isRunning) {
            if (this.currentSession === 'work') {
                this.editorHeader.classList.add('pomodoro-active');
            } else {
                this.editorHeader.classList.add('pomodoro-break');
            }
        }
    }

    // NOTIFICATION METHODS

    showSessionCompleteNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'pomodoro-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${this.currentSession === 'work' ? 'Focus Session Complete!' : 'Break Time!'}</h4>
                <p>${message}</p>
                <div class="notification-actions">
                    <button onclick="PomodoroTimer.startNext()" class="btn btn-small">Start Next</button>
                    <button onclick="PomodoroTimer.dismissNotification()" class="btn btn-secondary btn-small">Later</button>
                </div>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            min-width: 300px;
            border: 2px solid ${this.currentSession === 'work' ? '#16a34a' : '#3b82f6'};
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 10 seconds if not in focus mode
        if (!this.isFocusMode) {
            setTimeout(() => {
                this.dismissNotification();
            }, 10000);
        }
    }

    showNotification(message) {
        // Simple notification for general messages
        const notification = document.createElement('div');
        notification.className = 'pomodoro-simple-notification';
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #374151;
            color: white;
            padding: 12px 18px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    showFocusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'focusModeIndicator';
        indicator.innerHTML = `
            <div>Focus Mode Active</div>
            <div style="font-size: 12px; opacity: 0.8;">Press ESC to exit</div>
        `;
        
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            z-index: 10001;
            font-size: 12px;
            text-align: center;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(indicator);
        
        // Hide after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.style.opacity = '0';
                indicator.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 500);
            }
        }, 3000);
    }

    hideFocusIndicator() {
        const indicator = document.getElementById('focusModeIndicator');
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    // AUDIO METHODS

    playSound(type) {
        if (!this.audioEnabled) return;
        
        try {
            // Create audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Generate different tones for different events
            const frequencies = {
                'start': [440, 554.37], // A4, C#5
                'complete': [523.25, 659.25, 783.99], // C5, E5, G5
                'warning': [880] // A5
            };
            
            const freq = frequencies[type] || [440];
            this.generateTone(freq, 0.3);
            
        } catch (error) {
            console.log('Audio not available:', error);
            this.audioEnabled = false;
        }
    }

    generateTone(frequencies, duration) {
        if (!this.audioContext) return;
        
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            oscillator.connect(gainNode);
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            oscillator.start(this.audioContext.currentTime + index * 0.1);
            oscillator.stop(this.audioContext.currentTime + duration);
        });
    }

    // UTILITY METHODS

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    isEditorOpen() {
        return this.editorModal && this.editorModal.style.display !== 'none';
    }

    isInInputField(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        return inputTypes.includes(element.tagName.toLowerCase()) || element.contentEditable === 'true';
    }

    getRichEditorScrollPosition() {
        const richEditor = document.getElementById('richEditor');
        return richEditor ? richEditor.scrollTop : 0;
    }

    setRichEditorScrollPosition(position) {
        const richEditor = document.getElementById('richEditor');
        if (richEditor) {
            richEditor.scrollTop = position;
        }
    }

    // STORAGE METHODS

    saveTimerState() {
        const state = {
            timeRemaining: this.timeRemaining,
            currentSession: this.currentSession,
            completedSessions: this.completedSessions,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            lastSaveTime: Date.now()
        };
        
        try {
            localStorage.setItem('copyflow_pomodoro_state', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save timer state:', error);
        }
    }

    loadTimerState() {
        try {
            const saved = localStorage.getItem('copyflow_pomodoro_state');
            if (!saved) return;
            
            const state = JSON.parse(saved);
            const timeSinceLastSave = Date.now() - (state.lastSaveTime || 0);
            
            // If timer was running and less than 30 minutes have passed, restore state
            if (state.isRunning && timeSinceLastSave < 30 * 60 * 1000) {
                const elapsedSeconds = Math.floor(timeSinceLastSave / 1000);
                
                this.timeRemaining = Math.max(0, state.timeRemaining - elapsedSeconds);
                this.currentSession = state.currentSession;
                this.completedSessions = state.completedSessions;
                
                // If time ran out while away, complete the session
                if (this.timeRemaining <= 0) {
                    this.completeSession();
                }
            } else {
                // Restore non-running state
                this.completedSessions = state.completedSessions || 0;
            }
            
        } catch (error) {
            console.error('Failed to load timer state:', error);
        }
    }

    getDailyCount() {
        const today = new Date().toDateString();
        try {
            const saved = localStorage.getItem('copyflow_daily_pomodoros');
            const data = saved ? JSON.parse(saved) : {};
            return data[today] || 0;
        } catch (error) {
            return 0;
        }
    }

    incrementDailyCount() {
        const today = new Date().toDateString();
        try {
            const saved = localStorage.getItem('copyflow_daily_pomodoros');
            const data = saved ? JSON.parse(saved) : {};
            data[today] = (data[today] || 0) + 1;
            
            // Keep only last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            Object.keys(data).forEach(date => {
                if (new Date(date) < thirtyDaysAgo) {
                    delete data[date];
                }
            });
            
            localStorage.setItem('copyflow_daily_pomodoros', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save daily count:', error);
        }
    }

    // STATIC METHODS FOR GLOBAL ACCESS

    static startTimer() {
        if (window.pomodoroTimer) {
            window.pomodoroTimer.startTimer();
        }
    }

    static pauseTimer() {
        if (window.pomodoroTimer) {
            window.pomodoroTimer.pauseTimer();
        }
    }

    static resetTimer() {
        if (window.pomodoroTimer) {
            window.pomodoroTimer.resetTimer();
        }
    }

    static skipSession() {
        if (window.pomodoroTimer) {
            window.pomodoroTimer.skipSession();
        }
    }

    static startNext() {
        if (window.pomodoroTimer) {
            window.pomodoroTimer.startTimer();
        }
        PomodoroTimer.dismissNotification();
    }

    static dismissNotification() {
        const notifications = document.querySelectorAll('.pomodoro-notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Global functions for HTML onclick handlers
function startPomodoro() {
    PomodoroTimer.startTimer();
}

function pausePomodoro() {
    PomodoroTimer.pauseTimer();
}

function resetPomodoro() {
    PomodoroTimer.resetTimer();
}

function skipPomodoro() {
    PomodoroTimer.skipSession();
}

// Initialize timer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the pomodoro timer
    if (!window.pomodoroTimer) {
        window.pomodoroTimer = new PomodoroTimer();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PomodoroTimer;
} else if (typeof window !== 'undefined') {
    window.PomodoroTimer = PomodoroTimer;
}

// PomodoroTimer.js - Simplified Working Version

// Global timer state
window.pomodoroState = {
    timeRemaining: 25 * 60, // 25 minutes in seconds
    isRunning: false,
    currentSession: 'work',
    completedSessions: 0,
    timerInterval: null,
    isFocusMode: false
};

// DOM elements (will be set on init)
let timerElements = {};

// Initialize timer
function initializePomodoroTimer() {
    // Get DOM elements
    timerElements = {
        container: document.getElementById('pomodoroTimer'),
        display: document.getElementById('pomodoroDisplay'),
        status: document.getElementById('pomodoroStatus'),
        startButton: document.getElementById('pomodoroStart'),
        pauseButton: document.getElementById('pomodoroPause'),
        sessionCount: document.getElementById('sessionCount'),
        dailyCount: document.getElementById('dailyCount'),
        editorModal: document.getElementById('itemEditor'),
        editorHeader: document.querySelector('.editor-header')
    };

    // Load saved state
    loadPomodoroState();
    
    // Update display
    updatePomodoroDisplay();
    updatePomodoroControls();
    updatePomodoroCounts();
    
    // Setup keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (isEditorOpen()) {
            if (e.code === 'Space' && !isInInputField(e.target)) {
                e.preventDefault();
                togglePomodoroTimer();
            }
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                resetPomodoroTimer();
            }
        }
    });
    
    console.log('PomodoroTimer initialized successfully');
}

// Timer control functions
function startPomodoroTimer() {
    if (window.pomodoroState.isRunning) return;
    
    window.pomodoroState.isRunning = true;
    
    // Start countdown
    window.pomodoroState.timerInterval = setInterval(function() {
        window.pomodoroState.timeRemaining--;
        updatePomodoroDisplay();
        
        // Check if session complete
        if (window.pomodoroState.timeRemaining <= 0) {
            completePomodoroSession();
        }
    }, 1000);
    
    // Enter focus mode for work sessions
    if (window.pomodoroState.currentSession === 'work' && isEditorOpen()) {
        enterPomodoroFocusMode();
    }
    
    // Update UI
    updatePomodoroControls();
    updateEditorHeader();
    
    // Save state
    savePomodoroState();
    
    console.log('Pomodoro timer started');
}

function pausePomodoroTimer() {
    if (!window.pomodoroState.isRunning) return;
    
    window.pomodoroState.isRunning = false;
    
    // Clear interval
    if (window.pomodoroState.timerInterval) {
        clearInterval(window.pomodoroState.timerInterval);
        window.pomodoroState.timerInterval = null;
    }
    
    // Exit focus mode
    if (window.pomodoroState.isFocusMode) {
        exitPomodoroFocusMode();
    }
    
    // Update UI
    updatePomodoroControls();
    updateEditorHeader();
    
    // Save state
    savePomodoroState();
    
    console.log('Pomodoro timer paused');
}

function resetPomodoroTimer() {
    // Stop timer
    window.pomodoroState.isRunning = false;
    if (window.pomodoroState.timerInterval) {
        clearInterval(window.pomodoroState.timerInterval);
        window.pomodoroState.timerInterval = null;
    }
    
    // Reset to work session
    window.pomodoroState.currentSession = 'work';
    window.pomodoroState.timeRemaining = 25 * 60;
    
    // Exit focus mode
    if (window.pomodoroState.isFocusMode) {
        exitPomodoroFocusMode();
    }
    
    // Update UI
    updatePomodoroDisplay();
    updatePomodoroControls();
    updateEditorHeader();
    
    // Save state
    savePomodoroState();
    
    console.log('Pomodoro timer reset');
}

function skipPomodoroSession() {
    // Stop current timer
    if (window.pomodoroState.timerInterval) {
        clearInterval(window.pomodoroState.timerInterval);
        window.pomodoroState.timerInterval = null;
    }
    
    // Complete session immediately
    completePomodoroSession();
    
    console.log('Pomodoro session skipped');
}

function togglePomodoroTimer() {
    if (window.pomodoroState.isRunning) {
        pausePomodoroTimer();
    } else {
        startPomodoroTimer();
    }
}

// Session management
function completePomodoroSession() {
    // Stop timer
    window.pomodoroState.isRunning = false;
    if (window.pomodoroState.timerInterval) {
        clearInterval(window.pomodoroState.timerInterval);
        window.pomodoroState.timerInterval = null;
    }
    
    if (window.pomodoroState.currentSession === 'work') {
        // Work session completed
        window.pomodoroState.completedSessions++;
        incrementDailyPomodoroCount();
        
        // Switch to break
        if (window.pomodoroState.completedSessions % 4 === 0) {
            // Long break every 4 sessions
            window.pomodoroState.currentSession = 'long-break';
            window.pomodoroState.timeRemaining = 15 * 60;
        } else {
            // Short break
            window.pomodoroState.currentSession = 'short-break';
            window.pomodoroState.timeRemaining = 5 * 60;
        }
        
        showPomodoroNotification('Work session complete! Time for a break.');
    } else {
        // Break completed, back to work
        window.pomodoroState.currentSession = 'work';
        window.pomodoroState.timeRemaining = 25 * 60;
        
        showPomodoroNotification('Break over! Ready for another focus session?');
    }
    
    // Exit focus mode
    if (window.pomodoroState.isFocusMode) {
        exitPomodoroFocusMode();
    }
    
    // Update UI
    updatePomodoroDisplay();
    updatePomodoroControls();
    updatePomodoroCounts();
    updateEditorHeader();
    
    // Save state
    savePomodoroState();
}

// Focus mode
function enterPomodoroFocusMode() {
    if (window.pomodoroState.isFocusMode || !isEditorOpen()) return;
    
    console.log('Attempting to enter focus mode...');
    console.log('Editor modal element:', timerElements.editorModal);
    
    // Apply fullscreen styles
    if (timerElements.editorModal) {
        timerElements.editorModal.classList.add('true-fullscreen');
        console.log('Added true-fullscreen class');
    } else {
        console.error('Editor modal element not found');
    }
    
    window.pomodoroState.isFocusMode = true;
    
    // Show focus indicator
    showFocusIndicator();
    
    console.log('Entered focus mode');
}

function exitPomodoroFocusMode() {
    if (!window.pomodoroState.isFocusMode) return;
    
    console.log('Exiting focus mode...');
    
    // Remove fullscreen styles
    if (timerElements.editorModal) {
        timerElements.editorModal.classList.remove('true-fullscreen');
        console.log('Removed true-fullscreen class');
    }
    
    window.pomodoroState.isFocusMode = false;
    
    console.log('Exited focus mode');
}

// UI Updates
function updatePomodoroDisplay() {
    if (timerElements.display) {
        const minutes = Math.floor(window.pomodoroState.timeRemaining / 60);
        const seconds = window.pomodoroState.timeRemaining % 60;
        timerElements.display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (timerElements.status) {
        const statusMessages = {
            'work': window.pomodoroState.isRunning ? 'Focus time' : 'Ready to focus',
            'short-break': window.pomodoroState.isRunning ? 'Break time' : 'Ready for break',
            'long-break': window.pomodoroState.isRunning ? 'Long break' : 'Ready for long break'
        };
        timerElements.status.textContent = statusMessages[window.pomodoroState.currentSession];
    }
}

function updatePomodoroControls() {
    if (timerElements.startButton && timerElements.pauseButton) {
        if (window.pomodoroState.isRunning) {
            timerElements.startButton.style.display = 'none';
            timerElements.pauseButton.style.display = 'inline-block';
        } else {
            timerElements.startButton.style.display = 'inline-block';
            timerElements.pauseButton.style.display = 'none';
        }
    }
}

function updatePomodoroCounts() {
    if (timerElements.sessionCount) {
        timerElements.sessionCount.textContent = window.pomodoroState.completedSessions;
    }
    
    if (timerElements.dailyCount) {
        timerElements.dailyCount.textContent = getDailyPomodoroCount();
    }
}

function updateEditorHeader() {
    console.log('Updating editor header...');
    console.log('Editor header element:', timerElements.editorHeader);
    console.log('Timer running:', window.pomodoroState.isRunning);
    console.log('Current session:', window.pomodoroState.currentSession);
    
    if (!timerElements.editorHeader) {
        console.error('Editor header element not found');
        return;
    }
    
    // Remove existing classes
    timerElements.editorHeader.classList.remove('pomodoro-active', 'pomodoro-break');
    console.log('Removed existing pomodoro classes');
    
    // Add appropriate class
    if (window.pomodoroState.isRunning) {
        if (window.pomodoroState.currentSession === 'work') {
            timerElements.editorHeader.classList.add('pomodoro-active');
            console.log('Added pomodoro-active class');
        } else {
            timerElements.editorHeader.classList.add('pomodoro-break');
            console.log('Added pomodoro-break class');
        }
    }
    
    console.log('Final header classes:', timerElements.editorHeader.className);
}

// Notifications
function showPomodoroNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'pomodoro-notification';
    notification.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <h4>${window.pomodoroState.currentSession === 'work' ? 'Focus Session Complete!' : 'Break Time!'}</h4>
            <p>${message}</p>
            <button onclick="startPomodoroTimer(); dismissPomodoroNotification();" style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin: 0 5px;">Start Next</button>
            <button onclick="dismissPomodoroNotification();" style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin: 0 5px;">Later</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 10 seconds
    setTimeout(function() {
        dismissPomodoroNotification();
    }, 10000);
}

function dismissPomodoroNotification() {
    const notifications = document.querySelectorAll('.pomodoro-notification');
    notifications.forEach(function(notification) {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

function showFocusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'focusModeIndicator';
    indicator.innerHTML = 'Focus Mode Active - Press ESC to exit';
    
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
    `;
    
    document.body.appendChild(indicator);
    
    // Hide after 3 seconds
    setTimeout(function() {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 3000);
}

// Storage functions
function savePomodoroState() {
    try {
        const state = {
            timeRemaining: window.pomodoroState.timeRemaining,
            currentSession: window.pomodoroState.currentSession,
            completedSessions: window.pomodoroState.completedSessions,
            isRunning: window.pomodoroState.isRunning,
            lastSaveTime: Date.now()
        };
        localStorage.setItem('copyflow_pomodoro_state', JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save pomodoro state:', error);
    }
}

function loadPomodoroState() {
    try {
        const saved = localStorage.getItem('copyflow_pomodoro_state');
        if (!saved) return;
        
        const state = JSON.parse(saved);
        window.pomodoroState.completedSessions = state.completedSessions || 0;
        
        // Don't restore running state to keep things simple
        window.pomodoroState.timeRemaining = 25 * 60;
        window.pomodoroState.currentSession = 'work';
        window.pomodoroState.isRunning = false;
        
    } catch (error) {
        console.error('Failed to load pomodoro state:', error);
    }
}

function getDailyPomodoroCount() {
    const today = new Date().toDateString();
    try {
        const saved = localStorage.getItem('copyflow_daily_pomodoros');
        const data = saved ? JSON.parse(saved) : {};
        return data[today] || 0;
    } catch (error) {
        return 0;
    }
}

function incrementDailyPomodoroCount() {
    const today = new Date().toDateString();
    try {
        const saved = localStorage.getItem('copyflow_daily_pomodoros');
        const data = saved ? JSON.parse(saved) : {};
        data[today] = (data[today] || 0) + 1;
        localStorage.setItem('copyflow_daily_pomodoros', JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save daily count:', error);
    }
}

// Utility functions
function isEditorOpen() {
    return timerElements.editorModal && timerElements.editorModal.style.display !== 'none';
}

function isInInputField(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase()) || element.contentEditable === 'true';
}

// Global functions for HTML onclick handlers
function startPomodoro() {
    startPomodoroTimer();
}

function pausePomodoro() {
    pausePomodoroTimer();
}

function resetPomodoro() {
    resetPomodoroTimer();
}

function skipPomodoro() {
    skipPomodoroSession();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializePomodoroTimer();
});

console.log('PomodoroTimer.js loaded successfully');

console.log("Hello from background.js!");

let numFocusSessions;
let focusDuration;
let shortBreakDuration;
let longBreakDuration;

let remaining = 0;
let currentSession = 0;
let isBreak = false;
let intervalID = null;

// Sets the default durations in local storage on install/reload
async function initialiseDefaults() {
    try {
        await browser.storage.local.set({
                pomodoroDurations: { sessions: 4, focus: 25 * 60, shortBreak: 5 * 60, longBreak: 30 * 60}
            });
    } catch (err) {
        console.error("Failed to initialize defaults:", err);
    }
}

// Loads the stored durations from local
async function loadDurations() {
    try {
        const { pomodoroDurations: durations } = await browser.storage.local.get("pomodoroDurations");
        numFocusSessions = durations.sessions;
        focusDuration = durations.focus;
        shortBreakDuration = durations.shortBreak;
        longBreakDuration = durations.longBreak;
    } catch (err) {
        console.error("Failed to load durations.", err);
    }
}

// Returns the next phase of the session and updates currentSession & isBreak accordingly
function getNextDuration() {
    if (!isBreak) {
        isBreak = true;
        if (currentSession < numFocusSessions - 1) {
            return shortBreakDuration;
        } else {
            return longBreakDuration;
        }
    }
    isBreak = false;
    currentSession = (currentSession + 1) % numFocusSessions;
    return focusDuration;
}

async function resetTimer(duration = focusDuration) {
    try {
        remaining = duration;
        await browser.storage.local.set({ remaining, isRunning: false });
    } catch (err) {
        console.error("Failed to reset timer.", err);
    }
}

async function updateTimer() {
    try {
        remaining--;
        await browser.storage.local.set({ remaining });

        //console.log(remaining);

        if (remaining <= 0) {
            clearInterval(intervalID);
            intervalID = null;
            console.log("Timer fininshed.");
            await browser.storage.local.set({ remaining: 0});
            
            // Calls getNextDuration to apply pomodoro logic
            let nextDuration = getNextDuration();
            await resetTimer(nextDuration);
        }
    } catch (err) {
        console.error("Failed to update timer: ", err);
    }
}

async function playTimer() {
    try {
        clearInterval(intervalID);
        intervalID = setInterval(updateTimer, 1000);
        await browser.storage.local.set({ isRunning: true });
    } catch (error) {
        console.error("Failed to play timer:", error);
    }
}

async function pauseTimer() {
    try {
        clearInterval(intervalID);
        intervalID = null;
        await browser.storage.local.set({ isRunning: false });
    } catch (error) {
        console.error("Failed to pause timer:", error);
    }
}

// Add listener for changes in duration settings and update durations accordingly (using loadDurations)
browser.storage.onChanged.addListener(async (changes, area) => {
    if (area == "local" && changes.pomodoroDurations) {
        try {
            await loadDurations();
        } catch (err) {
            console.error("Failed to reload durations after settings change.", err);
        }
    }
});


// Listener for play/pause button in popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "play" && remaining !== 0) {
        await playTimer();
    } else if (message.action === "pause") {
        await pauseTimer();
    }
});

// On browser startup starts a new session (durations loaded from storage)
browser.runtime.onStartup.addListener(async () => {
    try {
        await loadDurations();
        await resetTimer();
    } catch (err) {
        console.error("Failed to start new session and load durations on browser startup.", err);
    }
});

// On extension reload/install set stored durations to defaults and start a new session
browser.runtime.onInstalled.addListener(async () => {
    try {
        await initialiseDefaults();
        await loadDurations();
        await resetTimer();
    } catch (err) {
        console.error("Failed to initailise defaults and start new session on reload/install.", err);
    }
    
});
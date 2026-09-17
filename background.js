console.log("Hello from background.js!");

let numFocusSessions;
let focusDuration;
let shortBreakDuration;
let longBreakDuration;

let remaining = 0;
let currentSession = 0;
let isBreak = false;
let intervalID = null;
let isTransitioning = false;

// Sets the default durations in local storage on install/reload
async function initialiseDefaultSettings() {
    try {
        await browser.storage.local.set({
                pomodoroDurations: { sessions: 4, focus: 25 * 60, shortBreak: 5 * 60, longBreak: 30 * 60}
            });
    } catch (err) {
        console.error("Failed to initialize defaults:", err);
    }
}

// Loads the stored durations from local
async function loadDurationSettings() {
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

// Loads the current round state from storage
async function loadCurrentState() {
    try {
        const { currentState: state } = await browser.storage.local.get("currentState");
        currentSession = state?.currentSession ?? 0;
        isBreak = state?.isBreak ?? false;
    } catch (err) {
        console.error("Failed to load current state.", err);

    }
}

// Returns the next session of the round and updates currentSession & isBreak accordingly
function getNextDuration() {
    if (!isBreak) {
        if (currentSession < numFocusSessions - 1) {
            return shortBreakDuration;
        } else {
            return longBreakDuration;
        }
    }
    return focusDuration;
}

// Advances to the next session of the round, unless a transition is already in progress
async function advanceToNextSession() {
    if (isTransitioning) { return; }
    isTransitioning = true;
    try {
        const nextDuration = getNextDuration();
        if (isBreak) {
            currentSession = (currentSession + 1) % numFocusSessions;
            isBreak = false;
        } else {
            isBreak = true;
        }
        await browser.storage.local.set({ currentState: { currentSession, isBreak } });
        await resetTimer(nextDuration);
    } catch (err) {
        console.error("Error in advancing to next session.", err);
    } finally {
        isTransitioning = false;
    }
}

// Returns the duration of the current session
function getCurrentDuration() {
    if (isBreak) {
        if (currentSession < numFocusSessions - 1) {
            return shortBreakDuration;
        }
        return longBreakDuration;
    }
    return focusDuration;
}

async function resetTimer(duration = focusDuration) {
    try {
        clearInterval(intervalID); // stops any active countdown
        intervalID = null;
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
            
            // pomodoro logic is buried in here
            await advanceToNextSession();
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

// Add listener for changes in duration settings and update durations accordingly (using loadDurationSettings)
browser.storage.onChanged.addListener(async (changes, area) => {
    if (area == "local" && changes.pomodoroDurations) {
        try {
            await loadDurationSettings();
        } catch (err) {
            console.error("Failed to reload durations after settings change.", err);
        }
    }
});


// Listener for buttons in popup.js
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "play" && remaining !== 0) {
        await playTimer();
    } else if (message.action === "pause") {
        await pauseTimer();
    } else if (message.action === "resetSession") {
        let currentDuration = getCurrentDuration();
        await resetTimer(currentDuration);
    } else if (message.action === "resetRound") {
        currentSession = 0;
        isBreak = false;
        await browser.storage.local.set({ currentState: { currentSession: 0, isBreak: false } });
        await resetTimer(focusDuration);
    } else if (message.action === "skip") {
        await advanceToNextSession();
        console.log("Session skipped.");
    }
});

// On browser startup starts a new session (durations loaded from storage)
browser.runtime.onStartup.addListener(async () => {
    try {
        await loadDurationSettings();
        await loadCurrentState();
        await resetTimer(getNextDuration());
    } catch (err) {
        console.error("Failed to start new session and load durations on browser startup.", err);
    }
});

// On extension reload/install set stored durations to defaults and start a new session
browser.runtime.onInstalled.addListener(async () => {
    try {
        await initialiseDefaultSettings();
        await loadDurationSettings();
        await browser.storage.local.set({ currentState: { currentSession: 0, isBreak: false } });
        await resetTimer();
    } catch (err) {
        console.error("Failed to initailise defaults and start new session on reload/install.", err);
    }
    
});
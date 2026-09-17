console.log("Hello from popup.js");

const timeDisplay = document.getElementById("time-display");
const playPauseBtn = document.getElementById("play-pause-btn");
const resetSessionBtn = document.getElementById("reset-session-btn");
const resetRoundBtn = document.getElementById("reset-round-btn");
const skipBtn = document.getElementById("skip-btn");
const currentSessionDisplay = document.getElementById("current-session-display");
const totalSessionDisplay = document.getElementById("total-session-display");
const breakLabel = document.getElementById("break-label");

let isRunning = false;
let totalSessions = 0;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

async function init() {
    try {
        const { remaining, isRunning: running, pomodoroDurations } = await browser.storage.local.get(["remaining", "isRunning", "pomodoroDurations"]);
        timeDisplay.textContent = formatTime(remaining ?? 60);
        isRunning = running ?? false;
        playPauseBtn.textContent = isRunning ? "⏸" : "▶";
        totalSessions = pomodoroDurations?.sessions ?? 4;
    } catch (err) {
        console.error("Initialisation of popup.js failed.", err);
    }
}

playPauseBtn.addEventListener("click", async () => {
    // Sends message to background.js to play/pause the timer
    await browser.runtime.sendMessage({
        action: isRunning ? "pause" : "play"
    });
});

resetSessionBtn.addEventListener("click", async () => {
    // Sends message to background.js to reset the current session
    await browser.runtime.sendMessage({ action: "resetSession" });
});

resetRoundBtn.addEventListener("click", async () => {
    // Sends message to background.js to reset the current round
    await browser.runtime.sendMessage({ action: "resetRound" });
});

skipBtn.addEventListener("click", async () => {
    // Sends message to background.js to skip the current session
    await browser.runtime.sendMessage({ action: "skip" });
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        if (changes.remaining) {
            timeDisplay.textContent = formatTime(changes.remaining.newValue);
        }

        if (changes.isRunning) {
            isRunning = changes.isRunning.newValue;
            playPauseBtn.textContent = isRunning ? "⏸" : "▶";
        }

        if (changes.currentState) {
            const newState = changes.currentState.newValue;
            if (newState.isBreak === true) {
                if (newState.currentSession === totalSessions - 1) {
                    breakLabel.textContent = "Long Break";
                } else {
                    breakLabel.textContent = "Short Break";
                }
            } else {
                breakLabel.textContent = "Focus";
            }

            currentSessionDisplay.textContent = newState.currentSession + 1;
        }

        if (changes.pomodoroDurations) {
            newDurations = changes.pomodoroDurations.newValue;
            totalSessions = newDurations.sessions;
            totalSessionDisplay.textContent = "/" + totalSessions;
        }
    }
});

init();
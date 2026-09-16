console.log("Hello from popup.js");

const timeDisplay = document.getElementById("time-display");
const playPauseBtn = document.getElementById("play-pause-btn");
const resetSessionBtn = document.getElementById("reset-session-btn");

let isRunning = false;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

async function init() {
    try {
        const { remaining, isRunning: running } = await browser.storage.local.get(["remaining", "isRunning"]);
        timeDisplay.textContent = formatTime(remaining ?? 60);
        isRunning = running ?? false;
        playPauseBtn.textContent = isRunning ? "⏸" : "▶";
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

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        if (changes.remaining) {
            timeDisplay.textContent = formatTime(changes.remaining.newValue);
        }

        if (changes.isRunning) {
            isRunning = changes.isRunning.newValue;
            playPauseBtn.textContent = isRunning ? "⏸" : "▶";
        }
    }
});

init();
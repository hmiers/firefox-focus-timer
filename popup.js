console.log("Hello from popup.js");

const timeDisplay = document.getElementById("time-display");
const playPauseBtn = document.getElementById("play-pause-btn");

let isRunning = false;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

playPauseBtn.addEventListener("click", async () => {
    isRunning = !isRunning;
    playPauseBtn.textContent = isRunning ? "⏸" : "▶";

    // Sends message to background.js to play/pause the timer
    await browser.runtime.sendMessage({
        action: isRunning ? "play" : "pause"
    });
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area == "local" && changes.remaining) {
        timeDisplay.textContent = formatTime(changes.remaining.newValue);
    }
});

browser.storage.local.get("remaining").then(({ remaining}) => {
    timeDisplay.textContent = formatTime(remaining ?? 60);
});
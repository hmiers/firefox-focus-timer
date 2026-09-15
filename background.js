console.log("Hello from background.js!");

const DEFAULT_DURATION = 60;

let remaining = DEFAULT_DURATION;
let intervalID = null;

async function resetTimer(duration = DEFAULT_DURATION) {
    try {
        remaining = duration;
        await browser.storage.local.set({ remaining });
    } catch (err) {
        console.error("Failed to reset timer.", err);
    }
}

async function updateTimer() {
    try {
        remaining--;
        await browser.storage.local.set({ remaining });

        console.log(remaining);

        if (remaining <= 0) {
            clearInterval(intervalID);
            intervalID = null;
            console.log("Timer fininshed.");
            await browser.storage.local.set({ remaining: 0});
            // Could add reset functionality here or a reset button
        }
    } catch (err) {
        console.error("Failed to update timer: ", err);
    }
}

function pauseTimer() {
    clearInterval(intervalID);
    intervalID = null;
}

function playTimer() {
    clearInterval(intervalID); // Clear possible preexisting timer
    intervalID = setInterval(updateTimer, 1000);
}

// Listener for play/pause button in popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "play" && remaining != 0) {
        playTimer();
    } else if (message.action === "pause") {
        pauseTimer();
    }
});

// On browser startup sets the default timer
browser.runtime.onStartup.addListener(() => {
  resetTimer();
});

// On extension reload/install sets the default timer
browser.runtime.onInstalled.addListener(() => {
  resetTimer();
});
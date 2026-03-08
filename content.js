// Content script: runs on YouTube pages, responds to messages from popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getMuteStatus") {
    const video = document.querySelector("video");

    if (!video) {
      sendResponse({ status: "no_video", muted: null, volume: null });
      return true;
    }

    // YouTube can mute via the video element OR via its internal player state
    // Check both the HTML5 muted attribute and volume level
    const htmlMuted = video.muted;
    const volumeZero = video.volume === 0;
    const isMuted = htmlMuted || volumeZero;

    // Also try to read YouTube's internal player button state
    const muteButton = document.querySelector(".ytp-mute-button");
    let playerMuted = null;
    if (muteButton) {
      const title = muteButton.getAttribute("title") || "";
      // If title says "Unmute", the video IS currently muted
      playerMuted = title.toLowerCase().includes("unmute");
    }

    sendResponse({
      status: "ok",
      muted: playerMuted !== null ? playerMuted : isMuted,
      htmlMuted,
      volumeZero,
      playerMuted,
      volume: Math.round(video.volume * 100),
      videoTitle: document.title.replace(" - YouTube", ""),
    });

    return true;
  }
});

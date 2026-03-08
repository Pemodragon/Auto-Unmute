// Auto-unmute YouTube videos when they load

function unmuteVideo(video) {
  if (video.muted) video.muted = false;
  if (video.volume === 0) video.volume = 1;
}

// Handle video elements already on the page
document.querySelectorAll("video").forEach(unmuteVideo);

// Watch for new video elements being added (YouTube is a SPA)
const observer = new MutationObserver(() => {
  document.querySelectorAll("video").forEach(unmuteVideo);
});

observer.observe(document.body, { childList: true, subtree: true });

// Only run on actual video pages, not homepage/feed
if (!window.location.pathname.startsWith("/watch")) return;

// Auto-unmute YouTube videos when they load

function unmuteVideo(video) {
  if (video.muted) video.muted = false;
  if (video.volume === 0) video.volume = 1;
}

function attachToVideo(video) {
  unmuteVideo(video);
  // YouTube sets mute AFTER the video element is created, so watch for it
  video.addEventListener("volumechange", () => unmuteVideo(video));
}

// Handle video elements already on the page
document.querySelectorAll("video").forEach(attachToVideo);

// Watch for new video elements being added (YouTube is a SPA)
const seen = new WeakSet();
const observer = new MutationObserver(() => {
  document.querySelectorAll("video").forEach(video => {
    if (!seen.has(video)) {
      seen.add(video);
      attachToVideo(video);
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

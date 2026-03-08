const content = document.getElementById("content");

function renderNotYouTube() {
  content.innerHTML = `
    <div class="not-yt">
      <div class="icon">📺</div>
      <h2>NOT ON YOUTUBE</h2>
      <p>Navigate to a YouTube video<br>and click this extension again.</p>
    </div>
  `;
}

function renderNoVideo() {
  content.innerHTML = `
    <div class="main">
      <div class="status-card no-video">
        <span class="status-icon">🎬</span>
        <div class="status-label">NO VIDEO</div>
        <div class="status-sub">NO VIDEO DETECTED ON PAGE</div>
      </div>
    </div>
  `;
}

function renderError(msg) {
  content.innerHTML = `
    <div class="main">
      <div class="status-card no-video">
        <span class="status-icon">⚠️</span>
        <div class="status-label">ERROR</div>
        <div class="status-sub">${msg}</div>
      </div>
    </div>
  `;
}

function renderResult(data, justUnmuted = false) {
  // Trust htmlMuted as the reliable source of truth
  const isMuted = data.htmlMuted;
  const cardClass = isMuted ? "muted" : "unmuted";
  const icon = isMuted ? "🔇" : "🔊";
  const label = isMuted ? "MUTED" : "UNMUTED";
  const sub = justUnmuted
    ? "AUTO-UNMUTED SUCCESSFULLY"
    : isMuted ? "AUDIO IS CURRENTLY MUTED" : "AUDIO IS PLAYING NORMALLY";

  const volFillColor = data.volumeZero ? "var(--red)" : "var(--green)";
  const volPct = data.volume;

  const boolVal = (v) => {
    if (v === null || v === undefined) return `<span class="detail-val" style="color:var(--muted-text)">N/A</span>`;
    return `<span class="detail-val ${v}">${v ? "YES" : "NO"}</span>`;
  };

  const unmuteBtnHtml = isMuted ? `
    <button class="unmute-btn" id="unmute-btn">🔊 &nbsp;UNMUTE VIDEO</button>
  ` : '';

  content.innerHTML = `
    <div class="main">
      <div class="status-card ${cardClass}">
        <span class="status-icon">${icon}</span>
        <div class="status-label">${label}</div>
        <div class="status-sub">${sub}</div>
      </div>

      <div class="details">
        <div class="detail-row">
          <span class="detail-key">HTML muted attr</span>
          ${boolVal(data.htmlMuted)}
        </div>
        <div class="detail-row">
          <span class="detail-key">Player btn muted</span>
          ${boolVal(data.playerMuted)}
        </div>
        <div class="detail-row">
          <span class="detail-key">Volume level</span>
          <div class="volume-bar-wrap">
            <div class="volume-bar">
              <div class="volume-fill" style="width:${volPct}%; background:${volFillColor};"></div>
            </div>
            <span class="detail-val" style="color:${volFillColor}">${volPct}%</span>
          </div>
        </div>
      </div>

      ${data.videoTitle ? `<div class="video-title">▶ ${data.videoTitle}</div>` : ""}

      ${unmuteBtnHtml}
      <button class="refresh-btn" id="refresh-btn">↻ &nbsp;REFRESH CHECK</button>
    </div>
  `;

  document.getElementById("refresh-btn").addEventListener("click", check);
  document.getElementById("unmute-btn")?.addEventListener("click", unmute);
}

async function getTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function runOnTab(tab, func) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func,
  });
  return results?.[0]?.result;
}

async function check() {
  content.innerHTML = `<div class="loading">CHECKING...</div>`;

  let tab;
  try { tab = await getTab(); } catch (e) { renderError("Could not access tabs."); return; }

  if (!tab || !tab.url || !tab.url.includes("youtube.com")) {
    renderNotYouTube();
    return;
  }

  try {
    const data = await runOnTab(tab, () => {
      const video = document.querySelector("video");
      if (!video) return { status: "no_video" };

      const htmlMuted = video.muted;
      const volumeZero = video.volume === 0;

      const muteButton = document.querySelector(".ytp-mute-button");
      let playerMuted = null;
      if (muteButton) {
        const title = muteButton.getAttribute("title") || "";
        playerMuted = title.toLowerCase().includes("unmute");
      }

      return {
        status: "ok",
        htmlMuted,
        volumeZero,
        playerMuted,
        volume: Math.round(video.volume * 100),
        videoTitle: document.title.replace(" - YouTube", ""),
      };
    });

    if (!data) { renderError("Could not read page state."); return; }
    if (data.status === "no_video") { renderNoVideo(); return; }

    // Auto-unmute if the HTML5 muted attribute says it's muted
    if (data.htmlMuted) {
      await performUnmute(tab, data, true);
    } else {
      renderResult(data);
    }

  } catch (e) {
    renderError("Extension needs page reload.");
  }
}

async function unmute() {
  let tab;
  try { tab = await getTab(); } catch (e) { renderError("Could not access tabs."); return; }
  const data = await runOnTab(tab, () => {
    const video = document.querySelector("video");
    if (!video) return { status: "no_video" };
    return { status: "ok", htmlMuted: video.muted, volume: Math.round(video.volume * 100) };
  });
  await performUnmute(tab, data, false);
}

async function performUnmute(tab, existingData, isAuto) {
  const result = await runOnTab(tab, () => {
    const video = document.querySelector("video");
    if (!video) return { status: "no_video" };

    // Force unmute via HTML5 API — reliable even when YouTube's UI is bugged
    video.muted = false;
    if (video.volume === 0) video.volume = 1;

    const htmlMuted = video.muted;
    const volumeZero = video.volume === 0;

    const muteButton = document.querySelector(".ytp-mute-button");
    let playerMuted = null;
    if (muteButton) {
      const title = muteButton.getAttribute("title") || "";
      playerMuted = title.toLowerCase().includes("unmute");
    }

    return {
      status: "ok",
      htmlMuted,
      volumeZero,
      playerMuted,
      volume: Math.round(video.volume * 100),
      videoTitle: document.title.replace(" - YouTube", ""),
    };
  });

  if (!result || result.status === "no_video") { renderNoVideo(); return; }
  renderResult(result, !result.htmlMuted); // show "auto-unmuted" message if it worked
}

check();

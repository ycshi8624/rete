const heroLogo = document.getElementById("hero-logo");
const aboutNav = document.getElementById("about-nav");
const scrollMedia = document.getElementById("scroll-media");
const videoPrimary = document.getElementById("video-primary");
const videoScroll = document.getElementById("video-scroll");

const SCROLL_THRESHOLD = 48;
const SCROLL_HOLD_MS = 2000;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let wantsScrollVideo = false;
let scrollHoldTimer = null;
let scrollHoldStartedAt = 0;

window.requestAnimationFrame(() => {
  heroLogo?.classList.add("is-visible");
});

function prepareVideo(video) {
  if (!video) return;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
}

function playVideo(video, shouldPlay) {
  if (!video || reduceMotion) return;

  prepareVideo(video);

  const attempt = () => {
    if (!shouldPlay()) return;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        if (shouldPlay()) {
          video.addEventListener("canplay", attempt, { once: true });
        }
      });
    }
  };

  if (video.readyState >= 2) {
    attempt();
  } else {
    video.addEventListener("loadeddata", attempt, { once: true });
    video.addEventListener("canplay", attempt, { once: true });
  }
}

function attachDissolveLoop(video, isActive) {
  if (!video) return;

  video.addEventListener("ended", () => {
    if (!isActive() || video.dataset.looping === "true") return;

    video.dataset.looping = "true";
    video.classList.add("is-dissolving");

    let finished = false;
    const finishFadeOut = () => {
      if (finished) return;
      finished = true;
      video.removeEventListener("transitionend", onFadedOut);
      clearTimeout(fallback);
      video.currentTime = 0;

      const playPromise = video.play();
      const fadeIn = () => {
        requestAnimationFrame(() => {
          video.classList.remove("is-dissolving");
          video.dataset.looping = "false";
        });
      };

      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(fadeIn).catch(fadeIn);
      } else {
        fadeIn();
      }
    };

    const onFadedOut = (event) => {
      if (event.target !== video || event.propertyName !== "opacity") return;
      finishFadeOut();
    };

    video.addEventListener("transitionend", onFadedOut);
    const fallback = setTimeout(finishFadeOut, 1200);
  });
}

function clearScrollHold() {
  if (scrollHoldTimer !== null) {
    clearTimeout(scrollHoldTimer);
    scrollHoldTimer = null;
  }
  scrollHoldStartedAt = 0;
}

function setScrollVideoActive(active) {
  if (wantsScrollVideo === active) return;

  wantsScrollVideo = active;
  aboutNav?.classList.toggle("is-visible", active);
  scrollMedia?.classList.toggle("is-active", active);

  if (reduceMotion) return;

  if (active) {
    playVideo(videoScroll, () => wantsScrollVideo);
    videoPrimary?.pause();
  } else {
    videoScroll?.pause();
    playVideo(videoPrimary, () => !wantsScrollVideo);
  }
}

function onScroll() {
  const isScrolling = window.scrollY > SCROLL_THRESHOLD;

  if (!isScrolling) {
    clearScrollHold();
    setScrollVideoActive(false);
    return;
  }

  // Already unlocked after holding scroll for 2s
  if (wantsScrollVideo) return;

  if (scrollHoldTimer !== null) return;

  scrollHoldStartedAt = performance.now();
  scrollHoldTimer = setTimeout(() => {
    scrollHoldTimer = null;
    if (window.scrollY > SCROLL_THRESHOLD) {
      setScrollVideoActive(true);
    }
  }, SCROLL_HOLD_MS);
}

window.addEventListener("scroll", onScroll, { passive: true });

prepareVideo(videoPrimary);
prepareVideo(videoScroll);
attachDissolveLoop(videoPrimary, () => !wantsScrollVideo);
attachDissolveLoop(videoScroll, () => wantsScrollVideo);

if (!reduceMotion) {
  playVideo(videoPrimary, () => !wantsScrollVideo);
  videoScroll?.load();
}

onScroll();

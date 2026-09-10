(function () {
  "use strict";

  var el = {
    video: document.getElementById("bg"),
    bgm: document.getElementById("bgm"),
    beamL: document.getElementById("beamL"),
    beamR: document.getElementById("beamR"),
    brief: document.getElementById("brief"),
    briefLabel: document.getElementById("briefLabel"),
    briefValue: document.getElementById("briefValue"),
    status: document.getElementById("status"),
    eta: document.getElementById("eta"),
    pct: document.getElementById("pct")
  };

  var T_SCENE = 500;
  var MARK_STREAK = 0.39;
  var DOWNLOAD_CEILING = 68;
  var DEFAULT_TAIL = 42000;
  var MUSIC_VOLUME = 0.07;

  var VIDEOS = [
    "assets/plaza.webm",
    "assets/train1.webm",
    "assets/citadel.webm",
    "assets/cp1.webm",
    "assets/hideout.webm",
    "assets/street.webm",
    "assets/cm1.webm"
  ];

  var MUSIC = [
    "assets/background.mp3",
    "assets/godspeed.mp3",
    "assets/goteberg.mp3",
    "assets/scum.mp3",
    "assets/Bones.mp3",
    "assets/precipice.mp3"
  ];

  var BRIEF = [
    { label: "COMMUNITY", value: "<b>discord.gg/singularity</b>" },
    { label: "PLAYER PORTAL", value: "Characters, whitelist and achievements live at <b>portal.singularity-community.com</b>" },
    { label: "RULES", value: "Read them on the Discord before you play" },
    { label: "BUILD", value: "Closed <b>pre-alpha</b>. Systems change between sessions" },
    { label: "ACCOUNTS", value: "One Steam account links to one Discord account" },
    { label: "SUPPORT", value: "Open a ticket on the portal instead of messaging staff directly" },
    { label: "REPORTING", value: "Bugs and player reports go to the Discord" },
    { label: "PLATFORM", value: "Helix framework, running a schema written for this server" },
    { label: "UPDATES", value: "Patch notes are posted in the Discord as they ship" },
    { label: "ACHIEVEMENTS", value: "Earn them in game, track them on the portal" }
  ];

  var JOKES = [
    "Polishing crowbars",
    "Shelling cities",
    "Preparing unforeseen consequences",
    "Feeding the headcrabs",
    "Reticulating antlions",
    "Teaching Combine soldiers to aim",
    "Stacking barrels in a hallway",
    "Confiscating your crowbar",
    "Charging the gravity gun",
    "Rationing the rations",
    "Filing your citizen paperwork",
    "Assigning your housing block",
    "Winding up the manhacks",
    "Bricking up a doorway",
    "Ignoring the Breencast",
    "Draining the canals",
    "Counting vortigaunts",
    "Waiting for the train",
    "Misplacing the Borealis",
    "Calibrating the suit charger",
    "Sweeping up headcrab shells",
    "Losing the airboat keys",
    "Stamping loyalty points",
    "Letting you sleep in",
    "Restocking the supply crates",
    "Hiding a lambda behind a dumpster",
    "Testing the emergency broadcast",
    "Warming up the teleporter"
  ];

  var STATUS_MAP = [
    ["workshop complete", "Add-ons ready", 70],
    ["workshop", "Mounting add-ons", 66],
    ["mounting", "Mounting add-ons", 70],
    ["retrieving server info", "Reading server details", 74],
    ["receiving server info", "Reading server details", 76],
    ["connecting to server", "Connecting", 78],
    ["sending client info", "Sending your details", 82],
    ["client info sent", "Details accepted", 86],
    ["receiving client info", "Details accepted", 86],
    ["precach", "Preparing the map", 90],
    ["starting lua", "Starting the game mode", 94],
    ["lua", "Starting the game mode", 94],
    ["spawn", "Joining the server", 98]
  ];

  var state = {
    t0: Date.now(),
    filesTotal: 0,
    filesDone: 0,
    fileTarget: 0,
    statusFloor: 0,
    shown: 0,
    dlDoneAt: 0,
    gotDetails: false,
    realStatusAt: 0,
    videoFailed: false,
    beam: 0,
    etaShown: null,
    lastFrame: 0,
    lastWrite: 0
  };

  var rate = { at: 0, done: 0, perMs: 0 };

  /* ---------- storage ---------- */

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  var tails = readJSON("sing.tails", []);
  if (!(tails instanceof Array)) tails = [];

  (function inheritPreviousSession() {
    var prev = readJSON("sing.session", null);
    if (prev && prev.dl > 0 && prev.last > prev.dl) {
      var tail = prev.last - prev.dl;
      if (tail > 3000 && tail < 600000) {
        tails.push(tail);
        tails = tails.slice(-5);
        writeJSON("sing.tails", tails);
      }
    }
    writeJSON("sing.session", { dl: 0, last: Date.now() });
  })();

  function checkpoint() {
    var now = Date.now();
    if (state.shown >= 97 || now - state.lastWrite < 500) return;
    state.lastWrite = now;
    writeJSON("sing.session", { dl: state.dlDoneAt, last: now });
  }

  function tailEstimate() {
    if (!tails.length) return DEFAULT_TAIL;
    var sorted = tails.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  }

  /* ---------- helpers ---------- */

  function setText(node, txt) {
    if (node) node.textContent = txt == null ? "" : String(txt);
  }

  function norm(s) {
    return String(s || "").toLowerCase();
  }

  function approach(current, target, dt, tau) {
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  }

  var beamBase = 0;

  function measureBeam() {
    var horizon = document.querySelector(".horizon");
    if (!horizon || !el.beamL) return;
    var markW = horizon.offsetWidth;
    var beamW = el.beamL.offsetWidth;
    if (markW > 0 && beamW > 0) beamBase = (MARK_STREAK * markW) / beamW;
  }

  function beamFloor() {
    return beamBase > 0 ? Math.min(1, beamBase) : 0.16;
  }

  function markDownloadDone() {
    if (!state.dlDoneAt) state.dlDoneAt = Date.now();
  }

  /* ---------- eta ---------- */

  function noteRate(done) {
    var now = Date.now();
    if (!rate.at) {
      rate.at = now;
      rate.done = done;
      return;
    }
    if (done <= rate.done) return;
    var dt = now - rate.at;
    if (dt < 150) return;
    var inst = (done - rate.done) / dt;
    rate.perMs = rate.perMs ? rate.perMs * 0.8 + inst * 0.2 : inst;
    rate.at = now;
    rate.done = done;
  }

  function etaSeconds() {
    var tail = tailEstimate();
    if (state.dlDoneAt) {
      return Math.max(0, state.dlDoneAt + tail - Date.now()) / 1000;
    }
    if (state.filesTotal > 0 && rate.perMs > 0) {
      var remaining = Math.max(0, state.filesTotal - state.filesDone);
      return (remaining / rate.perMs + tail) / 1000;
    }
    return null;
  }

  function formatEta(seconds) {
    if (seconds < 3) return "any moment";
    var total = Math.round(seconds);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return "ETA " + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ---------- gmod hooks ---------- */

  window.GameDetails = function () {
    state.gotDetails = true;
  };

  window.SetFilesTotal = function (total) {
    var n = parseInt(total, 10);
    if (!isNaN(n) && n > 0) state.filesTotal = n;
  };

  window.SetFilesNeeded = function (needed) {
    var n = parseInt(needed, 10);
    if (isNaN(n) || n < 0 || state.filesTotal <= 0) return;

    state.filesDone = Math.max(state.filesDone, state.filesTotal - n);
    noteRate(state.filesDone);
    state.fileTarget = Math.max(state.fileTarget, (state.filesDone / state.filesTotal) * DOWNLOAD_CEILING);

    if (n === 0) markDownloadDone();

    checkpoint();
  };

  window.DownloadingFile = function () {};

  window.SetStatusChanged = function (status) {
    var raw = String(status || "").replace(/\.+\s*$/, "").trim();
    if (!raw) return;
    var n = norm(raw);
    var mapped = raw;

    for (var i = 0; i < STATUS_MAP.length; i++) {
      if (n.indexOf(STATUS_MAP[i][0]) !== -1) {
        mapped = STATUS_MAP[i][1];
        if (STATUS_MAP[i][2] >= 70) markDownloadDone();
        state.statusFloor = Math.max(state.statusFloor, STATUS_MAP[i][2]);
        break;
      }
    }

    if (mapped !== raw) {
      state.realStatusAt = Date.now();
      setText(el.status, mapped);
    }
    checkpoint();
  };

  /* ---------- frame loop ---------- */

  function update() {
    var now = Date.now();
    var dt = state.lastFrame ? Math.min(250, now - state.lastFrame) : 16;
    state.lastFrame = now;
    if (dt <= 0) return;

    var elapsed = now - state.t0;
    var creep = 64 * (1 - Math.exp(-elapsed / 45000));
    var target = Math.min(100, Math.max(state.fileTarget, state.statusFloor, creep));

    state.shown = approach(state.shown, target, dt, 300);
    if (target - state.shown < 0.05) state.shown = target;
    setText(el.pct, Math.floor(state.shown) + "%");

    var floor = beamFloor();
    var want = floor + (1 - floor) * (state.shown / 100);
    state.beam = state.beam ? approach(state.beam, want, dt, 420) : want;

    var scale = "scaleX(" + state.beam.toFixed(4) + ")";
    if (el.beamL) el.beamL.style.transform = scale;
    if (el.beamR) el.beamR.style.transform = scale;

    var secs = etaSeconds();
    if (secs === null) {
      if (el.eta) el.eta.className = "tele tele__eta";
    } else {
      if (state.etaShown === null) {
        state.etaShown = secs;
      } else {
        state.etaShown = Math.max(0, state.etaShown - dt / 1000);
        state.etaShown = approach(state.etaShown, secs, dt, 4000);
      }
      setText(el.eta, formatEta(state.etaShown));
      if (el.eta) el.eta.className = "tele tele__eta is-on";
    }
  }

  function raf() {
    update();
    window.requestAnimationFrame(raf);
  }

  /* ---------- loading messages ---------- */

  function startJokes() {
    if (!el.status) return;
    var order = JOKES.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    var at = 0;

    function next() {
      if (Date.now() - state.realStatusAt < 5000) return;
      setText(el.status, order[at % order.length] + "…");
      at++;
    }

    next();
    window.setInterval(next, 4500);
  }

  /* ---------- brief ---------- */

  function startBrief() {
    if (!el.brief) return;
    var i = (Math.random() * BRIEF.length) | 0;

    function paint() {
      var item = BRIEF[i % BRIEF.length];
      setText(el.briefLabel, item.label);
      el.briefValue.innerHTML = item.value;
      i++;
    }

    paint();
    window.setInterval(function () {
      el.brief.className = "brief is-turning";
      window.setTimeout(function () {
        paint();
        el.brief.className = "brief";
      }, 560);
    }, 7400);
  }

  /* ---------- media ---------- */

  function pick(list, notSrc) {
    if (!list.length) return "";
    if (list.length === 1) return list[0];
    var current = String(notSrc || "").split("/").pop();
    var choice = "";
    do {
      choice = list[(Math.random() * list.length) | 0];
    } while (choice.split("/").pop() === current);
    return choice;
  }

  function revealScene() {
    if (!el.video || state.videoFailed) return;
    var wait = Math.max(0, T_SCENE - (Date.now() - state.t0));
    window.setTimeout(function () {
      el.video.className = "scene__v is-live";
    }, wait);
  }

  function ensurePlaying(node, attempts) {
    if (!node || attempts <= 0) return;
    var p = null;
    try { p = node.play(); } catch (e) {}
    if (p && typeof p.then === "function") {
      p.then(null, function () {
        window.setTimeout(function () { ensurePlaying(node, attempts - 1); }, 400);
      });
    } else if (node.paused) {
      window.setTimeout(function () { ensurePlaying(node, attempts - 1); }, 400);
    }
  }

  function initVideo() {
    if (!el.video) return;
    el.video.loop = true;
    el.video.muted = true;
    el.video.defaultMuted = true;
    el.video.addEventListener("canplay", function () {
      revealScene();
      if (el.video.paused) ensurePlaying(el.video, 12);
    });
    el.video.addEventListener("error", function () {
      state.videoFailed = true;
      el.video.className = "scene__v";
    });
    el.video.src = pick(VIDEOS);
    try { el.video.load(); } catch (e) {}
    ensurePlaying(el.video, 12);

    window.setInterval(function () {
      if (!state.videoFailed && el.video.paused && el.video.readyState >= 2) {
        ensurePlaying(el.video, 1);
      }
    }, 3000);
  }

  function rampMusic() {
    var from = Date.now();
    var iv = window.setInterval(function () {
      var k = Math.min(1, (Date.now() - from) / 2600);
      try { el.bgm.volume = MUSIC_VOLUME * k; } catch (e) {}
      if (k >= 1) window.clearInterval(iv);
    }, 100);
  }

  function playTrack(src) {
    if (!el.bgm || !src) return;
    el.bgm.src = src;
    try { el.bgm.volume = 0; } catch (e) {}
    try { el.bgm.load(); } catch (e) {}
    var p = null;
    try { p = el.bgm.play(); } catch (e) {}
    if (p && typeof p.then === "function") {
      p.then(rampMusic, function () {
        window.setTimeout(function () { ensurePlaying(el.bgm, 6); }, 500);
      });
    } else {
      rampMusic();
    }
  }

  function initMusic() {
    if (!el.bgm) return;
    el.bgm.loop = false;
    el.bgm.onended = function () {
      playTrack(pick(MUSIC, el.bgm.currentSrc));
    };

    var started = false;
    function start() {
      if (started) return;
      started = true;
      playTrack(pick(MUSIC));
    }

    if (el.video) el.video.addEventListener("canplay", start);
    window.setTimeout(start, 4000);
  }

  /* ---------- demo ---------- */

  function runDemo() {
    if (state.gotDetails) return;
    window.GameDetails("Singularity Collective", "", "rp_c24_district2_res", 40, "0", "ixhl2rp");
    window.SetFilesTotal(120);

    var left = 120;
    var iv = window.setInterval(function () {
      left -= 1 + ((Math.random() * 3) | 0);
      if (left <= 0) {
        window.clearInterval(iv);
        window.SetFilesNeeded(0);
        window.setTimeout(function () { window.SetStatusChanged("Workshop Complete"); }, 400);
        window.setTimeout(function () { window.SetStatusChanged("Retrieving server info..."); }, 2200);
        window.setTimeout(function () { window.SetStatusChanged("Sending client info..."); }, 5200);
        window.setTimeout(function () { window.SetStatusChanged("Starting Lua..."); }, 9000);
        return;
      }
      window.SetFilesNeeded(left);
    }, 220);
  }

  /* ---------- boot ---------- */

  function boot() {
    startJokes();
    measureBeam();
    window.addEventListener("resize", measureBeam);
    startBrief();
    initVideo();
    initMusic();
    window.setInterval(update, 40);
    window.requestAnimationFrame(raf);

    if (window.location.search.indexOf("demo") !== -1) {
      window.setTimeout(runDemo, 400);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

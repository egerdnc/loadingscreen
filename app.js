(function () {
  "use strict";

  var el = {
    video: document.getElementById("bg"),
    bgm: document.getElementById("bgm"),
    chapter: document.getElementById("chapter"),
    caption: document.getElementById("caption"),
    pct: document.getElementById("loaderPct"),
    fill: document.getElementById("progressFill"),
    status: document.getElementById("status")
  };

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

  var MUSIC_VOLUME = 0.07;

  var CHAPTERS = {
    rp_c24_district2_res: {
      chapter: "DISTRICT TWO",
      caption: "CITY TWENTY-FOUR · RESIDENTIAL BLOCK"
    }
  };

  var STATUS_FLOORS = [
    { match: "workshop complete", floor: 80 },
    { match: "retrieving server info", floor: 82 },
    { match: "connecting to server", floor: 84 },
    { match: "receiving server info", floor: 86 },
    { match: "sending client info", floor: 90 },
    { match: "client info sent", floor: 93 },
    { match: "starting lua", floor: 95 },
    { match: "lua", floor: 95 },
    { match: "spawn", floor: 98 }
  ];

  var state = {
    filesTotal: 0,
    filesDone: 0,
    target: 4,
    shown: 0,
    floor: 0,
    gotDetails: false,
    finished: false
  };

  function setText(node, txt) {
    if (node) node.textContent = txt == null ? "" : String(txt);
  }

  function norm(s) {
    return String(s || "").toLowerCase();
  }

  function buildSegments() {
    if (!el.segments) return;
    for (var i = 0; i < SEG_COUNT; i++) {
      var d = document.createElement("div");
      d.className = "seg";
      el.segments.appendChild(d);
      segEls.push(d);
    }
  }

  function render() {
    var pct = Math.max(0, Math.min(100, state.shown));
    if (el.fill) el.fill.style.width = pct + "%";
    setText(el.pct, Math.floor(pct) + "%");
    if (pct >= 93 && !state.finished) {
      state.finished = true;
      if (el.chapter) {
        el.chapter.className = "card__chapter is-glow";
      }
    }
  }

  function tick() {
    if (state.floor < 76) {
      state.floor = Math.min(76, state.floor + 0.018);
    }
    var target = Math.max(state.target, state.floor);
    state.shown += (target - state.shown) * 0.055;
    if (target - state.shown < 0.05) state.shown = target;
    render();
  }

  function fileProgress() {
    if (state.filesTotal <= 0) return;
    var done = Math.max(0, Math.min(state.filesTotal, state.filesDone));
    state.target = Math.max(state.target, (done / state.filesTotal) * 80);
  }

  function prettifyMap(mapname) {
    var s = String(mapname || "").replace(/^(rp|gm|cs|de|ttt)_/i, "");
    var words = s.split(/[_\-]+/);
    var out = [];
    for (var i = 0; i < words.length; i++) {
      if (words[i]) out.push(words[i].toUpperCase());
    }
    return out.join(" ") || "UNKNOWN SECTOR";
  }

  function resolveChapter(mapname) {
    var key = norm(mapname);
    if (CHAPTERS[key]) return CHAPTERS[key];
    return {
      chapter: prettifyMap(mapname),
      caption: "CITY TWENTY-FOUR"
    };
  }

  function trimFileName(name) {
    var parts = String(name || "").replace(/\\/g, "/").split("/");
    if (parts.length > 2) parts = parts.slice(parts.length - 2);
    return parts.join("/");
  }

  window.GameDetails = function (servername, serverurl, mapname, maxplayers, steamid, gamemode) {
    state.gotDetails = true;
    var c = resolveChapter(mapname);
    setText(el.chapter, c.chapter);
    setText(el.caption, c.caption);
  };

  window.SetFilesTotal = function (total) {
    var n = parseInt(total, 10);
    if (!isNaN(n) && n > 0) {
      state.filesTotal = n;
      fileProgress();
    }
  };

  window.SetFilesNeeded = function (needed) {
    var n = parseInt(needed, 10);
    if (isNaN(n) || n < 0) return;
    if (state.filesTotal > 0) {
      state.filesDone = state.filesTotal - n;
      fileProgress();
      setText(el.status, "Downloading assets — " + state.filesDone + " of " + state.filesTotal);
    }
  };

  window.DownloadingFile = function (fileName) {
    state.filesDone++;
    fileProgress();
    setText(el.status, "Downloading " + trimFileName(fileName));
  };

  window.SetStatusChanged = function (status) {
    var s = String(status || "").replace(/\.+\s*$/, "");
    var n = norm(s);
    for (var i = 0; i < STATUS_FLOORS.length; i++) {
      if (n.indexOf(STATUS_FLOORS[i].match) !== -1) {
        state.target = Math.max(state.target, STATUS_FLOORS[i].floor);
        break;
      }
    }
    if (s) setText(el.status, s);
  };

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

  function initVideo() {
    if (!el.video) return;
    el.video.src = pick(VIDEOS);
    el.video.loop = true;
    el.video.muted = true;
    el.video.addEventListener("canplay", function () {
      el.video.className = "scene__video is-live";
    });
    el.video.addEventListener("error", function () {
      el.video.className = "scene__video";
    });
    try { el.video.load(); } catch (e) {}
    var p = null;
    try { p = el.video.play(); } catch (e) {}
    if (p && typeof p.then === "function") p.then(null, function () {});
  }

  function rampMusic() {
    var t0 = Date.now();
    var iv = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / 2500);
      try { el.bgm.volume = MUSIC_VOLUME * k; } catch (e) {}
      if (k >= 1) clearInterval(iv);
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
      p.then(rampMusic, function () {});
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
    setTimeout(function () {
      playTrack(pick(MUSIC));
    }, 700);
  }

  function runDemo() {
    if (state.gotDetails) return;
    window.GameDetails("Singularity Collective", "", "rp_c24_district2_res", 40, "0", "ixhl2rp");
    var demoFiles = [
      "materials/models/props_c24/plaza_facade01.vmt",
      "models/props_c24/streetlamp02.mdl",
      "sound/ambient/c24/wind_block_loop.wav",
      "materials/overviews/rp_c24_district2_res.vtf",
      "models/props_combine/checkpoint_gate01.mdl",
      "materials/decals/c24/ration_notice.vmt",
      "sound/music/singularity_theme.mp3",
      "models/props_c24/tenement_door03.mdl"
    ];
    window.SetFilesTotal(96);
    var left = 96;
    var iv = setInterval(function () {
      left -= 1 + ((Math.random() * 3) | 0);
      if (left <= 0) {
        clearInterval(iv);
        window.SetFilesNeeded(0);
        setTimeout(function () { window.SetStatusChanged("Workshop Complete"); }, 500);
        setTimeout(function () { window.SetStatusChanged("Retrieving server info..."); }, 1400);
        setTimeout(function () { window.SetStatusChanged("Sending client info..."); }, 3000);
        setTimeout(function () { window.SetStatusChanged("Starting Lua..."); }, 4600);
        return;
      }
      window.SetFilesNeeded(left);
      if (Math.random() < 0.6) {
        window.DownloadingFile(demoFiles[(Math.random() * demoFiles.length) | 0]);
        state.filesDone--;
      }
    }, 140);
  }

  function boot() {
    render();
    initVideo();
    initMusic();
    setInterval(tick, 100);
    var forceDemo = window.location.search.indexOf("demo") !== -1;
    setTimeout(runDemo, forceDemo ? 300 : 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

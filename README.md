# SINGULARITY — Loading Screen

The Garry's Mod loading screen for the Singularity HL2RP server. It is built as a title sequence
rather than a progress page: a graded in-game scene, the Singularity mark opening at the centre of
the frame, and the mark's own light line carrying the load.

**Live:** https://egerdnc.github.io/loadingscreen/
**Server:** `sv_loadingurl` is set from the schema (`Schema.LoadingURL` in `sv_schema.lua`), not from
`server.cfg`, so a new server picks it up automatically.

## Progress is the light line

The brand mark is a lensed disc with a horizontal light streak running through it. That streak is the
progress readout.

At 0% it is exactly the length it is in `mark-glow.svg`, so the mark renders as the finished logo and
nothing looks half-drawn. As the client loads, the light extends past the mark's own tips and reaches
the edges of the frame when the game is ready to start. The geometry, gradients, blur radii and
opacities are taken from the mark itself, so this is the brand's own light growing rather than a bar
drawn next to it.

The streaks are removed from the inlined SVG and redrawn as two DOM elements purely so progress can
drive their length. Everything else about the disc — halo, arcs, lens flares, mask — is untouched.

The percentage and the countdown in the bottom bar carry the exact numbers.

## Countdown

The time remaining is estimated from two measurements rather than a fixed guess:

- **Download phase** — files completed per second, smoothed, against the files still needed.
- **Everything after the download** — mounting, handshake, map and Lua. This is roughly constant for a
  given machine, so the page records how long it took last time and reuses the median of the last five
  loads. Until it has a sample it assumes 42 seconds.

Each session writes a checkpoint to `localStorage` as it goes, because Garry's Mod destroys the page
without warning when the map is ready. The next load reads that checkpoint. The displayed value ticks
down in real time and eases onto a new estimate instead of jumping.

Clearing site data resets the estimate to the 42 second default. Nothing else depends on it.

## Sequence

| Beat | Time | What happens |
|------|------|--------------|
| Scene | 0.5s | The map footage fades up behind, near monochrome |
| Horizon | 0.82s | The mark resolves out of blur, complete, light line and all |
| Telemetry | 1.7s | Status, countdown and percentage engage |
| Collapse | 2.0s | The wordmark's letters converge inward, centre letters landing first |
| Brief | 2.6s | The information panel starts cycling |
| Stamp | 3.05s | PRE-ALPHA sets |

Every reveal is written so its resting state is the visible one and the animation plays *backwards*
into it. If animations never run, the page is simply fully visible rather than blank.

## Loading messages

The status line runs Half-Life themed messages while the download grinds — "Polishing crowbars",
"Shelling cities", "Preparing unforeseen consequences" — shuffled per session and rotating every 4.5
seconds. When a real connection milestone lands (reading server details, sending your details,
starting the game mode) it takes the line and holds it for five seconds before the messages resume.

Nothing truthful is hidden by this: the percentage and countdown are always live, and the milestones
always interrupt. Add or edit entries in `JOKES` in `app.js`.

## Information panel

Strictly out-of-character: Discord, the portal, rules, build status, account linking, support,
reporting, platform, updates and achievements. It carries nothing about the setting or the world.

## Assets

Source clips were 1080p and up to five minutes long, 15–54 MB each. Because the loading screen
competes for bandwidth with the download it is displaying, every clip is re-encoded to 90 seconds of
VP9 at 1600x900 (`cm1` at 1280x720, being much higher motion), and the music to 180 seconds at 88 kbps
with a fade-out so a track change reads as a dissolve.

| | Before | After |
|---|---|---|
| Clip | 15–54 MB | 0.9–3.5 MB |
| Track | 4.5–14 MB | ~1.8 MB |
| Per player | 20–60 MB | 3–5 MB |

One clip and one track are chosen at random per load, so the numbers above are what a connecting
player actually downloads. Re-encode with `ffmpeg -ss 2 -t 90 -an -vf "scale=1600:-2,fps=24" -c:v
libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -cpu-used 3 -g 240`.

Inter and JetBrains Mono are served from `assets/fonts/` rather than a CDN, so the page has no external
requests at all. Only the Latin subset is bundled; the copy is English throughout.

## Development

Open with `?demo=1` in any browser to run a simulated connect — downloads, status changes and the full
sequence — without a server.

The brand mark and wordmark are inlined into `index.html`. They are generated from the brand kit:
the wordmark's single path is split into its twelve glyphs so each can be animated, and the mark's
baked light streaks are removed so progress can drive them instead. The disc geometry itself is
untouched.

## Media credits

Referenced for visual inspiration or demonstration in this project's loader assets:

MoonRealis — SFM animation and cinematic visuals
https://www.youtube.com/@moonrealis/videos

TheParryGod — visual and animation content used as stylistic reference
https://www.youtube.com/@TheParryGod

All such media is the intellectual property of their respective creators. This project does not claim
ownership of third-party content, and such content is included only for community reference or
demonstration. Any use of third-party media will be removed promptly upon request by the rights holder.

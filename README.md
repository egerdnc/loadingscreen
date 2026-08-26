# SINGULARITY — Loading Screen

Garry's Mod loading screen for the Singularity HL2RP server (City 24). Styled as a Half-Life chapter opening: cinematic in-map scene, the Singularity brand mark and wordmark, a chapter title card, and a Source-style segmented progress dialog.

**GitHub Pages:** Enable **Settings → Pages → Source: GitHub Actions**. After the workflow deploys, set your server:

`sv_loadingurl "https://<user>.github.io/<repo>/"`

## Behavior

- `GameDetails` resolves the map into a chapter title (`rp_c24_district2_res` → DISTRICT TWO). Unknown maps fall back to a prettified map name.
- `SetFilesTotal` / `SetFilesNeeded` / `DownloadingFile` drive the segmented bar with real download progress; late connection statuses push it toward completion.
- Background is a random muted clip from `assets/`, graded dark; one quiet music track plays with a slow fade-in.
- Open with `?demo=1` in a normal browser to simulate a full connect sequence.

## Media Credits

The following content creators' work has been referenced for visual inspiration or demonstration purposes in this project's loader assets:

MoonRealis — SFM animation and cinematic visuals
https://www.youtube.com/@moonrealis/videos

TheParryGod — visual and animation content used as stylistic reference
https://www.youtube.com/@TheParryGod

All such media is the intellectual property of their respective creators. This project does not claim ownership of third-party content, and such content is included only for community reference or demonstration. Any use of third-party media will be removed promptly upon request by the rights holder.

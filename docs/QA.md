# Local prototype checks — 7 November 2026

## Passed

- Installed the pinned packages successfully; npm reported zero known vulnerabilities at installation time.
- `astro check`: six files checked, zero errors, warnings, or hints.
- `astro build`: successful static build to `dist/`.
- Local development server returned HTTP 200.
- Browser inspection at 1280×720 and 390×844: original desk renders, scrolling approaches the laptop, HTML handoff appears, certificates precede projects and toolkit.
- Mobile certificate and project cards stack without horizontal overflow.
- Journey and Work navigation reach their sections.
- BlindSpot dialog opens, Escape closes it, and focus returns to the opening button.
- 3D-off toggle removes the WebGL canvas and collapses the intro to one viewport. Reload preserves this choice; the page still contains all portfolio content.
- Re-enabling 3D works. No browser warning/error messages were observed in the tested flows.

Screenshots are saved in `docs/screenshots/`.

## Build sizes

Measured from production JavaScript files using local gzip (not real network transfer measurements):

| Bundle | Raw | Gzip |
|---|---:|---:|
| Page controller | 5,681 B | 2,453 B |
| Deferred Three.js + scene | 555,969 B | 137,917 B |
| Deferred GSAP | 70,358 B | 27,270 B |
| Deferred ScrollTrigger | 42,839 B | 17,412 B |

Vite warns that the uncompressed Three.js chunk exceeds 500 kB. It is dynamically imported only when effects are enabled. This is a prototype budget item to revisit before publication, not a failed build.

## Remaining limits

- Reduced-motion preference and WebGL failure handlers are implemented, but OS-level reduced-motion emulation and forced context-loss testing were not performed.
- No real low-end phone, cross-browser, screen-reader, Lighthouse, or sustained frame-rate audit was performed.
- The revised handoff uses one real HTML hero and a staged screen fade.
- The actual certificate, project screenshots, source/demo links, and CS50P project details have not been provided.
- The certificate card is presentation artwork, not a generated certificate. BlindSpot artwork is a labeled concept illustration.
- Nothing was published. The local server remains at http://127.0.0.1:4321. The sandbox denied the process-stop command during cleanup. To stop it from your terminal, run `ASTRO_TELEMETRY_DISABLED=1 npx astro dev stop` in the project directory.

## Refinement after screenshot feedback

- Removed the incoming decorative title entirely. The outgoing laptop screen fades out before the real HTML hero fades in, with the hero occupying the last viewport of the intro. There is no second title to crossfade over the screen text.
- 3D-off and reduced-motion paths now skip the entire device scene and open directly on the HTML hero. Home links follow the active mode.
- Removed the empty add-certificate placeholder; real certificates still render from the data array.
- Lowered the maximum drawing pixel ratio from 1.75 to 1.5 desktop / 1.25 narrow screens, froze static scene matrices, requested the high-performance GPU preference, and eliminated the extra animation-frame delay for scroll updates. No continuous idle rendering.
- Browser checked the final hero: canvas opacity 0, hero opacity 1, hero top 0. Static mode: no canvas, hero top 0.
- A sustained 60 fps GPU/frame-time benchmark on the user's Safari/device has not been measured. These are targeted performance improvements, not a guarantee of 60 fps.

## Rapid 3D-toggle regression fix

Only the mode-switch lifecycle changed. The toggle briefly disables during scene initialization and the initial layout commit, preventing overlapping setup/scroll operations. Pending scene construction can be aborted; cancelled scenes remove their canvas and GPU resources before a stale render can appear. Presentation state is synchronized immediately after restoring the scroll position.

Browser regression: eight rapid double-click sequences at the certificate section. The section remained at 108 px from the viewport top, the enabled state ended with exactly one canvas, the button returned to non-busy, and no browser errors or warnings were logged. Disabled mode removed the canvas. Build and TypeScript checks passed. No hero styling or content changes were made.

## Realistic desk update — 8 November 2026

- Replaced the simple laptop and desk props with original product-referenced models; added locally served CC0 studio lighting, material textures, a cached directional shadow map and baked contact shadows. Sources and license details are in `SCENE-ASSETS.md`.
- `npm run check`: 8 files, zero errors, warnings or hints. `npm run build`: passed. The deferred Three.js chunk still produces Vite's existing >500 kB advisory.
- Browser checked at 1280×720 and 390×844, then restored the normal preview viewport. The complete desk fits, the introduction clears the laptop, and the 390 px page has a 390 px document width.
- Hero handoff: hero top 0, hero opacity 1, outgoing canvas container opacity 0. No overlaid duplicate title in the inspected final frame.
- Six rapid double-click sequences at certificates: section top remained 108 px, one canvas when enabled, `aria-busy=false` afterward, no captured browser warnings/errors.
- Mobile 3D-off: zero canvases, hero top 0, hero opacity 1 and no horizontal overflow. Re-enabled successfully and returned to the opening desk.
- Screenshots: `screenshots/realistic-desk-mobile.png` and `screenshots/realistic-desk-desktop.png`.
- No sustained frame-rate/GPU benchmark, physical-device Safari test, or forced HDR-network failure test was performed. Static shadows, instancing and on-demand rendering bound the added work; they do not guarantee 60 fps on every device.
- Changes are local. No GitHub push or website deployment was performed for this update.

## Device refinement verification — 13 November 2026

- Replaced the old mouse scan (which contained a scanned support surface) with robomo's object-only MX Master 3 STL. Removed the unused old GLB from public assets.
- Inspected mouse orientation and phone display in an isolated temporary viewer; removed the viewer afterward. Corrected the phone's display UVs and double-sided surface before checking it in the assembled desk.
- Desktop preview at 1280×720: silver MacBook, graphite iPhone lock screen, clean mouse and refined ceramic mug render together.
- Rapid toggle/double-click checks: one ready canvas with effects on, zero canvases and fully visible hero with effects off; toggle returns to its enabled state.
- Scrolled through laptop zoom and hero handoff: no duplicate text layers observed. Preview console showed no warnings or errors during these checks.
- Mobile preview at 390×844: document width equals viewport width (390px), desk remains framed, navigation fits. Restored viewport after testing.
- `ASTRO_TELEMETRY_DISABLED=1 npm run check`: 0 errors, warnings or hints. Production build passes; Vite retains its large-chunk advisory for the lazily loaded 3D code.
- Evidence: `screenshots/refined-desk-desktop.png` and `screenshots/refined-desk-mobile.png`.
- These are functional and visual checks, not a measured 60 fps guarantee or exhaustive WebGL failure testing. The 20-second startup timeout and late-scene cleanup were reviewed in code.

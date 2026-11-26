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

## Mouse hover interaction

- Initial coordinate-only inspection confirmed hover detection but missed a frozen world matrix: the local position changed while the rendered mesh stayed still. This was corrected by keeping `matrixWorldAutoUpdate` enabled on the interactive mouse while freezing the other props.
- Verified actual rendered movement in the browser after the correction, followed by a return to the resting pose after leaving the hover target. Movement and yaw were increased slightly for visibility. Evidence: `screenshots/mouse-hover-fixed.png`. Temporary inspection attributes were removed.
- Switching 3D off removed the canvas and restored the static portfolio. Pointer listeners and the animation frame share the scene's existing cleanup lifecycle.
- Hover pauses during the camera zoom and is mouse-input only. No new dependencies.

## Notebook and mug hover — 14 November 2026

- Notebook lifts, its hardcover pivots at the spine, and the pen moves clear before lowering onto a ruled page. The pen and three ink strokes share sampled paths. Mug lifts and tilts with a level coffee surface. All animated descendants retain world-matrix updates.
- Browser verified the rendered notebook opening, writing motion, mug lift, and return to resting poses at 1280×720. Direct notebook-to-mug switching exposed an oversized hover bound; this was corrected with exact surface checks outside resting bounds and verified again.
- Three rapid notebook → mug → mouse sequences returned all props to rest. Disabling 3D during hover removed the canvas and left the hero fully visible at top 0. No captured browser warnings/errors in the final clean test session.
- `npm run check`: 10 files, zero errors, warnings or hints. Production build passed with the existing deferred-3D large-chunk advisory. No new dependencies or external assets.
- Evidence: `screenshots/notebook-hover.png` and `screenshots/mug-hover.png`. Browser visual checks do not constitute a sustained frame-rate or physical-device Safari benchmark.

## Hover motion refinement — 15 November 2026

- Replaced fast exponential engagement with critically damped motion, preserving velocity when hover direction changes. Notebook cover finishes opening around 1.95 seconds; pen rotation is spread over the pickup arc, and writing starts around 2.2 seconds. Strokes take 3.2 seconds with eased lift/return paths.
- Mug rises before tipping and returns upright before landing. Mouse target travel increased from 0.12 to 0.26 units horizontally and from 0.14 to 0.37 units in depth, with a stronger, slower turn. The chosen envelope was checked against device geometry and mat edges.
- A numerical pen/cover clearance sweep found no intersections. A separate simulation of the actual engagement update at 30/60/120 Hz matched across rates, stayed within 0–1 through rapid reversals and returned to exact rest. These verify animation math, not rendering frame rate.
- Browser inspected pickup, open writing, mug lift and return, mouse movement, and three rapid prop-switch sequences. Evidence: `screenshots/notebook-motion-refined.png`, `screenshots/mug-motion-refined.png`, `screenshots/mouse-motion-refined.png`.
- Type check passed with zero errors/warnings/hints; build passed with the existing deferred-3D chunk-size advisory. No added dependencies.

## Studio and camera polish — 25 November 2026

- Kept Astro, Three.js and GSAP. Added a one-time softbox environment bake, tuned silver/glass/wood/coffee finishes, softened shadows and made the working lamp's diffuser and warm light clearer. Phone artwork now emits independently of scene lighting. No new dependencies, downloaded assets or paid services.
- Camera parallax is time-damped and recentres on exit. Pointer hit tests consume the latest input once per frame. The dolly uses smootherstep; projection updates are skipped when progress and size are unchanged. A 2.4-million-pixel drawing-buffer budget bounds large-display fill-rate. Moving shadows refresh at up to 30 Hz; resting scenes remain on demand.
- At 1280×720/DPR 1.5, prolonged mouse and notebook hover checks retained a 16.7 ms median frame interval. The final rolling 240-frame samples measured p95 intervals of 17.4 ms (mouse) and 17.6 ms (notebook), with CPU submission p95 of 2.6/2.9 ms. The baseline mouse sample was 16.7/17.6 ms and 2.6 ms CPU p95: this pass improves movement and appearance while retaining the observed cadence, not a demonstrated frame-rate increase. These are local preview observations, not GPU timings or a guarantee for Safari/physical phones.
- Visually checked mouse movement, mug lift/level liquid, notebook opening/writing, direct prop switching, and return to rest. The idle counter remained at 4,285 frames across observations. Confirmed mid-zoom has one title layer; final hero top is 0, hero opacity 1 and outgoing canvas opacity 0.
- Four rapid double-click toggle sequences at certificates alternated 0/1 canvases, kept the section at 108 px, and returned the toggle to non-busy. No warning/error messages were captured in the clean verification tab.
- Responsive checks used a temporary local iframe harness, removed afterward: 390×844 has document width 390 and a 487×1055 drawing buffer; 3D-off has zero canvases and hero top 0. Re-enabling works. At 2560×1440, the drawing buffer is 2065×1161 (2,397,465 pixels), within budget. These validate layout/buffer size, not touch input or physical-device performance.
- `astro check`: 11 files, zero errors, warnings or hints. Production build passed. Deferred scene bundle: 702,217 bytes raw / 181,219 bytes gzip. The existing >500 kB advisory remains. Verified the development HUD and its query flag are absent from production output. Optional local profiling: `/?scene-debug`.
- Evidence: `screenshots/studio-before.png` and `screenshots/studio-polish-desktop.png`. All changes remain local; no push or publication was performed.

## Retina clarity update — 25 November 2026

- Following the first Cloudflare publication, replaced the 1.25× mobile / 1.5× desktop caps with device pixel ratio up to 3× and an 8-million-pixel ceiling. This supersedes the buffer limits above. Resolution changes only on resize; existing on-demand rendering and shadow throttling remain.
- Calculated buffers: 390×844 at DPR 3 → 1170×2532; 430×932 at DPR 3 → 1290×2796; 1440×900 at DPR 2 → 2880×1800. Large screens stay below the total pixel ceiling.
- Astro check passed (11 files, no diagnostics), production build passed with the existing scene chunk advisory, and diff whitespace check passed.
- Physical-phone frame rate has not been measured at the increased resolution. Higher pixel counts improve clarity but increase GPU work; earlier performance measurements do not validate this new setting.

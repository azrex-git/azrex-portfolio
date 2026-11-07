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

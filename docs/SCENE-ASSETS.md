# Workspace scene assets — 12 November 2026

The scene combines free, self-hosted device models with original desk geometry. No paid model, subscription, API key or image-generation service is required. Models, textures, the HDRI and the Draco decoder are served by the portfolio; there are no third-party runtime requests.

## Imported devices

All three device assets use [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Full author, source and download-mirror attribution is retained in [CREDITS.txt](../public/models/CREDITS.txt).

| Device | Source | Local file | Changes |
|---|---|---|---|
| MacBook Pro M3 16 inch 2024 | [Jack Baeten](https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4) | `public/models/macbook-pro.glb` | Silver aluminum finish, desk scale and placement, original screen artwork and reprojected display UVs. |
| iPhone 17 Pro Max | [MajdyModels / MG990](https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d) | `public/models/iphone-17-pro-max.glb` | Graphite materials, face-up orientation and placement, refined glass, original lock-screen artwork and reprojected display UVs. The displayed date and time are decorative. |
| Logitech MX Master 3 | [robomo's 3D scan](https://www.printables.com/model/1149616-logitech-mx-master-3-3d-scan/files) | `public/models/mx-master-3-scan.stl` | The 11,564-triangle scan is aligned and scaled for the desk, with smoothed vertex normals and separate soft-touch shell and metal wheel finishes. |

The MacBook asset depicts an M3 enclosure; it is not an exact M5 model or manufacturer CAD. The mouse is an MX Master 3 scan. Device trademarks belong to their owners; this portfolio is not affiliated with Apple or Logitech.

## Original geometry and lighting

The mug, coffee, notebook, pen, desk and lamp are original geometry. The refined mug uses a rolled ceramic lip, recessed foot, joined handle, glazed material and a curved liquid edge; it is not a scanned asset. Fabric, wood grain, screen artwork and contact shadows are generated locally.

The environment is **Studio Small 08, 1K Radiance HDR**, by Sergej Majboroda / Poly Haven, under [CC0](https://polyhaven.com/license): [source](https://polyhaven.com/a/studio_small_08). File: `public/environments/studio_small_08_1k.hdr` (1,508,872 bytes). SHA-256: `f6a989f89432eb4eee3191364a9c1ceed195c4ec3544173a3c04fd96cb91d0ba`. A generated studio environment replaces it if loading fails or exceeds 4.5 seconds.

## Rendering and editing

- `src/scripts/imported-devices.ts`: device loading, alignment, finishes and phone artwork.
- `src/scripts/desk-props.ts` and `desk-lamp.ts`: original props and lamp.
- `src/scripts/laptop-scene.ts`: desk, laptop wallpaper, environment, lighting, camera and GPU resource disposal.
- `src/scripts/experience.ts`: scrolling, effects toggle, presentation and startup lifecycle.

The scene reuses its directional shadow map and two generated contact-shadow textures. Static world transforms are frozen after assembly. Rendering responds to scroll, pointer and viewport changes, and pauses outside the introduction or while the document is hidden. Pixel ratio is capped at 1.5 on desktop and 1.25 on narrow screens.

Startup has a 20-second cutoff that aborts loading and restores the HTML portfolio. Toggles serialize setup; aborted or late scenes are disposed, stale callbacks cannot restore presentation state, and reset clears card tilt. Reduced-motion preferences disable the 3D experience.

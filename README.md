# Akashjeet Dutta — portfolio prototype

A local portfolio prototype for a first-year developer, built around an original procedural 3D laptop opening into a readable HTML portfolio. The visual direction combines dark glass surfaces, careful typography, and a focused transition into the work.

The confirmed content is Akashjeet's name, first-year status, Python/PostgreSQL/Supabase toolkit, CS50P certificate and final project, and BlindSpot: a persona-based UX accessibility testing AI engine using the Agent Skills Standard. Project links, certificate evidence, screenshots, dates, and further case-study details still need to be supplied.

## Run locally

Open a terminal in this `portfolio-prototype` folder with Node.js >=22.23.4 and npm >=9.6.5 available, then install the dependencies:

```sh
npm install
```

Start the development server:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run dev
```

Open the local URL printed by Astro. Astro 7 may start a background development server; stop it with `ASTRO_TELEMETRY_DISABLED=1 npx astro dev stop`. The environment variable disables optional Astro telemetry and avoids writing preferences outside the project during sandboxed development.

Check the Astro and TypeScript sources:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
```

Create the production build:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

The build output is written to `dist/`. Building does not publish the website. This prototype has not been deployed.

## Update the portfolio

`src/data/portfolio.ts` is the central place for portfolio copy and content configuration. Start there when adding accurate project information, links, accomplishments, or toolkit entries. See `docs/CONTENT-GUIDE.md` for the content workflow and `docs/DEPENDENCIES.md` for the dependency and license record.

Use real artifacts when they are ready. The procedural laptop is an original presentation element; it is not evidence of BlindSpot's interface or the CS50P project's features. Keep unavailable links absent rather than adding guessed URLs.

## Implementation approach

The realistic desk update uses original product-referenced MacBook Pro, iPhone and MX Master recreations, plus a local CC0 studio environment. See [the scene asset record](docs/SCENE-ASSETS.md) for references, credits and the files to edit.

- Astro provides the HTML structure and build pipeline.
- TypeScript keeps the content and animation code explicit.
- Three.js constructs the laptop from procedural geometry.
- GSAP coordinates the visual transition from the laptop into the DOM layout.
- Core portfolio information belongs in semantic HTML so it remains available when effects are reduced or unavailable.

The reduced-motion and no-effects paths are part of the implementation requirements. They should provide direct access to the portfolio without requiring a 3D sequence. Keyboard access, responsive layout, and readable contrast matter throughout the visual experience.

## Review before sharing

Run the check and build commands, then inspect desktop and narrow mobile layouts, keyboard navigation, the reduced-motion path, and the fallback when 3D effects cannot run. Confirm every enabled link has a real destination and every project claim has supporting evidence.

These are review instructions, not a claim that those checks have passed. Record actual validation results and any remaining limitations below when review is complete.

## Current section order

1. A procedural developer desk with laptop, mug, notebook, phone, mouse, and lamp.
2. Camera zoom and screen handoff, followed by the HTML name/hero section.
3. Glass certificate cards, generated from the `certificates` array.
4. BlindSpot and the CS50P final-project preview.
5. Python, PostgreSQL, Supabase, and a short about section.

See `docs/QA.md` for actual checks and limits. This remains an early visual prototype; the screen-to-hero transition can be refined further once you review the direction.

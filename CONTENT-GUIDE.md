# Updating the portfolio

The page order is desk → hero → certificates → projects → toolkit. Everything stays local until you decide otherwise.

## Certificates

Edit `src/data/portfolio.ts`. Add another entry to `certificates` and a glass card will appear automatically. Each item has `id`, `mark` (short course name), `title`, `description`, `status`, `file`, and `verifyUrl`.

Put your real certificate PDF in `public/certificates/`, then set `file` to `/certificates/your-file.pdf`. Only add `verifyUrl` if you have the actual verification URL. Empty strings leave links absent. The current card is an original presentation card, not a replica or substitute for the actual certificate.

## Projects

BlindSpot's confirmed description and tags are in `projects[0]`. Its illustration is original concept art, not a product screenshot. Update the description and dialog copy as the case study takes shape. The featured layout currently renders the first project; additional full project cards require extending `src/pages/index.astro` and its dialog handling. The CS50P final project has a separate preview row until its title, details, and URL are supplied.

Before adding a case study, collect the real problem, your contribution, stack actually used, screenshots, source URL, and demo URL. Do not add invented outcome metrics.

## Identity and toolkit

The shared data file holds your name, tagline, introduction, and `tools` list. The current hero's name styling and short about paragraph are also in `src/pages/index.astro`; update those if you change identity copy. Scene text reads the name from the data file. Tool symbols are decorative; extend their list in the page when adding tools.

## Scene and effects

`src/scripts/laptop-scene.ts` contains the original procedural desk, laptop, accessories, and camera route. `src/scripts/experience.ts` controls scrolling, the 3D toggle, reduced-motion fallback, project dialog, and glass-card tilt. `src/styles/global.css` defines appearance and mobile layouts.

No certificate file, repository URL, contact information, or project screenshot is included yet. Add your real assets when ready. No database or paid asset service is required.

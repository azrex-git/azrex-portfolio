# Dependencies and licenses

Record prepared **7 November 2026** from the implementation's installed package metadata and upstream primary sources. This document covers direct dependencies, not a full transitive dependency inventory.

## Package record

| Package | Installed exact version | Purpose | SPDX license identifier / upstream license |
|---|---|---|---|
| `astro` | `7.4.7` | HTML framework and build pipeline | `MIT` — [official license](https://github.com/withastro/astro/blob/main/LICENSE) |
| `three` | `0.187.0` | Procedural laptop and WebGL rendering | `MIT` — [official package metadata](https://github.com/mrdoob/three.js/blob/dev/package.json) |
| `gsap` | `3.15.1` | Motion sequencing | Custom, non-SPDX Standard No Charge GSAP License — [official terms](https://gsap.com/community/standard-license/), [package metadata](https://github.com/greensock/GSAP/blob/master/package.json) |
| `typescript` | `6.0.3` | Static type checking and language tooling | `Apache-2.0` — [official license](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) |
| `@types/three` | `0.187.0` | Three.js TypeScript declarations | `MIT` — DefinitelyTyped package license |
| `@astrojs/check` | `0.9.12` | Astro diagnostics | `MIT` — [upstream language-tools license](https://github.com/withastro/language-tools/blob/main/LICENSE) |

The version column records the implementation pins requested for this prototype. It is not independent proof of installation. `package.json` records the declared direct dependencies; `package-lock.json` records npm's resolved tree, and installed packages expose their own version and license metadata. Reconcile this table with those files after installation and whenever dependencies change.

To inspect the resolved direct packages after installing:

```sh
npm ls --depth=0
```

To inspect the declared package metadata without installing a different version, query a specific version, for example:

```sh
npm view astro@7.4.7 version license engines --json
```

Check each installed dependency's `engines` requirements when choosing Node.js. Preserve the lockfile so another installation can reproduce the resolved dependency tree. For a clean installation from an existing, synchronized lockfile, `npm ci` is also available.

## Cost and license distinctions

Astro, Three.js, TypeScript, and Astro's checking tools use the open-source licenses identified above. Their source licenses do not impose a subscription to use the libraries. Preserve the relevant notices when distributing software that includes them.

GSAP is available without a usage charge for the website uses described in its own license, including an ordinary portfolio. It uses custom terms with restrictions concerning competing visual animation builders. Do not describe GSAP as MIT-licensed or assume that free of charge means an unrestricted open-source license. Its current upstream package `license` field is descriptive text pointing to the GSAP terms, not a standard SPDX identifier. [GSAP license](https://gsap.com/community/standard-license/), [upstream metadata](https://github.com/greensock/GSAP/blob/master/package.json)

This prototype does not require a paid 3D model, an image-generation subscription, a database subscription, or an MCP connection to run its procedural scene. Existing coding-assistant costs, optional future assets, domain registration, and hosting are separate from these library licenses.

## Assets and future changes

The 8 November realism update adds one locally served CC0 HDR environment, **Studio Small 08** by Sergej Majboroda / Poly Haven (1,508,872 bytes). See [SCENE-ASSETS.md](SCENE-ASSETS.md) for its source, license, checksum, product references and rendering notes. All device and desk geometry and other surface textures remain original code; no package dependencies were added.

The procedural laptop is authored in code. If external models, fonts, textures, sound, screenshots, or video are added later, record their creator, source URL, license, and any attribution requirement. A library's license does not grant rights to unrelated assets shown in its examples or documentation.

Keep new dependencies purposeful. Before adding a library, identify the feature it enables, check compatibility with the pinned toolchain, review its package source and license, and measure the effect on the browser bundle. Re-run the project's check and build commands after changes. Dependency installation alone does not establish compatibility, accessibility, performance, or successful QA.

Installed package metadata verified locally after npm installation. Astro 7.4.7 requires Node >=22.23.4 and npm >=9.6.5; this build was verified with Node 26.11.1 and npm 11.20.0. TypeScript 6.0.3 is pinned because the installed Astro checker supports TypeScript 5 and 6, not 7.

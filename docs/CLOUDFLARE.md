# Cloudflare hosting

This Astro site builds to static files. Cloudflare hosts the uploaded files independently of your computer. No localhost server or paid Worker plan is required for static asset serving.

Run commands from `outputs/portfolio-prototype`, the folder containing `package.json` and `wrangler.jsonc`.

## First deployment

1. Sign in at https://dash.cloudflare.com in your default browser. Confirm the `azrex.xyz` zone is Active.
2. Run `npx --yes wrangler@4.168.0 login` and approve Cloudflare's browser authorization.
3. Run `npm run build`.
4. Run `npx --yes wrangler@4.168.0 deploy`.

The configuration uploads only `dist/`, creates the `azrex-portfolio` Worker, and binds `azrex.xyz` as a custom domain. Cloudflare manages HTTPS. If a DNS conflict is reported, inspect the existing record before replacing it. The `www` hostname is not configured.

If login reports a missing CSRF cookie, sign in to the Cloudflare dashboard in the default browser first, then run the login command again.

## Future updates

Run `npm run build` followed by `npx --yes wrangler@4.168.0 deploy` from the same folder. Local edits and GitHub pushes alone do not update this direct deployment.

## Validation on 25 November 2026

- Astro production build passed.
- Wrangler deployment dry run passed.
- Largest built asset is approximately 4 MiB, below the 25 MiB per-file limit.
- Temporary scene QA page is absent from the build.
- OAuth login succeeded after browser sign-in. Deployment completed successfully.
- Live custom domain: https://azrex.xyz
- Worker URL: https://azrex-portfolio.akashjeet-portfolio-prototype.workers.dev
- Deployed version: `5671ab68-1fc6-4844-b66b-937de5f7c9dd`.
- Verified the HTTPS custom domain in the browser, including the fully loaded 3D desk scene; no browser warnings or errors were reported during the check. The shell DNS resolver had not yet picked up the new domain during verification, so availability may initially vary by network.

References: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ and https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

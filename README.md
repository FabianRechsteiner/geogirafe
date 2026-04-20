# vectormap-geogirafe

This repository is the GitHub-based, deploy-ready GeoGirafe frontend for the `vectormap.ch` project.

It is based on the upstream GeoGirafe viewer repository on GitLab:

- Upstream repository: `https://gitlab.com/geogirafe/gg-viewer`
- Upstream branch: `main`
- Deployment target: GitHub Pages
- Project style: stay as close to upstream as practical while keeping vectormap-specific runtime configuration and deployment inside this repository

## Repository model

This is not a clean-room rewrite and not a disconnected copy.

The repository now contains the upstream `gg-viewer` history merged into this Git repository so future updates can be pulled in through normal Git operations.

The intended split is:

- Upstream GeoGirafe source stays as untouched as practical
- Vectormap-specific runtime configuration lives in tracked repository files
- GitHub-specific deployment setup lives in `.github/workflows`
- Maintainer documentation lives in `README.md`

## Current status

The upstream baseline has been imported.

The repository now contains the first runnable Vectormap-specific runtime files:

- `public/config.json`
- `public/config.mobile.json`
- `public/themes.json`
- `public/styles/ch.vectormap.lightbasemap.json`

This first version is intentionally basemap-centric. It gives you a branded GeoGirafe shell with:

- a local Vectormap basemap configuration
- OpenStreetMap and SwissTopo vector-tile fallbacks
- a temporary GeoAdmin-based search endpoint
- a minimal local theme definition that can later be extended with real geodienste WMS, WMTS, and vector-tile layers

It is therefore runnable, but still only a first milestone and not yet the final vectormap deployment.

## Local development

### Requirements

- Node.js `>= 20.19.0`
- npm

### Install dependencies

```bash
npm ci
```

### Create the runtime configuration

The repository already ships with a project-specific `public/config.json`.

If you want to start from the example template instead, create `public/config.json` from:

```bash
cp public/config.example.json public/config.json
```

Then replace the placeholder values with your actual vectormap services.

### Start the local app

```bash
npm start
```

GeoGirafe runs locally on `https://app.localhost:8080`.

### Windows certificate note

The upstream project ships with development certificates. If needed on Windows:

```bash
npm run trust-default-dev-certs-win
```

## Runtime configuration

GeoGirafe loads `config.json` dynamically at runtime. That means:

- changing `public/config.json` does not require changing the source code
- you usually do not need to rebuild the app when only runtime configuration changes
- repository-specific integration should prefer `public/config.json` over source-level forks when possible

Tracked vectormap-specific files are primarily:

- `public/config.json`
- `public/config.mobile.json`
- `public/themes.json`
- `public/styles/ch.vectormap.lightbasemap.json`
- `.github/workflows/deploy-pages.yml`
- selected branding or project-owned assets that are intentionally different from upstream

## GitHub Pages deployment

The repository contains a GitHub Actions workflow for GitHub Pages deployment.

Deployment model:

- install dependencies with `npm ci`
- build the application with `npm run build`
- publish `dist/app` as the Pages artifact

The Vite configuration already uses `base: './'`, which is compatible with both:

- the default `username.github.io/repository` URL
- a later custom domain

If you add a custom domain later, add `public/CNAME` at that point.

## Upstream sync workflow

This repository is meant to stay close to the upstream GeoGirafe project.

The recommended update flow is:

```bash
git fetch upstream
git checkout agent
git merge upstream/main
```

After each upstream merge:

1. Resolve conflicts carefully, especially in repository-owned files such as `README.md`, `public/config.json`, and GitHub workflows.
2. Run the local verification steps.
3. Commit the merge result as its own logical change.

If later you want stronger automation for upstream updates, that can be added as a dedicated GitHub workflow. For now, the repository keeps the sync path simple and explicit.

## Build output

The production build output is written to:

```text
dist/app
```

That directory is the deployable static WebGIS artifact for GitHub Pages or any other static host.

## Notes about upstream behavior

`gg-viewer` is not a buildless project. It currently uses Vite, TypeScript, and a production build pipeline. This repository therefore accepts a minimal build step in order to stay compatible with upstream instead of forcing a no-build setup.

## References

- Upstream GeoGirafe viewer: `https://gitlab.com/geogirafe/gg-viewer`
- GeoGirafe website: `https://geogirafe.org/`
- GeoGirafe documentation: `https://doc.geogirafe.org/`

## License

Upstream code remains under the original Apache License, Version 2.0. Review the upstream `LICENSE` file for details.

# AGENT.md - Working Instructions for the Codex Agent

This repository is maintained with an autonomous coding agent.

## Project Context

- Project name: `vectormap-geogirafe`
- Goal: create a GitHub-hosted WebGIS frontend for the existing `vectormap.ch` work based as closely as practical on the GeoGirafe upstream project
- Primary upstream source: GeoGirafe on GitLab
- Deployment target: GitHub Pages
- Audience of this repository: internal maintainers
- Runtime target: frontend only, no own backend
- Backends and data services may come from external providers

## Core Strategy

- Treat the upstream GeoGirafe project as the baseline and preserve upstream compatibility where practical
- Prefer an approach that makes future upstream adoption simple and low-risk
- Repository-specific configuration for the final WebGIS may live here as long as it does not unnecessarily break upstream sync
- If there is a conflict between "stay close to upstream" and "custom project-specific behavior", the agent must make that tradeoff explicit

## Branch Policy

- All work MUST be done exclusively on the current working branch: `agent`
- Never modify files on `master` or `main`
- Never commit to `master`, `main`, or any other branch unless the user explicitly changes the branch policy
- Do not create additional branches unless the user explicitly asks for it
- Before making any file change, staging files, or creating a commit, the agent MUST verify the current branch
- If the current branch is not `agent`, the agent MUST stop and switch back before continuing
- This repository-specific branch rule overrides default agent habits

## Upstream Sync Policy

- The agent should structure the repository so that updates from the GitLab GeoGirafe upstream remain easy to apply
- Prefer simple Git-based sync strategies over manual copy-paste workflows
- If a direct fork is not technically possible across hosting providers, the agent should use the closest maintainable alternative and document it clearly
- The agent should avoid unnecessary divergence from upstream file structure unless required for GitHub Pages deployment or project-specific configuration
- Any sync workflow introduced here must be documented for maintainers in `README.md`

## Discovery-First Rule

- Before scaffolding substantial project code, the agent MUST clarify the remaining architectural decisions
- The agent MUST especially clarify:
  - which exact GitLab repository is the canonical upstream
  - whether this repository should be a Git mirror, a tracked customization layer, or a deploy-ready distribution repo
  - how GitHub Pages should publish the app
  - whether a build step is acceptable if upstream requires one
  - which external services should be wired in the first usable version
- Until these points are clear enough, the agent should limit itself to repo setup, documentation, and low-risk structural work

## Technology Rules

- Prefer no build step if and only if the chosen upstream-compatible setup supports it cleanly
- If upstream requires TypeScript compilation, bundling, or other build tooling, the agent may use the minimum necessary tooling instead of forcing a buildless setup
- Do not add a backend to this repository
- Do not introduce extra frameworks or infrastructure without a concrete need
- Prefer simple, readable configuration over clever automation

## MapLibre and Mapping Guidance

- For MapLibre-related tasks, load the relevant local skill files before implementation
- Use task-based skill selection:
  - `maplibre-tile-sources`: source and layer setup, basemap, labels, blank map debugging
  - `maplibre-pmtiles-patterns`: PMTiles workflows and static hosting patterns
  - `maplibre-mapbox-migration`: migration work from Mapbox GL JS to MapLibre GL JS
- Treat the skill guidance as the primary technical baseline unless the repository clearly requires another approach

## Commit Policy

- The agent MUST commit its own coherent changes
- Do not leave finished work uncommitted unless the user explicitly asks for that
- Prefer small, logically grouped commits that keep the repository usable

### Commit Message Rules

- Language: English only
- Use clear, concise, descriptive messages
- Prefer imperative mood

Examples:
- `Add project-specific agent instructions`
- `Document upstream sync strategy`
- `Add GitHub Pages deployment baseline`
- `Import GeoGirafe upstream baseline`
- `Configure vectormap project defaults`

## Documentation

- Maintain a practical `README.md`
- Document setup, sync workflow, deployment, and project-specific configuration
- Keep documentation developer-focused because this repository is primarily for internal maintainers

## Definition of Done

Work is considered complete for a given task when:

- The branch policy has been respected
- The requested change is implemented coherently
- Upstream compatibility impact has been considered and made explicit when relevant
- Documentation is updated where needed
- The change has been verified as far as the local environment allows
- The completed work has been committed unless the user asked otherwise

## Expected Behaviour

The agent is expected to:

- ask precise follow-up questions when architectural choices remain open
- recommend the simplest maintainable sync strategy
- stay as close to GeoGirafe upstream as practical
- keep repository customizations intentional and documented
- implement agreed changes autonomously once the open questions are resolved

# GeoGirafe

GeoGirafe is an flexible application to build an online geoportal.
This repository contains the web-viewer part of the project.

**Please note that GeoGirafe is at its very beginning, can strongly evolve and is therefore not intended for the moment to be used by people other than developers or contributors.**

# KISSSSS

GeoGirafe is based on the latest web standards (Web-Components), follow the KISSSSSS philosophy and is:
- Stupid: GeoGirafe is developed with pure Vanilla-Javascript. No complex framework like React or Angular is used.
- Simple: It contains only the core of a geoportal. A Map, a Treeview, and some other central components. Nothing useless.
- Stretchable: Although GeoGirafe contains only the essentials for a geoportal, it can easily be extended with custom web-components.
- Scalable: Base on a docker architecture, GeoGirafe is easily scalable by using any container orchestrator.
- Sure: Less dependencies also means less potential security problems.
- Stable: We do not want migrations from one version to another to take too much time or ressources. Stability is a key objective.

# Getting Started

Install dependencies and start the development server:

### On linux

```bash
npm install
npm run-script serve
```

On Windows:

### On Windows

```bash
npm install
npm run-script serve-win
```

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

# License

Not defined yet.
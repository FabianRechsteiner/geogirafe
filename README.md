# GeoGirafe

GeoGirafe is an flexible application to build online geoportals.
This repository contains the web-viewer part of the project.

**Please note that GeoGirafe is at its very beginning, can strongly evolve and is therefore not intended for the moment to be used by people other than developers or contributors.**

## Goal

The goal of GeoGirafe is to allow the easy implementation of a stable, efficient and secure geoportal. GeoGirafe is also meant to be easily extensible, by allowing users to integrate their own plugins.

As the main users of GeoGirafe do not necessarily have advanced skills in computer development, we wanted to have a learning curve as smooth as possible. This is why the project does not use the latest frameworks, and favours readable code over code corresponding to certain arbitrary "quality" criteria. GeoGirafe is therefore based on web standards (Vanilla Web Components), and limits the number of dependencies to other libraries.

## Development philosophy

GeoGirafe is developed according to the following principles:

- **KISS**: GeoGirafe is simple. It is developed with pure Vanilla-Javascript. No complex framework like React or Angular is used. If you know javascript, you can understand how it works.

- **DevSecOps**: Geogirafe is baking security in at every phase of the software lifecycle, in order to deliver a secure-by-design application.

- **Reactivity**: GeoGirafe is meant to be responsive, resilient, elastic and message driven according to the [Reactive Manifesto](https://www.reactivemanifesto.org).

- **Agility**: GeoGirafe is being developed according to the Agile methodology. We value individuals collaboration, and change responsiveness more than processes, tools and plans.

# Getting Started

Install dependencies and start the development server:

### On linux

```bash
npm install
npm run-script serve
```

### On Windows

```bash
npm install
npm run-script serve-win
```

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

# License

Not defined yet.
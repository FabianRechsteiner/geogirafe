[![Pipeline Status](https://gitlab.com/geogirafe/gg-viewer/badges/main/pipeline.svg)](https://gitlab.com/geogirafe/gg-viewer/-/pipelines)
[![Docker Pulls](https://img.shields.io/docker/pulls/geogirafe/viewer.svg)](https://hub.docker.com/r/geogirafe/viewer/)
![GitLab Contributors](https://img.shields.io/gitlab/contributors/geogirafe/gg-viewer)
![GitLab Issues](https://img.shields.io/gitlab/issues/open-raw/geogirafe/gg-viewer)
![GitLab Merge Requests](https://img.shields.io/gitlab/merge-requests/open-raw/geogirafe/gg-viewer)
![GitLab last commit](https://img.shields.io/gitlab/last-commit/geogirafe/gg-viewer)
![GitLab License](https://img.shields.io/gitlab/license/geogirafe/gg-viewer)

# GeoGirafe

GeoGirafe is an flexible application to build online geoportals.
This repository contains the web-viewer part of the project.

**Please note that GeoGirafe is at its very beginning, can strongly evolve and is therefore not intended for the moment to be used by people other than developers or contributors.**

A demo instance of GeoGirafe can be tested here: [https://geogirafe.paloo.fr](https://geogirafe.paloo.fr).

## Goal

The goal of GeoGirafe is to allow the easy implementation of a stable, efficient and secure geoportal. GeoGirafe is also meant to be easily extensible, by allowing users to integrate their own plugins.

As the main users of GeoGirafe do not necessarily have advanced skills in computer development, we wanted to have a learning curve as smooth as possible. This is why the project does not use the latest frameworks, and favours readable code over code corresponding to certain arbitrary "quality" criteria. GeoGirafe is therefore based on web standards (Vanilla Web Components), and limits the number of dependencies to other libraries.

## Development philosophy

GeoGirafe is developed according to the following principles:

- **KISS**: GeoGirafe is simple. It is developed with pure Vanilla-Javascript. No complex framework like React or Angular is used. If you know javascript, you can understand how it works.

- **DevSecOps**: Geogirafe is baking security in at every phase of the software lifecycle, in order to deliver a secure-by-design application.

- **Reactivity**: GeoGirafe is meant to be responsive, resilient, elastic and message driven according to the [Reactive Manifesto](https://www.reactivemanifesto.org).

- **Agility**: GeoGirafe is being developed according to the Agile methodology. We value individuals collaboration, and change responsiveness more than processes, tools and plans.

- **Accessibility**: GeoGirafe is doing its best to make web content more accessible to individuals with disabilities: [View Wave Report](https://wave.webaim.org/report#/https://geogirafe.paloo.fr).

# Configure GeoGirafe

The complete configuration of the application is done in the file `static/config.json`.  
This configuration will be loaded dynamically when the applications starts.  
Therefore it is not necessary to rebuild the project when you modify this file.

# Work with GeoGirafe

## Development

First, install [Node-18](https://nodejs.org/en/download/).

Then, clone the Repository:

```
git clone https://gitlab.com/geogirafe/gg-viewer.git
```

Now you can build the application, and start the development server:

### On linux

```bash
npm install
npm run serve
```

### On Windows

```bash
npm install
npm run serve-win
```

## Build for Production

### On linux

```bash
npm install
npm run-script build
```

### On Windows

```bash
npm install
npm run-script build-win
```

### Using Docker

```bash
docker run -v $PWD:/src node:18-slim bash -c "cd /src && npm install && npm run build"
```

## Deployment

The deployment can be done in 2 ways:

### Using an existing WebServer

After the build, everything that needs to be deployed is in the `public` directory.  
Copy the `public` directory content to any webserver, for example in the `htdocs` directory.

### Using Docker

When the project has been built, you can build a docker image that will contains the application:
```
docker build -t <your_name>/gg-viewer -f buildtools/Dockerfile .
```

Then, ou can start it:
```
docker run -p 8080:80 -p 8443:443 <your_name>/gg-viewer
```

# Contributing

Pull requests are welcome.  
For major changes, please open an issue first to discuss what you would like to change.

# License

Not defined yet.
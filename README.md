[![Pipeline Status](https://gitlab.com/geogirafe/gg-viewer/badges/main/pipeline.svg)](https://gitlab.com/geogirafe/gg-viewer/-/pipelines)
[![Docker Pulls](https://img.shields.io/docker/pulls/geogirafe/viewer.svg)](https://hub.docker.com/r/geogirafe/viewer/)

![GitLab Contributors](https://img.shields.io/gitlab/contributors/geogirafe/gg-viewer)
![GitLab Issues](https://img.shields.io/gitlab/issues/open-raw/geogirafe/gg-viewer)
![GitLab Merge Requests](https://img.shields.io/gitlab/merge-requests/open-raw/geogirafe/gg-viewer)
![GitLab last commit](https://img.shields.io/gitlab/last-commit/geogirafe/gg-viewer)

![GitLab License](https://img.shields.io/gitlab/license/geogirafe/gg-viewer)

# GeoGirafe

GeoGirafe is a flexible application to build online geoportals.
This repository contains the web-viewer part of the project.

**Please note that GeoGirafe is at its very beginning, can strongly evolve and is therefore not intended for the moment to be used by people other than developers or contributors.**

The project documentation can be found here: https://doc.geomapfish.dev.  
The demo instances of GeoGirafe can be tested here: https://demo.geomapfish.dev.

## Goal

The goal of GeoGirafe is to allow the easy implementation of a stable, efficient and secure geoportal. GeoGirafe is also meant to be easily extensible, by allowing users to integrate their own plugins.

As the main users of GeoGirafe do not necessarily have advanced skills in computer development, we wanted to have a learning curve as smooth as possible. This is why the project does not use the latest frameworks and favours readable code over code corresponding to certain arbitrary "quality" criteria. GeoGirafe is therefore based on web standards (Vanilla Web Components) and limits the number of dependencies to other libraries.

## Development philosophy

GeoGirafe is developed according to the following principles:

- **KISS**: GeoGirafe is simple. It is developed with pure Vanilla-JavaScript. No complex framework like React or Angular is used. If you know JavaScript, you can understand how it works.

- **DevSecOps**: GeoGirafe is baking security in at every phase of the software lifecycle, in order to deliver a secure-by-design application. Quality, readability, reliability and security are checked by the SonarCloud platform during our continuous integration processes: [View SonarCloud Reports](https://sonarcloud.io/project/overview?id=geogirafe_gg-viewer)

- **Reactivity**: GeoGirafe is meant to be responsive, resilient, elastic and message driven according to the [Reactive Manifesto](https://www.reactivemanifesto.org).

- **Agility**: GeoGirafe is being developed according to the Agile methodology. We value individuals collaboration, and change responsiveness more than processes, tools and plans.

- **Accessibility**: GeoGirafe is doing its best to make web content more accessible to individuals with disabilities: [View Wave Report](https://wave.webaim.org/report#/https://demo.geomapfish.dev/mapbs/).

## Architecture

Architectural choices made for the GeoGirafe project, including strategic objectives and technological choices, is explained in details here: https://doc.geomapfish.dev/docs/architecture.

# Getting Started

If you want to get started with GeoGirafe, the simplest way is to use the Docker Container : https://hub.docker.com/r/geogirafe/viewer.
This will allow you to get a running instance of GeoGirafe with minimum effort.
Please follow the small documentation in the Docker Hub Readme.

# Work with GeoGirafe

## Development

First, install [Node 20](https://nodejs.org/en/download/).

Then, clone the Repository:

```
git clone https://gitlab.com/geogirafe/gg-viewer.git
```

Now you can build the application, and start the development server:

```bash
npm install
npm start
```

## Debugging using VSCode

If you are using VSCode, there is a preconfigured debugging configuration in the `.vscode` directory.  
After you've started the application in development mode, just press `F5`, and VSCode will attach to the running process. You will then be able to debug your code.

## Configuration

The complete configuration of the application is done in the file `config.json`.
This configuration will be loaded dynamically when the application starts.
Therefore it is not necessary to rebuild the project when you modify this file.

The file `config.json` does not exists by default.
The simplest way to create one is to pick up an existing one in the _demo_ directory, and to adapt the content to your needs.

You can also preconfigure GeoGirafe for an existing demo configuration by using:

### On Linux

```bash
npm run configure-demo <environment>
```

### On Windows

```bash
npm run configure-demo-win <environment>
```

This will automatically copy the `config.yaml` file in the right place, and download the needed Mock objects.

> Please note that today, the GeoGirafe Viewer is using a backend based on GeoMapFish.
> The services you will have to use in your configuration must therefore be compliant with GeoMapFish.

## Build for Production

```bash
npm install
npm run build
```

This will output a complete built GeoGirafe app which can be served by a Webserver
easily in the [dist/app](dist/app) folder.

You can try the built asset with (you need docker for this example!):

```bash
docker run --rm -p 8088:80 -v $(pwd)/dist/app:/usr/share/nginx/html nginx:latest
```

This will spin up an NGINX and you can access it on [localhost:8088](http://localhost:8088).

Press `CTRL+C` to stop the container.

## Build the NPM Package

Make sure to have run the command `npm login` before at least once

### Build the library

```bash
npm install
npm run build-lib
```

This will output (beside others) a transpiled version of GeoGirafe's library part into [dist/lib](dist/lib).

### Publish Lib Package to [npmjs.com](https.//npmjs.com)

```bash
npm run publish-lib --access public
```

## Build the Android Application

Make sure you have build the application for production before with `npm run build`.  
The file `config.json` present in the `dist\app` directory will be used.

### Build the library

```bash
npm run build-apk
```

This will output an APK package of GeoGirafe into [dist/apk](dist/apk).

## Deployment

The deployment can be done in 2 ways:

### Using an existing WebServer

After the build, everything that needs to be deployed is in the `public` directory.
Copy the `public` directory content to any webserver, for example in the `htdocs` directory.

### Using Docker

When the project has been built, you can build a docker image that will contains the application:

```
docker build -t <your_name>/viewer -f buildtools/Dockerfile dist
```

Then, you can start it:

```
docker run -p 8080:80 -p 8443:443 <your_name>/viewer
```

# Contributing

Merge-Requests are welcome.
For major changes, please open an issue first to discuss what you would like to change.  
Contribution guidelines are available here: [CONTRIBUTING.md](CONTRIBUTING.md).  
**Please read them before contributing.**

# License

Apache License, Version 2.0

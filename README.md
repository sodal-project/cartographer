# Cartographer

***NOTICE: This is an early stage project and should only be operated in secure, trusted environments***

Cartographer is the open-source reference implementation of Sodal's Persona Graph model for agency management. Cartographer demonstrates how persona graphs enable discovery and management of identities and resources (and associated collaboration opportunities and risks) *without* the need for comprehensive controls or top-down policy enforcement.

Cartographer is a self-contained application that can run locally or on docker-compatible cloud infrastructure. Cartographer uses a Node/Express server. The server stores graph data in a Neo4j database and object data in a MongoDB database.

## Table of Contents

- [Modules](docs/modules.md) - developing and working with modules

## Setup

1. Install [Docker](https://docker.com) for your platform.
2. Copy the .env.example file to .env

The default configuration uses ports **3000**, **7474**, **7687**, **28000**

## Start

This terminal command will start the app and database. The first time it runs it will need to download files which may take several minutes.

``` bash
docker-compose up
```

The processes will run in a single terminal window (they are color coded). You can view the front end by visiting <http://localhost:3000> in your browser window.

## Architecture

The open-source "Core" system offers fundamental tools for working with a graph database and includes MongoDB for handling additional data. It supports creating modules that ingest, format, store, and display graph data.

## Components

- The components folder contains handlebars partials
- There is a folder called icons that contains SVG icons
- Partials should not contain a script tag with javascript as that will load multiple times, instead functions needed by components should be placed in the main.js file.

## Auth

- Using JWT

### Generating secret keys for .env

To generate a value for the ACCESS_TOKEN_SECRET and the REFRESH_TOKEN_SECRET in .env

  1. Open a terminal window and type node followed by the enter key to enter the Node REPL
  2. Run this `require('crypto').randomBytes(64).toString('hex')`
  3. Use the resulting value for ACCESS_TOKEN_SECRET and run again for the REFRESH_TOKEN_SECRET

## Dependencies

### Client Dependencies

Name | Description | License
---- | ----------- | -------
[tailwind](https://www.tailwindcss.com)|A utility-first CSS framework|MIT
[alpine js](http://https://alpinejs.dev)|A framework for composing behavior directly in your markup.|MIT
[htmx](https://https://htmx.org)|Access to AJAX and web sockets directly in HTML using attributes|Zero-Clause BSD

### Server Dependencies

Name | Description | License
---- | ----------- | -------
[dotenv](https://github.com/motdotla/dotenv#readme)|Loads environment variables from .env file|BSD-2-Clause
[express](http://expressjs.com/)|Fast, unopinionated, minimalist web framework|MIT
[express-handlebars](https://github.com/express-handlebars/express-handlebars)|A Handlebars view engine for Express which doesn't suck.|BSD-3-Clause
[mongodb](https://github.com/mongodb/node-mongodb-native)|The official MongoDB driver for Node.js|Apache-2.0
[multer](https://github.com/expressjs/multer)|Middleware for handling multipart/form-data, used for uploading files|MIT
[neo4j-driver](https://github.com/neo4j/neo4j-javascript-driver#readme)|Official Neo4j driver for JavaScript|Apache-2.0
[nodemon](https://nodemon.io)|Simple monitor script for use during development of a Node.js app.|MIT
[sanitize-filename](https://github.com/parshap/node-sanitize-filename#readme)|Sanitize a string to be safe for use as a filename|WTFPL, ISC

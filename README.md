# Matrix Light Control

Matrix Light Control is a web-based interface for creating, saving, previewing, and playing LED matrix animations. The project is split into three main parts:

- `frontend` - static website interface
- `backend` - Node.js/Express API with SQLite storage
- `MCU` - ESP32/microcontroller firmware

This README focuses mainly on launching and understanding the frontend/backend side.

## Table of Contents

- [Author](#author)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [First-Time Setup](#first-time-setup)
- [Running Locally](#running-locally)
- [Website Pages](#website-pages)
- [Project Organization](#project-organization)
- [Database API](#database-api)
- [ESP32 URL](#esp32-url)
- [SQLite Database](#sqlite-database)
- [Troubleshooting](#troubleshooting)
- [Notes](#notes)

## Author

- **Author:** Khondoker Fardin Hoque
- **Year:** 2026
- **Project:** Matrix Light Control
- **Context:** Web Engineering project for controlling, creating, saving, and playing LED matrix animations through a local website, database API, and ESP32 firmware.

## Project Structure

```text
Code/
|-- mlc.js
|-- README.md
|-- backend/
|   |-- index.js
|   |-- database.db
|   |-- package.json
|   |-- express/
|   |   |-- app.js
|   |   |-- helpers.js
|   |   `-- routes/
|   |       |-- animations.js
|   |       `-- status.js
|   `-- sequelize/
|       |-- index.js
|       |-- extra-setup.js
|       `-- models/
|           |-- animation.model.js
|           `-- status.model.js
|-- frontend/
|   |-- index.html
|   |-- createAniForm.html
|   |-- createAni.html
|   |-- savedAni.html
|   |-- drawLive.html
|   |-- javascripts/
|   |-- styles/
|   `-- images/
`-- MCU/
```

The project now follows the same high-level split as the course example: a simple static `frontend` folder and a Node.js `backend` folder.

## Requirements

- Node.js
- npm
- A browser
- ESP32 device, only needed for live hardware control

## First-Time Setup

From the `Code/backend` folder, install backend dependencies:

```bash
npm install
```

This installs packages such as `express`, `cors`, `body-parser`, and `sqlite3`.

## Running Locally

From the `Code` folder, run:

```bash
node mlc.js
```

The launcher will:

- start the database API at `http://localhost:3000`
- start the website server at `http://localhost:5500`
- open `http://localhost:5500/index.html` in the browser

To stop the project, press `Ctrl+C` in the terminal running `mlc.js`.

## Website Pages

- `frontend/index.html` - homepage and connection controls
- `frontend/createAniForm.html` - animation setup form
- `frontend/createAni.html` - frame editor for creating animations
- `frontend/savedAni.html` - saved animation browser/player
- `frontend/drawLive.html` - live matrix drawing page

## Project Organization

The frontend is intentionally simple and close to the course example:

- `frontend/*.html` - website pages
- `frontend/javascripts/` - page behavior and API calls
- `frontend/styles/` - CSS files
- `frontend/images/` - image assets

The backend follows the course example structure:

- `backend/index.js` - backend entry point
- `backend/express/app.js` - Express app setup
- `backend/express/routes/` - route/controller logic
- `backend/sequelize/` - database connection and model layer
- `backend/sequelize/models/` - database access logic

## Database API

The backend runs on `http://localhost:3000`.

Main endpoints:

- `GET /api/status` - check database/API status
- `GET /api/host-ip` - get host IP for ESP32 communication
- `GET /check-name?name=...` - check whether an animation name already exists
- `POST /submit` - save a new animation
- `GET /animations` - load saved animations
- `GET /animations/:id` - load one animation
- `DELETE /animations/:id` - delete an animation

## ESP32 URL

The ESP32 URL is not hard-coded. On the homepage, click the ESP32 connection button and paste the current ESP32 URL, for example:

```text
http://192.168.1.42
```

If you paste only the IP address, the website automatically adds `http://`.

The URL is saved in browser `localStorage`, so it is remembered until changed or cleared.

## SQLite Database

The SQLite database file is:

```text
backend/database.db
```

The table is created automatically by `backend/sequelize/index.js` if it does not already exist. Missing columns such as `reverseAnimation` and `pixels` are also added automatically.

## Troubleshooting

### `node mlc.js` cannot find the website or database

Make sure `mlc.js` is directly inside the `Code` folder:

```text
Code/mlc.js
Code/backend/index.js
Code/frontend/index.html
```

### Backend dependencies are missing

Run:

```bash
cd backend
npm install
```

### Port already in use

The project uses:

- website: `5500`
- database API: `3000`

Close any other app using those ports, then run `node mlc.js` again.

### GitHub Pages website cannot load saved animations

Make sure the backend is running on the same computer as the browser:

```bash
cd backend
npm install
npm start
```

Then reload the GitHub Pages website.

### ESP32 connection fails

- Check that the ESP32 is powered on.
- Check that the pasted URL/IP is correct.
- Make sure the computer and ESP32 are on the same network.
- Click the ESP32 connection button again and enter the new URL.

## Notes

- The project is intended for local development/demo usage.
- The database is a local SQLite file, not a replicated or cloud-hosted database.
- The launcher is dependency-free and uses Node.js built-in modules for serving the website.

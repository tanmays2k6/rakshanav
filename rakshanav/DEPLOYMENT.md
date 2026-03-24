# Deployment Guide

## Recommended Setup

Deploy the frontend and backend separately:

- Frontend: Vercel or Render Static Site
- Backend: Render Web Service

The current frontend does not depend on the Express API for the main demo flow, so you can deploy the frontend alone if you need a fast demo URL.

## Frontend Only

### Vercel

1. Import the repository into Vercel.
2. Set the project root to `rakshanav/`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`

### Render Static Site

1. Create a new Static Site in Render.
2. Root directory: `rakshanav`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`

## Backend

### Render Web Service

1. Create a new Web Service in Render.
2. Root directory: `rakshanav/server`
3. Build command: `npm install`
4. Start command: `npm start`

The backend now reads `PORT` from the hosting platform automatically.

## One-File Render Blueprint

This repo includes `render.yaml`, so Render can create both services from one blueprint:

- Static frontend: `rakshanav-web`
- Express backend: `rakshanav-api`

## Notes

- Backend storage is in-memory only. Reports reset whenever the backend restarts.
- Live geocoding and routing in the frontend use public OpenStreetMap and OSRM endpoints from the browser.
- If you are in a hurry for judging, deploy the frontend first. That gives you the main product demo immediately.

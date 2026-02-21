# Fleet Management System

A full-stack application for managing fleets, drivers, and trips.

## Project Structure

- `fleet-api/`: Node.js/Express backend integrated with Supabase.
- `fleet_frontend/`: React/Vite frontend using Tailwind CSS and Lucide icons.

## Setup

### Backend (`fleet-api`)
1. Navigate to `fleet-api/`.
2. Run `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Run `npm start`.

### Frontend (`fleet_frontend`)
1. Navigate to `fleet_frontend/`.
2. Run `npm install`.
3. Run `npm run dev`.

## Deployment
The frontend is configured to proxy `/api` requests to `http://localhost:5000` by default.
For production build, run `npm run build` in `fleet_frontend/`.

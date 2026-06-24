# Dead Mile Auction Sniper

This platform matches unused fleet capacity (deadhead miles) with paying freight loads in real time.

## Project Structure

- `frontend/`: Vite + React application
- `backend/`: Node.js + Express API

## Prerequisites

- Node.js v24+
- `team-db` CLI (for Turso database sync)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The backend will run on port 8000.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Database Schema

The application uses the shared team database via `team-db`. The following tables are used:
- `fleet_trucks`: Stores truck capacity and availability.
- `freight_loads`: Stores available freight loads.
- `matches`: Stores potential matches between trucks and loads.
- `users`: User accounts and roles.

# FlightTracker

Real-time aircraft tracker with React, Leaflet, Node.js, Socket.io, Tailwind CSS, and OpenSky.

## Local Development

Create `.env` from `.env.example` and add your OpenSky credentials:

```env
PORT=4000
POLL_INTERVAL_MS=10000
CLIENT_ORIGIN=http://127.0.0.1:5173
VITE_API_URL=
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
```

Run the app:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`.

## Deployment

Netlify can host the React frontend, but it does not run the persistent Express + Socket.io backend from `server/index.js`.

Deploy the backend separately on a Node host such as Render, Railway, Fly.io, or a VPS.

Backend environment variables:

```env
PORT=4000
POLL_INTERVAL_MS=10000
CLIENT_ORIGIN=https://flighttracker1.netlify.app
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
```

Backend start command:

```bash
npm start
```

Frontend environment variable in Netlify:

```env
VITE_API_URL=https://your-backend-host.example.com
```

After setting `VITE_API_URL`, redeploy the Netlify site.

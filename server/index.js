import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { demoFlights } from "./sampleFlights.js";

const PORT = Number(process.env.PORT || 4000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 10000);
const OPENSKY_URL = "https://opensky-network.org/api/states/all";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
    methods: ["GET"]
  }
});

let latestSnapshot = {
  flights: seedDemoFlights(),
  source: "demo",
  updatedAt: new Date().toISOString(),
  error: null
};

function normalizeOpenSkyState(state) {
  const [
    icao24,
    callsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    sensors,
    geoAltitude
  ] = state;

  if (latitude == null || longitude == null || onGround) return null;

  return {
    id: icao24,
    callsign: callsign?.trim() || icao24.toUpperCase(),
    originCountry,
    latitude,
    longitude,
    altitudeMeters: Math.round(geoAltitude ?? baroAltitude ?? 0),
    speedMs: Math.round(velocity ?? 0),
    heading: Math.round(trueTrack ?? 0),
    verticalRate: Math.round(verticalRate ?? 0),
    lastContact: lastContact ? new Date(lastContact * 1000).toISOString() : null,
    timePosition: timePosition ? new Date(timePosition * 1000).toISOString() : null,
    sensors: Array.isArray(sensors) ? sensors.length : 0
  };
}

function seedDemoFlights() {
  const now = Date.now();
  return demoFlights.map((flight, index) => ({
    ...flight,
    latitude: flight.latitude + Math.sin(now / 90000 + index) * 0.08,
    longitude: flight.longitude + Math.cos(now / 100000 + index) * 0.12,
    heading: (flight.heading + Math.round((now / 1000 / 6) % 360)) % 360,
    lastContact: new Date(now - index * 1200).toISOString(),
    timePosition: new Date(now - index * 900).toISOString()
  }));
}

async function fetchOpenSkyFlights() {
  const headers = {};
  if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
    const token = Buffer.from(
      `${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`
    ).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  const response = await fetch(OPENSKY_URL, { headers });
  if (!response.ok) {
    throw new Error(`OpenSky returned ${response.status}`);
  }

  const payload = await response.json();
  const flights = (payload.states || [])
    .map(normalizeOpenSkyState)
    .filter(Boolean)
    .sort((a, b) => b.altitudeMeters - a.altitudeMeters)
    .slice(0, 220);

  return flights;
}

async function updateFlights() {
  try {
    const flights = await fetchOpenSkyFlights();
    latestSnapshot = {
      flights: flights.length ? flights : seedDemoFlights(),
      source: flights.length ? "opensky" : "demo",
      updatedAt: new Date().toISOString(),
      error: flights.length ? null : "OpenSky did not return usable airborne states."
    };
  } catch (error) {
    const detail = error.cause?.code ? `${error.message}: ${error.cause.code}` : error.message;
    latestSnapshot = {
      flights: seedDemoFlights(),
      source: "demo",
      updatedAt: new Date().toISOString(),
      error: detail
    };
  }

  io.emit("flights:update", latestSnapshot);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    source: latestSnapshot.source,
    flights: latestSnapshot.flights.length,
    updatedAt: latestSnapshot.updatedAt
  });
});

app.get("/api/flights", (req, res) => {
  res.json(latestSnapshot);
});

io.on("connection", (socket) => {
  socket.emit("flights:update", latestSnapshot);
});

httpServer.listen(PORT, () => {
  console.log(`FlightTracker backend listening on http://127.0.0.1:${PORT}`);
  updateFlights();
  setInterval(updateFlights, POLL_INTERVAL_MS);
});

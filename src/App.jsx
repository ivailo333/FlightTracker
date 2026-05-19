import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Gauge,
  Plane,
  Radio,
  RotateCcw,
  Satellite,
  Search,
  Signal,
  SlidersHorizontal,
  Wifi,
  WifiOff
} from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { formatAltitude, formatCoordinate, formatSpeed, formatTime, metersToFeet, msToKnots } from "./lib/formatters";
import { apiBaseUrl, createFlightSocket } from "./lib/socket";

const socket = createFlightSocket();

const center = [43.7, 23.9];

function FitSelected({ flight }) {
  const map = useMap();

  useEffect(() => {
    if (flight) {
      map.flyTo([flight.latitude, flight.longitude], Math.max(map.getZoom(), 6), {
        duration: 0.8
      });
    }
  }, [flight, map]);

  return null;
}

function aircraftIcon(flight, selected) {
  const color = selected ? "#ffb84d" : "#4ce7ff";
  return L.divIcon({
    className: "aircraft-marker",
    html: `<div class="aircraft-glyph ${selected ? "selected" : ""}" style="--heading:${flight.heading || 0}deg; --plane-color:${color}">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 4 42 28 60 36 60 43 39 39 35 58 29 58 25 39 4 43 4 36 22 28 32 4Z" />
      </svg>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

function FlightMap({ flights, selectedId, onSelect }) {
  const selectedFlight = flights.find((flight) => flight.id === selectedId);

  return (
    <MapContainer center={center} zoom={5} minZoom={3} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitSelected flight={selectedFlight} />
      {flights.map((flight) => {
        const position = [flight.latitude, flight.longitude];
        const trail = [
          [flight.latitude - Math.cos((flight.heading || 0) * Math.PI / 180) * 0.45, flight.longitude - Math.sin((flight.heading || 0) * Math.PI / 180) * 0.45],
          position
        ];

        return (
          <Fragment key={flight.id}>
            <Polyline positions={trail} pathOptions={{ color: flight.id === selectedId ? "#ffb84d" : "#4ce7ff", weight: 2, opacity: 0.5 }} />
            <Marker
              position={position}
              icon={aircraftIcon(flight, flight.id === selectedId)}
              eventHandlers={{ click: () => onSelect(flight.id) }}
            >
              <Popup>
                <strong>{flight.callsign}</strong>
                <br />
                {formatAltitude(flight.altitudeMeters)} / {formatSpeed(flight.speedMs)}
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}

function Metric({ icon: Icon, label, value, tone = "cyan" }) {
  return (
    <div className="metric">
      <div className={`metric-icon metric-${tone}`}>
        <Icon size={17} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function App() {
  const [snapshot, setSnapshot] = useState({ flights: [], source: "loading", updatedAt: null, error: null });
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [minAltitude, setMinAltitude] = useState(0);
  const [minSpeed, setMinSpeed] = useState(0);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("flights:update", (nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setSelectedId((current) => current ?? nextSnapshot.flights?.[0]?.id ?? null);
    });

    fetch(`${apiBaseUrl}/api/flights`)
      .then((response) => response.json())
      .then((data) => setSnapshot(data))
      .catch(() => {});

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("flights:update");
    };
  }, []);

  const filteredFlights = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return snapshot.flights.filter((flight) => {
      const altitudeOk = metersToFeet(flight.altitudeMeters) >= minAltitude;
      const speedOk = msToKnots(flight.speedMs) >= minSpeed;
      const queryOk =
        !normalizedQuery ||
        flight.callsign.toLowerCase().includes(normalizedQuery) ||
        flight.originCountry.toLowerCase().includes(normalizedQuery);
      return altitudeOk && speedOk && queryOk;
    });
  }, [snapshot.flights, query, minAltitude, minSpeed]);

  const selectedFlight =
    filteredFlights.find((flight) => flight.id === selectedId) ||
    filteredFlights[0] ||
    snapshot.flights[0];

  useEffect(() => {
    if (selectedFlight && selectedFlight.id !== selectedId) {
      setSelectedId(selectedFlight.id);
    }
  }, [selectedFlight, selectedId]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <Plane size={24} />
          </div>
          <div>
            <h1>FlightTracker</h1>
            <p>Проследяване в реално време</p>
          </div>
        </div>

        <section className="status-card">
          <div className="status-line">
            <span className={connected ? "live-dot" : "offline-dot"} />
            <span>{connected ? "WebSocket връзка активна" : "Изчакване на връзка"}</span>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>
          <div className="status-grid">
            <div>
              <p>Самолети</p>
              <strong>{filteredFlights.length}</strong>
            </div>
            <div>
              <p>Източник</p>
              <strong>{snapshot.source === "opensky" ? "OpenSky" : "Демо"}</strong>
            </div>
            <div>
              <p>Обновено</p>
              <strong>{formatTime(snapshot.updatedAt)}</strong>
            </div>
          </div>
          {snapshot.error ? <p className="source-note">OpenSky fallback: {snapshot.error}</p> : null}
        </section>

        <section className="control-block">
          <div className="section-title">
            <SlidersHorizontal size={17} />
            <span>Филтри</span>
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Позивна или държава"
            />
          </label>
          <label className="range-control">
            <span>Мин. височина</span>
            <strong>{minAltitude.toLocaleString("bg-BG")} ft</strong>
            <input
              type="range"
              min="0"
              max="45000"
              step="1000"
              value={minAltitude}
              onChange={(event) => setMinAltitude(Number(event.target.value))}
            />
          </label>
          <label className="range-control">
            <span>Мин. скорост</span>
            <strong>{minSpeed.toLocaleString("bg-BG")} kt</strong>
            <input
              type="range"
              min="0"
              max="600"
              step="25"
              value={minSpeed}
              onChange={(event) => setMinSpeed(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="flight-list">
          <div className="section-title">
            <Radio size={17} />
            <span>Активни полети</span>
          </div>
          <div className="flight-scroll">
            {filteredFlights.map((flight) => (
              <button
                className={`flight-row ${flight.id === selectedFlight?.id ? "active" : ""}`}
                key={flight.id}
                onClick={() => setSelectedId(flight.id)}
              >
                <span>
                  <strong>{flight.callsign}</strong>
                  <small>{flight.originCountry}</small>
                </span>
                <span>
                  <strong>{formatAltitude(flight.altitudeMeters)}</strong>
                  <small>{formatSpeed(flight.speedMs)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="map-stage">
        <div className="topbar">
          <div className="topbar-group">
            <Signal size={17} />
            <span>Live ADS-B поток</span>
          </div>
          <div className="topbar-group">
            <Satellite size={17} />
            <span>{snapshot.source === "opensky" ? "OpenSky Network" : "Симулационен режим"}</span>
          </div>
          <button className="icon-button" onClick={() => window.location.reload()} aria-label="Презареди">
            <RotateCcw size={17} />
          </button>
        </div>

        <div className="map-card">
          <FlightMap flights={filteredFlights} selectedId={selectedFlight?.id} onSelect={setSelectedId} />
        </div>

        {selectedFlight ? (
          <aside className="details-panel">
            <div className="details-head">
              <div>
                <p>Избран полет</p>
                <h2>{selectedFlight.callsign}</h2>
              </div>
              <div className="heading-chip">{selectedFlight.heading} deg</div>
            </div>
            <div className="metrics-grid">
              <Metric icon={Activity} label="Височина" value={formatAltitude(selectedFlight.altitudeMeters)} />
              <Metric icon={Gauge} label="Скорост" value={formatSpeed(selectedFlight.speedMs)} tone="amber" />
              <Metric icon={Plane} label="Вертикална скорост" value={`${selectedFlight.verticalRate} m/s`} tone={selectedFlight.verticalRate < 0 ? "red" : "green"} />
              <Metric icon={Satellite} label="Последен контакт" value={formatTime(selectedFlight.lastContact)} />
            </div>
            <dl className="details-list">
              <div>
                <dt>Държава</dt>
                <dd>{selectedFlight.originCountry}</dd>
              </div>
              <div>
                <dt>Координати</dt>
                <dd>
                  {formatCoordinate(selectedFlight.latitude)}, {formatCoordinate(selectedFlight.longitude)}
                </dd>
              </div>
              <div>
                <dt>ICAO24</dt>
                <dd>{selectedFlight.id}</dd>
              </div>
            </dl>
          </aside>
        ) : null}
      </section>
    </main>
  );
}

export default App;

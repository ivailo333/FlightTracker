import { io } from "socket.io-client";

export const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export function createFlightSocket() {
  return io(apiBaseUrl || "/", {
    path: "/socket.io",
    transports: ["websocket", "polling"]
  });
}

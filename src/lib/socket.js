import { io } from "socket.io-client";

export function createFlightSocket() {
  return io("/", {
    path: "/socket.io",
    transports: ["websocket", "polling"]
  });
}

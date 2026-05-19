export const metersToFeet = (meters = 0) => Math.round(meters * 3.28084);
export const msToKnots = (ms = 0) => Math.round(ms * 1.94384);

export function formatAltitude(meters) {
  return `${metersToFeet(meters).toLocaleString("bg-BG")} ft`;
}

export function formatSpeed(ms) {
  return `${msToKnots(ms).toLocaleString("bg-BG")} kt`;
}

export function formatCoordinate(value) {
  return Number(value).toFixed(4);
}

export function formatTime(value) {
  if (!value) return "няма данни";
  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

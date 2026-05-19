export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      },
      colors: {
        radar: {
          ink: "#061014",
          panel: "#0b171d",
          panel2: "#101f27",
          line: "#1c3841",
          cyan: "#4ce7ff",
          amber: "#ffb84d",
          green: "#6ff0a1",
          red: "#ff6b6b"
        }
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.32)"
      }
    }
  },
  plugins: []
};

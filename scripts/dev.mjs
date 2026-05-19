import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

const processes = [
  spawn(npm, ["run", "dev:server"], { stdio: "inherit", shell: isWindows }),
  spawn(npm, ["run", "dev:client"], { stdio: "inherit", shell: isWindows })
];

const stop = (code = 0) => {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) stop(code);
  });
}

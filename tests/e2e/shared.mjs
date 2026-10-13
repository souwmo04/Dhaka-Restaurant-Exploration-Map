// Helpers shared by the browser test suites.
import { existsSync } from "node:fs";

/** Chrome to drive: $CHROME_PATH, or the usual install location for this OS. */
export function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH to your Chrome/Chromium executable.");
  return found;
}

/** Software WebGL so the map renders in headless Chrome without a GPU. */
export const chromeArgs = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

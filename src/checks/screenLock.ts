import os from "os";
import { executeQuery } from "../utils/utils";
import { execSync } from "child_process";

export function checkScreenLock() {
  const system = os.platform();
  if (system === "darwin") {
    const result = executeQuery(
      "SELECT value FROM preferences WHERE domain = 'com.apple.screensaver' AND key = 'idleTime';"
    );
    if (result.length > 0 && result[0].value) {
      const time = parseInt(result[0].value);
      if (time > 0) {
        if (system === "darwin" || system === "win32") {
          return Math.floor(time / 60); // Convert seconds to minutes
        } else {
          return time; // Already in seconds
        }
      }
    }
  } else if (system === "win32") {
    const powerTimeout = execSync(
      `powercfg -q SCHEME_CURRENT SUB_VIDEO VIDEOIDLE | findstr "Current AC Power Setting Index"`
    ).toString();
    const timeout = powerTimeout
      .split("\n")
      .filter((line) => line.includes("Current AC Power Setting Index"))[0]
      .split(":")[1]
      .trim();
    return parseInt(timeout, 16) / 60;
  } else if (system === "linux") {
    let linuxDesktop = execSync("env | grep XDG_SESSION_DESKTOP")
      .toString()
      .split("=")?.[1]
      .trim();

    if (linuxDesktop === "ubuntu") {
      linuxDesktop = "gnome";
    }

    const lockEnabled = execSync(
      `gsettings get org.${linuxDesktop}.desktop.screensaver lock-enabled`
    )
      .toString()
      .trim();

    if (lockEnabled === "true") {
      // Get the idle time before the screen lock activates
      const idleDelaySeconds = execSync(
        `gsettings get org.${linuxDesktop}.desktop.session idle-delay`
      )
        .toString()
        .split(" ")?.[1];
      return parseInt(idleDelaySeconds, 10) / 60;
    }
  }
  return null;
}

export function screenLockToString(screenLockTime: number | null) {
  if (screenLockTime !== null) {
    const unit = "minutes";
    return `✅ Screen lock activates after ${screenLockTime} ${unit} of inactivity.`;
  }
  return "❌ Screen lock is not configured or is disabled.";
}

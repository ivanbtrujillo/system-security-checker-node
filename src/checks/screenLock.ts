import os from "os";
import { execPowershell, executeQuery } from "../utils/utils";
import { execSync } from "child_process";

function checkMacOsScreenLock() {
  const result = executeQuery(
    "SELECT value FROM preferences WHERE domain = 'com.apple.screensaver' AND key = 'idleTime';"
  );
  if (result.length > 0 && result[0].value) {
    const time = parseInt(result[0].value);
    if (time > 0) {
      return Math.floor(time / 60);
    }
  }
  return null;
}

function checkWindowsScreenLock() {
  let timeout;

  const haveBattery =
    execPowershell(
      "Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue"
    )
      .toString()
      .trim() !== "";
  const pluggedIn = execPowershell(
    `powercfg -q SCHEME_CURRENT SUB_VIDEO VIDEOIDLE | Select-String -Pattern "Current AC Power Setting Index"`
  ).toString();
  const pluggedInTimeout = pluggedIn.split(":")[1].trim();

  if (haveBattery) {
    const onBattery = execPowershell(
      `powercfg -q SCHEME_CURRENT SUB_VIDEO VIDEOIDLE | Select-String -Pattern "Current DC Power Setting Index"`
    ).toString();

    const onBatteryTimeout = onBattery.split(":")[1].trim();

    timeout = Math.min(
      parseInt(onBatteryTimeout, 16),
      parseInt(pluggedInTimeout, 16)
    );
  } else {
    timeout = parseInt(pluggedInTimeout, 16);
  }

  if (timeout === 0) {
    return null;
  }
  return timeout / 60;
}

function checkLinuxScreenLock() {
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
  return null;
}

export function checkScreenLock() {
  const system = os.platform();
  if (system === "darwin") {
    return checkMacOsScreenLock();
  } else if (system === "win32") {
    return checkWindowsScreenLock();
  } else if (system === "linux") {
    return checkLinuxScreenLock();
  }
  throw new Error("Unsupported operating system.");
}

export function screenLockToString(screenLockTime: number | null) {
  if (screenLockTime !== null) {
    const unit = "minutes";
    return `✅ Screen lock activates after ${screenLockTime} ${unit} of inactivity.`;
  }
  return "❌ Screen lock is not configured or is disabled.";
}

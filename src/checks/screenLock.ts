import os from "os";
import { execPowershell } from "../utils/utils";
import { execSync } from "child_process";

const getDisplaySleep = (mode: "Battery Power" | "AC Power") => {
  const output = execSync(
    `pmset -g custom | awk '/${mode}/,/displaysleep/ {if ($1 == "displaysleep") print $2}'`
  )
    .toString()
    .trim();
  return parseInt(output);
};
function checkMacOsScreenLock() {
  try {
    const output = execSync("sysadminctl -screenLock status 2>&1")
      .toString()
      .trim();

    if (output.includes("screenLock is off")) {
      return null;
    }

    const screenSaver =
      parseInt(
        execSync("defaults -currentHost read com.apple.screensaver idleTime")
          .toString()
          .trim()
      ) / 60;
    const displaySleepOnBattery = getDisplaySleep("Battery Power");
    const displaySleepOnAC = getDisplaySleep("AC Power");

    let maxTimeoutMinutes = Math.max(
      screenSaver,
      displaySleepOnAC,
      displaySleepOnBattery
    );

    if (output.includes("screenLock delay is immediate")) {
      return maxTimeoutMinutes || null;
    }

    const match = output.match(/screenLock delay is (\d+) seconds/);

    if (match && match[1]) {
      const screenLockMinutesDelay = parseInt(match[1], 10) / 60;
      return maxTimeoutMinutes + screenLockMinutesDelay || null;
    }
  } catch (error) {
    console.error("Error checking screen lock status:", error);
  }

  return null;
}

function checkWindowsScreenLock() {
  const powerSettings = execPowershell(`
      $lang = (Get-WinUserLanguageList).LocalizedName.Split(' ')[0].ToLower();
      $acPattern = if ($lang -eq 'spanish') { 'Índice de configuración de corriente alterna actual' } else { 'Current AC Power Setting Index' };
      $dcPattern = if ($lang -eq 'spanish') { 'Índice de configuración de corriente continua actual' } else { 'Current DC Power Setting Index' };

      $acSettings = (powercfg -q SCHEME_CURRENT SUB_VIDEO VIDEOIDLE | Select-String -Pattern $acPattern).Line.Split(':')[1].Trim();
      $dcSettings = (powercfg -q SCHEME_CURRENT SUB_VIDEO VIDEOIDLE | Select-String -Pattern $dcPattern).Line.Split(':')[1].Trim();
      $hasBattery = [bool](Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue);

      [PSCustomObject]@{
        AC = $acSettings;
        DC = $dcSettings;
        HasBattery = $hasBattery
      } | ConvertTo-Json
    `);

  const settings = JSON.parse(powerSettings);
  const timeout = settings.HasBattery
    ? Math.max(parseInt(settings.AC, 16), parseInt(settings.DC, 16))
    : parseInt(settings.AC, 16);

  return timeout === 0 ? null : timeout / 60;
}

function checkLinuxScreenLock() {
  let linuxDesktop = execSync("env | grep XDG_SESSION_DESKTOP")
    .toString()
    .split("=")?.[1]
    .trim();

  if (linuxDesktop === "ubuntu") {
    linuxDesktop = "gnome";
  }

  if (linuxDesktop === "awesome") {
    const sessions = execSync("ls /usr/bin/*session");
    if (sessions.includes("gnome")) {
      linuxDesktop = "gnome";
    }
  }

  const lockEnabled = execSync(
    `gsettings get org.${linuxDesktop}.desktop.screensaver lock-enabled`
  )
    .toString()
    .trim();

  if (lockEnabled === "true") {
    // Get the idle time before the screen saver activates
    const idleDelaySeconds = execSync(
      `gsettings get org.${linuxDesktop}.desktop.session idle-delay`
    )
      .toString()
      .split(" ")?.[1];
    // Get the time before the screen is locked (this applies after the idle delay)
    const lockDelaySeconds = execSync(
      `gsettings get org.${linuxDesktop}.desktop.screensaver lock-delay`
    )
      .toString()
      .split(" ")?.[1];
    return (
      parseInt(idleDelaySeconds, 10) / 60 + parseInt(lockDelaySeconds, 10) / 60
    );
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

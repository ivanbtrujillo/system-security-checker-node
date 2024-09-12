import os from "os";
import { execSync } from "child_process";

export function getOSInfo() {
  const platform = os.platform();
  let osName, osVersion;

  switch (platform) {
    case "darwin":
      osName = "macOS";
      osVersion = execSync("sw_vers -productVersion").toString().trim();
      break;
    case "win32":
      osName = "Windows";
      osVersion = os.release();
      break;
    case "linux":
      osName = "Linux | " + execSync("lsb_release -is").toString().trim();
      try {
        osVersion = execSync("lsb_release -rs").toString().trim();
      } catch (error) {
        osVersion = os.release();
      }
      break;
    default:
      osName = platform;
      osVersion = os.release();
  }

  return { osName, osVersion };
}

export function getDeviceSerial() {
  const platform = os.platform();
  let serial;

  switch (platform) {
    case "darwin":
      serial = execSync(
        "system_profiler SPHardwareDataType | grep 'Serial Number' | awk '{print $4}'"
      )
        .toString()
        .trim();
      break;
    case "win32":
      serial = execSync("wmic os get serialnumber")
        .toString()
        .split("\n")[1]
        .trim();
      break;
    case "linux":
      // TODO: Implement Linux serial number retrieval
      serial = execSync("dmidecode -s system-serial-number").toString().trim();
      break;
    default:
      serial = null;
  }

  return serial;
}

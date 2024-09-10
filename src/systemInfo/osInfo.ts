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

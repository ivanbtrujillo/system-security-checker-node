import { execSync } from "child_process";
import os from "os";

export function checkHasPermissions() {
  if (os.platform() === "win32") {
    try {
      execSync("NET SESSION", { stdio: "ignore" });
      return true;
    } catch (error) {
      return false;
    }
  }
}

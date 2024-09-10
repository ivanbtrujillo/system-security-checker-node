import { execSync } from "child_process";
import os from "os";

export function checkHasPermissions() {
  if (os.platform() === "win32") {
    try {
      execSync("NET SESSION", { stdio: "ignore" });
    } catch (error) {
      console.error("Error: This script requires elevated permissions to run.");
      process.exit(1);
    }
  }
}

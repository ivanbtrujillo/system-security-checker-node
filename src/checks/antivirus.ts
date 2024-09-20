import { execPowershell, executeQuery } from "../utils/utils";
import os from "os";
import { execSync } from "child_process";

const ANTIVIRUS_PROCESSES = "clamav|sophos|eset|comodo|avg|avast|bitdefender";

function checkMacOsAntivirus() {
  const queries = [
    "SELECT * FROM xprotect_entries;",
    "SELECT * FROM xprotect_meta;",
    "SELECT * FROM launchd WHERE name LIKE '%com.apple.MRT%' OR name LIKE '%com.apple.XProtect%';",
    "SELECT * FROM processes WHERE name LIKE '%MRT%' OR name LIKE '%XProtect%';",
  ];
  for (const q of queries) {
    const result = executeQuery(q);
    if (result.length > 0) {
      return "XProtect/MRT (Built-in macOS protection)";
    }
  }
  return null;
}

function checkWindowsAntivirus() {
  const result = execPowershell(
    `wmic /node:localhost /namespace:\\\\root\\SecurityCenter2 path AntiVirusProduct Get DisplayName`
  );

  const antivirusNames = result
    .split("\n")
    .filter((s) => s.trim().toLowerCase() !== "displayname")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(", ");

  return antivirusNames || null;
}

function checkLinuxAntivirus() {
  const processes = execSync(
    `systemctl list-units --type=service --state=running | grep -i -E '${ANTIVIRUS_PROCESSES}' | awk '{ $1=$2=$3=$4=\"\"; print $0 }'`
  )
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .join(", ");

  if (processes) {
    return processes;
  }
  return null;
}

export function checkAntivirus() {
  const system = os.platform();
  if (system === "darwin") {
    return checkMacOsAntivirus();
  } else if (system === "win32") {
    return checkWindowsAntivirus();
  } else if (system === "linux") {
    return checkLinuxAntivirus();
  }
  throw new Error("Unsupported operating system.");
}

export function antivirusToString(antivirus: string | null) {
  if (!antivirus) return "❌ No antivirus detected.";
  return `✅ Antivirus protection detected: ${antivirus}`;
}

const {execSync} = require("child_process");
const os = require("os");

function executeQuery(query) {
  try {
    const result = execSync(`osqueryi --json "${query}"`).toString();
    return JSON.parse(result);
  } catch (error) {
    console.error(`Error executing query: ${error.message}`);
    return [];
  }
}

function checkDiskEncryption() {
  const system = os.platform();
  let query;
  if (system === "darwin") {
    query = "SELECT * FROM disk_encryption;";
  } else if (system === "win32") {
    query = "SELECT * FROM bitlocker_info;";
  } else {
    query = "SELECT * FROM disk_encryption;";
  }

  const result = executeQuery(query);

  if (system === "darwin") {
    if (result.some(disk => parseInt(disk.encrypted) === 1)) {
      return "FileVault";
    }
  } else if (system === "win32") {
    if (result.some(disk => parseInt(disk.encryption_status) === 1)) {
      return "BitLocker";
    }
  } else {
    if (result.some(disk => parseInt(disk.encrypted) === 1)) {
      return "LUKS";
    }
  }

  return null;
}

function checkAntivirus() {
  const system = os.platform();
  let query;
  if (system === "darwin") {
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
  } else if (system === "win32") {
    query = "SELECT * FROM windows_security_products;";
    const result = executeQuery(query);
    if (result.length > 0) {
      return result[0].display_name || "Windows Antivirus";
    }
  } else {
    query =
      "SELECT name FROM processes WHERE name LIKE '%antivirus%' OR name LIKE '%anti-virus%';";
    const result = executeQuery(query);
    if (result.length > 0) {
      return result[0].name || "Unknown Antivirus";
    }
  }

  return null;
}

function checkScreenLock() {
  const system = os.platform();
  let query;
  if (system === "darwin") {
    query =
      "SELECT value FROM preferences WHERE domain = 'com.apple.screensaver' AND key = 'idleTime';";
  } else if (system === "win32") {
    query =
      "SELECT data FROM registry WHERE path = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\InactivityTimeoutSecs';";
  } else {
    query =
      "SELECT value FROM preferences WHERE domain = 'org.gnome.desktop.session' AND key = 'idle-delay';";
  }

  const result = executeQuery(query);

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
  return null;
}

function main() {
  console.log("Verifying system security...");

  const encryption = checkDiskEncryption();
  if (encryption) {
    console.log(`✅ The disk is encrypted with ${encryption}.`);
  } else {
    console.log("❌ The disk is not encrypted.");
  }

  const antivirus = checkAntivirus();
  if (antivirus) {
    console.log(`✅ Antivirus protection detected: ${antivirus}`);
  } else {
    console.log("❌ No antivirus detected.");
  }

  const screenLockTime = checkScreenLock();
  if (screenLockTime !== null) {
    const unit =
      os.platform() === "darwin" || os.platform() === "win32"
        ? "minutes"
        : "seconds";
    console.log(
      `✅ Screen lock is set to activate after ${screenLockTime} ${unit} of inactivity.`
    );
  } else {
    console.log("❌ Screen lock is not configured or is disabled.");
  }
}

main();

require("dotenv").config();

const os = require("os");
const fs = require("fs");
const path = require("path");

const {execSync} = require("child_process");
const {createClient} = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const ANTIVIRUS_PROCESSES = "clamav|sophos|eset|comodo|avg|avast|bitdefender";

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
  if (system === "darwin") {
    const result = executeQuery("SELECT * FROM disk_encryption;");
    if (result.some(disk => parseInt(disk.encrypted) === 1)) {
      return "FileVault";
    }
  } else if (system === "win32") {
    const result = execSync(
      `manage-bde -status | findstr "Protection Status"`
    ).toString();
    return result.includes("Protection On") ? "BitLocker" : null;
  } else {
    const result = execSync("lsblk -o TYPE").toString();
    return result.includes("crypt") ? "LUKS" : null;
  }

  return null;
}

function checkAntivirus() {
  const system = os.platform();
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
    const result = execSync(
      `wmic /node:localhost /namespace:\\\\root\\SecurityCenter2 path AntiVirusProduct Get DisplayName | findstr /V /B /C:displayName`
    ).toString();
    return result.trim() || null;
  } else if (system === "linux") {
    // Search for known antivirus related processes
    const processes = execSync(
      `systemctl list-units --type=service --state=running | grep -i -E '${ANTIVIRUS_PROCESSES}' | awk '{ $1=$2=$3=$4=\"\"; print $0 }'`
    )
      .toString()
      .split("\n")
      .map(s => s.trim())
      .join(", ");

    if (processes) {
      return processes;
    }
  }

  return null;
}

function checkScreenLock() {
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
      .filter(line => line.includes("Current AC Power Setting Index"))[0]
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

function getOSInfo() {
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
      osName = "Linux";
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

  return {osName, osVersion};
}

async function checkUserIdExists(userId) {
  try {
    const {data, error} = await supabase
      .from("user_logs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("Error verifying user ID in Supabase:", error.message);
    return false;
  }
}

async function getUserId() {
  const configPath = path.join(os.homedir(), ".security-check-config.json");
  let userId;

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    userId = config.userId;
  }

  while (!userId) {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    userId = await new Promise(resolve => {
      readline.question("Please enter your user ID: ", answer => {
        readline.close();
        resolve(answer.trim());
      });
    });

    if (!userId || userId.length === 0) {
      console.error("Error: User ID cannot be empty.");
      userId = null;
      continue;
    }

    const userExists = await checkUserIdExists(userId);
    if (!userExists) {
      console.error("Error: User ID does not exist in Supabase.");
      userId = null;
      continue;
    }

    fs.writeFileSync(configPath, JSON.stringify({userId}));
  }

  return userId;
}

async function sendReportToSupabase(userId, report) {
  try {
    const {data, error} = await supabase
      .from("security_reports")
      .upsert({user_id: userId, ...report}, {onConflict: "user_id"});

    if (error) throw error;
    console.log("Report sent to Supabase successfully.");
  } catch (error) {
    console.error("Error sending report to Supabase:", error.message);
    if (error.details) {
      console.error("Error details:", error.details);
    }
    if (error.hint) {
      console.error("Hint:", error.hint);
    }
  }
}

function checkHasPermissions() {
  if (os.platform() === "win32") {
    try {
      execSync("NET SESSION", {stdio: "ignore"});
    } catch (error) {
      console.error("Error: This script requires elevated permissions to run.");
      process.exit(1);
    }
  }
}

async function main() {
  console.log("Checking system security...");

  let userId;
  try {
    userId = await getUserId();
  } catch (error) {
    console.error("Error obtaining user ID:", error.message);
    process.exit(1);
  }

  if (!userId) {
    console.error("Error: Could not obtain a valid user ID.");
    process.exit(1);
  }

  checkHasPermissions();

  const encryption = checkDiskEncryption();
  const antivirus = checkAntivirus();
  const screenLockTime = checkScreenLock();

  const {osName, osVersion} = getOSInfo();

  const report = {
    disk_encrypted: !!encryption,
    encryption_type: encryption || null,
    antivirus_detected: !!antivirus,
    antivirus_name: antivirus || null,
    screen_lock_active: screenLockTime !== null,
    screen_lock_time: screenLockTime,
    operating_system: osName,
    os_version: osVersion,
    last_check: new Date().toISOString(),
  };

  // Print results to console
  if (encryption) {
    console.log(`✅ Disk is encrypted with ${encryption}.`);
  } else {
    console.log("❌ Disk is not encrypted.");
  }

  if (antivirus) {
    console.log(`✅ Antivirus protection detected: ${antivirus}`);
  } else {
    console.log("❌ No antivirus detected.");
  }

  if (screenLockTime !== null) {
    const unit = "minutes";
    console.log(
      `✅ Screen lock activates after ${screenLockTime} ${unit} of inactivity.`
    );
  } else {
    console.log("❌ Screen lock is not configured or is disabled.");
  }

  await sendReportToSupabase(userId, report);

  console.log("Press Enter to close...");
  process.stdin.once("data", () => {
    process.exit(0);
  });
}

main().catch(error => {
  console.error("Unexpected error:", error.message);
  process.exit(1);
});

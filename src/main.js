const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const path = require("path");
const {execSync} = require("child_process");
const {createClient} = require("@supabase/supabase-js");
const {encryptedConfig} = require("./encrypted-config");

const algorithm = "aes-256-ctr";
const secretKey = "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3"; // Use the same key as in generate-config.js

function decrypt(hash) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(hash.iv, "hex")
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(hash.content, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString();
}

let config;
try {
  config = JSON.parse(decrypt(encryptedConfig));
} catch (error) {
  console.error("Error decrypting config:", error);
  process.exit(1);
}

const supabaseUrl = config.SUPABASE_URL;
const supabaseKey = config.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  const report = {
    disk_encrypted: !!encryption,
    encryption_type: encryption || null,
    antivirus_detected: !!antivirus,
    antivirus_name: antivirus || null,
    screen_lock_active: screenLockTime !== null,
    screen_lock_time: screenLockTime,
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
    const unit =
      os.platform() === "darwin" || os.platform() === "win32"
        ? "minutes"
        : "seconds";
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

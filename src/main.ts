require("dotenv").config();

import {
  checkDiskEncryption,
  diskEncryptionToString,
} from "./checks/diskEncryption";
import { antivirusToString, checkAntivirus } from "./checks/antivirus";
import { checkScreenLock, screenLockToString } from "./checks/screenLock";
import { sendReportToSupabase, getUserId } from "./utils/supabase";
import { getDeviceSerial, getOSInfo } from "./systemInfo/osInfo";

async function main() {
  console.log("Checking system security...");

  const userId = await getUserId();
  const deviceId = getDeviceSerial();

  const encryption = checkDiskEncryption();
  const antivirus = checkAntivirus();
  const screenLockTime = checkScreenLock();

  const { osName, osVersion } = getOSInfo();

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

  // Print the results
  console.log(antivirusToString(antivirus));
  console.log(diskEncryptionToString(encryption));
  console.log(screenLockToString(screenLockTime));

  await sendReportToSupabase(userId, deviceId, report);

  console.log("Press Enter to close...");
  process.stdin.once("data", () => {
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Unexpected error:", error.message);
  process.exit(1);
});

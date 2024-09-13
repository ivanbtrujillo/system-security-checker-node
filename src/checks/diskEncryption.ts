import { execSync } from "child_process";
import { execPowershell, executeQuery } from "../utils/utils";
import os from "os";
import { checkHasPermissions } from "../systemInfo/hasPermissions";

function checkMacOsDiskEncryption() {
  const result = executeQuery("SELECT * FROM disk_encryption;");
  if (
    result.some((disk: { encrypted: string }) => parseInt(disk.encrypted) === 1)
  ) {
    return { encryptionMethod: "FileVault", hasPermissions: true };
  }
  return { encryptionMethod: null, hasPermissions: true };
}

function checkWindowsDiskEncryption() {
  if (checkHasPermissions()) {
    const result = execSync(
      `manage-bde -status | findstr "Protection Status"`
    ).toString();
    const encryption = result.includes("Protection On") ? "BitLocker" : null;
    return { encryptionMethod: encryption, hasPermissions: true };
  }
  return { encryptionMethod: null, hasPermissions: false };
}

function checkLinuxDiskEncryption() {
  const result = execSync("lsblk -o TYPE").toString();
  const encryption = result.includes("crypt") ? "LUKS" : null;
  return { encryptionMethod: encryption, hasPermissions: true };
}

export function checkDiskEncryption() {
  const system = os.platform();
  if (system === "darwin") {
    return checkMacOsDiskEncryption();
  } else if (system === "win32") {
    return checkWindowsDiskEncryption();
  } else if (system === "linux") {
    return checkLinuxDiskEncryption();
  }
  throw new Error("Unsupported operating system.");
}

export function diskEncryptionToString({
  encryptionMethod,
  hasPermissions,
}: {
  encryptionMethod: string | null;
  hasPermissions: boolean;
}) {
  if (!hasPermissions)
    return "❓ Insufficient permissions to check disk encryption.";
  if (!encryptionMethod) return "❌ Disk is not encrypted.";
  return `✅ Disk is encrypted with ${encryptionMethod}.`;
}

import { execSync } from "child_process";
import { execPowershell, executeQuery } from "../utils/utils";
import os from "os";

function checkMacOsDiskEncryption() {
  const result = executeQuery("SELECT * FROM disk_encryption;");
  if (
    result.some((disk: { encrypted: string }) => parseInt(disk.encrypted) === 1)
  ) {
    return "FileVault";
  }
  return null;
}

const BITLOCKER_STATUS = {
  unencryptable: 0,
  encrypted: 1,
  not_encrypted: 2,
  encryption_in_progress: 3,
};

function checkWindowsDiskEncryption() {
  const result = execPowershell(
    `(New-Object -ComObject Shell.Application).NameSpace('C:').Self.ExtendedProperty('System.Volume.BitLockerProtection')`
  )
    .toString()
    .trim();
  if (result === BITLOCKER_STATUS["encrypted"].toString()) {
    return "BitLocker";
  }
  return null;
}

function checkLinuxDiskEncryption() {
  // Check for ecryptfs
  const ecryptfsCheck = execSync("mount | grep ecryptfs").toString();
  if (ecryptfsCheck.includes("ecryptfs")) {
    return "ecryptfs";
  }

  // Check for LUKS
  const result = execSync("lsblk -o TYPE").toString();
  if (result.includes("crypt")) {
    return "LUKS";
  }

  return null;
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

export function diskEncryptionToString(
  encryptionMethod: string | null
): string {
  if (!encryptionMethod) return "❌ Disk is not encrypted.";
  return `✅ Disk is encrypted with ${encryptionMethod}.`;
}

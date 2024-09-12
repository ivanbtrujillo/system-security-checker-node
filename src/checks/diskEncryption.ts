import { execSync } from "child_process";
import { execPowershell, executeQuery } from "../utils/utils";
import os from "os";

export function checkDiskEncryption() {
  const system = os.platform();
  if (system === "darwin") {
    const result = executeQuery("SELECT * FROM disk_encryption;");
    if (
      result.some(
        (disk: { encrypted: string }) => parseInt(disk.encrypted) === 1
      )
    ) {
      return "FileVault";
    }
  } else if (system === "win32") {
    const result = execPowershell(
      `manage-bde -status | findstr "Protection Status"`
    ).toString();
    return result.includes("Protection On") ? "BitLocker" : null;
  } else {
    const result = execSync("lsblk -o TYPE").toString();
    return result.includes("crypt") ? "LUKS" : null;
  }

  return null;
}

export function diskEncryptionToString(encryption: string | null) {
  if (!encryption) return "❌ Disk is not encrypted.";
  return `✅ Disk is encrypted with ${encryption}.`;
}

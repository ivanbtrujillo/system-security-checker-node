require("dotenv").config();

import {
  checkDiskEncryption,
  diskEncryptionToString,
} from "./checks/diskEncryption";
import { antivirusToString, checkAntivirus } from "./checks/antivirus";
import { checkScreenLock, screenLockToString } from "./checks/screenLock";
import {
  sendReportToSupabase,
  getUserEmail,
  getUserFullName,
} from "./utils/supabase";
import { getDeviceSerial, getOSInfo } from "./systemInfo/osInfo";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

async function main() {
  console.log(chalk.blue("\n🔒 System Security Checker\n"));

  const { dryRun } = await inquirer.prompt([
    {
      type: "confirm",
      name: "dryRun",
      message: "Would you like to run in dry-run mode?",
      default: false,
    },
  ]);

  if (dryRun) {
    console.log(chalk.yellow("Running in dry-run mode..."));
  }

  try {
    const userEmail = await getUserEmail(dryRun);
    const userFullName = await getUserFullName(dryRun);
    const spinner = ora("Gathering system information...").start();
    const deviceId = getDeviceSerial();
    const encryption = checkDiskEncryption();
    const antivirus = checkAntivirus();
    const screenLockTime = checkScreenLock();
    const { osName, osVersion } = getOSInfo();

    spinner.succeed("System information gathered successfully!");

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

    // Print the results with better formatting
    console.log("\n" + chalk.bold("Security Check Results:"));
    console.log(chalk.green("✓") + " " + antivirusToString(antivirus));
    console.log(chalk.green("✓") + " " + diskEncryptionToString(encryption));
    console.log(chalk.green("✓") + " " + screenLockToString(screenLockTime));

    if (dryRun) {
      console.log(
        chalk.yellow("\nDry Run Report:\n"),
        JSON.stringify({ userEmail, userFullName, deviceId, report }, null, 4)
      );
    } else {
      const { shouldSendReport } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldSendReport",
          message: "Would you like to send the security report?",
          default: true,
        },
      ]);

      if (shouldSendReport) {
        const sendingSpinner = ora("Sending report to server...").start();
        const success = await sendReportToSupabase(
          userEmail,
          userFullName,
          deviceId,
          report
        );
        if (success) sendingSpinner.succeed("Report sent successfully!");
        else
          sendingSpinner.fail("Failed to send report. Please try again later.");
      } else {
        console.log(
          chalk.yellow(
            "\nReport not sent. You can find the report details above."
          )
        );
      }
    }

    process.exit(0);
  } catch (error) {
    throw error;
  }
}

main().catch((error) => {
  console.error(chalk.red("Unexpected error:"), error.message);
  process.exit(1);
});

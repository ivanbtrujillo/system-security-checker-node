import {createClient, SupabaseClient} from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import os from "os";

function getSupabaseClient() {
  let client: SupabaseClient | null = null;
  return () => {
    if (client !== null) {
      return client;
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error(
        "Error: Missing Supabase URL or anonymous key in .env file."
      );
      process.exit(1);
    }
    client = createClient(supabaseUrl, supabaseKey);
    return client;
  };
}

export const supabaseClient = getSupabaseClient();

export async function sendReportToSupabase(
  deviceId: string,
  userEmail: string,
  userFullName: string,
  report: {
    disk_encrypted: boolean;
    encryption_type: string | null;
    antivirus_detected: boolean;
    antivirus_name: string | null;
    screen_lock_active: boolean;
    screen_lock_time: number | null;
    operating_system: string;
    os_version: string;
    last_check: string;
  }
) {
  try {
    const {data, error} = await supabaseClient()
      .from("security_reports")
      .upsert(
        {
          device_id: deviceId,
          user_email: userEmail,
          user_full_name: userFullName,
          ...report,
        },
        {onConflict: "user_email,device_id"}
      );

    if (error) throw error;
    console.log("Report sent to Supabase successfully.");
  } catch (error: any) {
    console.error("Error sending report to Supabase:", error.message);
    if (error.details) {
      console.error("Error details:", error.details);
    }
    if (error.hint) {
      console.error("Hint:", error.hint);
    }
  }
}

export async function getUserEmail(dryRun: boolean) {
  if (dryRun) {
    return "local-dry-run";
  }

  try {
    let userEmail: string | null = null;

    while (!userEmail) {
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      userEmail = (await new Promise(resolve => {
        readline.question(
          "Please enter your company email: ",
          (answer: string) => {
            readline.close();
            resolve(answer.trim());
          }
        );
      })) as string;

      if (!userEmail || userEmail.length === 0) {
        console.error("Error: Email cannot be empty.");
        userEmail = null;
        continue;
      }

      if (!userEmail.includes("@")) {
        console.error("Error: Email must be a valid email address.");
        userEmail = null;
        continue;
      }
    }

    return userEmail;
  } catch (error: any) {
    console.error("Error obtaining user email:", error.message);
    process.exit(1);
  }
}

export async function getUserFullName(dryRun: boolean) {
  if (dryRun) {
    return "local-dry-run";
  }

  try {
    let userFullName: string | null = null;

    while (!userFullName) {
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      userFullName = (await new Promise(resolve => {
        readline.question(
          "Please enter your full name (ie: John Doe): ",
          (answer: string) => {
            readline.close();
            resolve(answer.trim());
          }
        );
      })) as string;

      if (!userFullName || userFullName.length === 0) {
        console.error("Error: Your full name cannot be empty.");
        userFullName = null;
        continue;
      }
    }

    return userFullName;
  } catch (error: any) {
    console.error("Error obtaining user full name:", error.message);
    process.exit(1);
  }
}

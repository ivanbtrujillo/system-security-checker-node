import {createClient} from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import os from "os";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing Supabase URL or anonymous key in .env file.");
    process.exit(1);
  }
  return createClient(supabaseUrl, supabaseKey);
}

export const supabaseClient = getSupabaseClient();

export async function sendReportToSupabase(
  userId: string,
  deviceId: string,
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
    const {data, error} = await supabaseClient
      .from("security_reports")
      .upsert(
        {user_id: userId, device_id: deviceId, ...report},
        {onConflict: "user_id,device_id"}
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

async function checkUserIdExists(userId: string) {
  try {
    const {data, error} = await supabaseClient
      .from("user_logs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return !!data;
  } catch (error: any) {
    console.error("Error verifying user ID in Supabase:", error.message);
    return false;
  }
}

export async function getUserId() {
  try {
    const configPath = path.join(os.homedir(), ".security-check-config.json");
    let userId: string | null = null;

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      userId = config.userId;
    }

    while (!userId) {
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      userId = (await new Promise(resolve => {
        readline.question("Please enter your user ID: ", (answer: string) => {
          readline.close();
          resolve(answer.trim());
        });
      })) as string;

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

    if (!userId) {
      console.error("Error: Could not obtain a valid user ID.");
      process.exit(1);
    }

    return userId;
  } catch (error: any) {
    console.error("Error obtaining user ID:", error.message);
    process.exit(1);
  }
}

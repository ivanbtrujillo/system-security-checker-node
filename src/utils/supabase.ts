import { createClient, SupabaseClient } from "@supabase/supabase-js";
import chalk from "chalk";
import inquirer from "inquirer";

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
        chalk.red("Error: Missing Supabase URL or anonymous key in .env file.")
      );
      process.exit(1);
    }
    client = createClient(supabaseUrl, supabaseKey);
    return client;
  };
}

export const supabaseClient = getSupabaseClient();

export async function sendReportToSupabase(
  userEmail: string,
  userFullName: string,
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
    const { data, error } = await supabaseClient()
      .from("security_reports")
      .upsert(
        {
          device_id: deviceId,
          user_email: userEmail,
          user_full_name: userFullName,
          ...report,
        },
        { onConflict: "user_email,device_id" }
      );

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error(
      chalk.red("\nError sending report to Supabase:"),
      error.message
    );
    if (error.details) {
      console.error(chalk.yellow("\nError details:"), error.details);
    }
    if (error.hint) {
      console.error(chalk.yellow("\nHint:"), error.hint);
    }
    return false;
  }
}

export async function getUserEmail(dryRun: boolean) {
  if (dryRun) {
    return "local-dry-run";
  }

  let userEmail: string | null = process.env.USER_EMAIL || null;
  if (userEmail) {
    return userEmail.trim();
  }

  try {
    const { email } = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Please enter your company email:",
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red("Email cannot be empty");
          }
          if (!input.includes("@")) {
            return chalk.red("Please enter a valid email address");
          }
          return true;
        },
      },
    ]);

    return email.trim();
  } catch (error: any) {
    console.error(chalk.red("Error obtaining user email:"), error.message);
    process.exit(1);
  }
}

export async function getUserFullName(dryRun: boolean) {
  if (dryRun) {
    return "local-dry-run";
  }

  let userFullName: string | null = process.env.USER_FULL_NAME || null;
  if (userFullName) {
    return userFullName.trim();
  }

  try {
    const { fullName } = await inquirer.prompt([
      {
        type: "input",
        name: "fullName",
        message: "Please enter your full name (ie: John Doe):",
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red("Your full name cannot be empty");
          }
          return true;
        },
      },
    ]);

    return fullName.trim();
  } catch (error: any) {
    console.error(chalk.red("Error obtaining user full name:"), error.message);
    process.exit(1);
  }
}

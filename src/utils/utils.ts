import { execSync, ExecSyncOptionsWithBufferEncoding } from "child_process";

export function executeQuery(query: string) {
  try {
    const result = execSync(`osqueryi --json "${query}"`).toString();
    return JSON.parse(result);
  } catch (error: any) {
    console.error(`Error executing query: ${error.message}`);
    return [];
  }
}

export function execPowershell(
  command: string,
  options?: ExecSyncOptionsWithBufferEncoding
) {
  return execSync(command, { shell: "pwsh", ...options });
}

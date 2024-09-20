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
  const hasPwsh = checkHasExecutable("pwsh");
  const hasPowershell = checkHasExecutable("powershell");
  if (!hasPwsh && !hasPowershell) throw "No Powershell detected";
  const shell = hasPwsh ? "pwsh" : "powershell";
  return execSync(command, { shell, ...options })
    .toString()
    .trim();
}

export function checkHasExecutable(name: string): boolean {
  return (
    execSync(`where ${name} > nul 2> nul && echo true || echo false`, {
      shell: "cmd",
    })
      .toString()
      .trim() === "true"
  );
}

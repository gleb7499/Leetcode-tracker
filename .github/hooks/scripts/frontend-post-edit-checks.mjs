import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { stdin, stdout, stderr } from "node:process";

function writeJson(value) {
  stdout.write(`${JSON.stringify(value)}\n`);
}

function collectStrings(value, acc = []) {
  if (typeof value === "string") {
    acc.push(value);
    return acc;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, acc);
    }
    return acc;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectStrings(nested, acc);
    }
  }

  return acc;
}

function normalizeForMatch(value) {
  return String(value).replace(/\\/g, "/").toLowerCase();
}

function isLikelyEditTool(toolName) {
  return /edit|create|apply|patch|replace|write|rename|move|delete|file/i.test(toolName);
}

function extractRelevantSignals(payload) {
  const toolName = String(payload?.tool_name ?? "");
  const toolInputStrings = collectStrings(payload?.tool_input ?? {});
  const allSignals = [toolName, ...toolInputStrings];
  return { toolName, allSignals };
}

function touchesFrontend(allSignals) {
  return allSignals.some((signal) => normalizeForMatch(signal).includes("frontend"));
}

function runNpmScript(frontendDir, scriptName) {
  const result =
    process.platform === "win32"
      ? spawnSync(`npm run ${scriptName}`, {
          cwd: frontendDir,
          encoding: "utf8",
          shell: true,
        })
      : spawnSync("npm", ["run", scriptName], {
          cwd: frontendDir,
          encoding: "utf8",
        });

  return {
    scriptName,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message ?? result.error) : "",
  };
}

function summarizeFailure(failedChecks) {
  const sections = failedChecks.map((check) => {
    const content = [check.error, check.stderr, check.stdout]
      .filter(Boolean)
      .join("\n")
      .trim();

    const trimmed = content.length > 2500 ? `${content.slice(0, 2500)}\n...[truncated]` : content;
    return `# ${check.scriptName}\n${trimmed || "No output."}`;
  });

  return sections.join("\n\n");
}

const chunks = [];
for await (const chunk of stdin) {
  chunks.push(Buffer.from(chunk));
}

const rawInput = Buffer.concat(chunks).toString("utf8").trim();
if (!rawInput) {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(rawInput);
} catch (error) {
  stderr.write(`Invalid hook input JSON: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

if (payload?.hookEventName !== "PostToolUse") {
  writeJson({});
  process.exit(0);
}

const { toolName, allSignals } = extractRelevantSignals(payload);
if (!isLikelyEditTool(toolName) || !touchesFrontend(allSignals)) {
  writeJson({});
  process.exit(0);
}

const workspaceCwd = typeof payload?.cwd === "string" && payload.cwd.trim() ? payload.cwd : process.cwd();
const frontendDir = path.resolve(workspaceCwd, "frontend");

if (!fs.existsSync(frontendDir)) {
  writeJson({
    systemMessage: "Frontend quality hook skipped: frontend directory not found.",
  });
  process.exit(0);
}

const lint = runNpmScript(frontendDir, "lint");
const typecheck = runNpmScript(frontendDir, "typecheck");
const staticChecks = [lint, typecheck];
const failedChecks = staticChecks.filter((check) => check.status !== 0);

let build = null;
if (failedChecks.length === 0) {
  build = runNpmScript(frontendDir, "build");
  if (build.status !== 0) {
    failedChecks.push(build);
  }
}

if (failedChecks.length === 0) {
  writeJson({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "Frontend quality pipeline passed after frontend edit: lint, typecheck, build.",
    },
  });
  process.exit(0);
}

const failureSummary = summarizeFailure(failedChecks);
const failedStageNames = failedChecks.map((check) => check.scriptName).join(", ");
writeJson({
  decision: "block",
  reason: `frontend quality pipeline failed (${failedStageNames}). Fix issues before continuing.`,
  systemMessage: "Frontend quality pipeline detected issues after frontend edit. See hook output details.",
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: `Frontend quality pipeline failed after frontend edit.\n\n${failureSummary}`,
  },
});

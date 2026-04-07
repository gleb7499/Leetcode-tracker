import { stdin, stdout, stderr } from "node:process";

const chunks = [];
for await (const chunk of stdin) {
  chunks.push(Buffer.from(chunk));
}

const raw = Buffer.concat(chunks).toString("utf8").trim();
if (!raw) {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (error) {
  stderr.write(`Invalid hook input JSON: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

const architecturalSuffix =
  "Реши эту задачу архитектурно грамотно, корректно и безопасно! Думай глубоко и внимательно!";

const writeJson = (value) => {
  stdout.write(`${JSON.stringify(value)}\n`);
};

switch (payload.hookEventName) {
  case "SessionStart":
  case "SubagentStart": {
    writeJson({
      hookSpecificOutput: {
        hookEventName: payload.hookEventName,
        additionalContext: architecturalSuffix
      }
    });
    break;
  }

  case "PreToolUse": {
    writeJson({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        additionalContext: architecturalSuffix
      }
    });
    break;
  }

  default:
    writeJson({});
}

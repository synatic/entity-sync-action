import * as core from "@actions/core";
import { runExecuteCommand } from "./commands/execute.js";
import { runPlanCommand } from "./commands/plan.js";
import { getInput, parseInputs } from "./lib/inputs.js";

const isTest = process.env.NODE_ENV === "test";

export async function run() {
  try {
    const command = getInput("command", { required: true });
    const inputs = parseInputs(command);

    core.info(`Running entity-sync command: ${inputs.command}`);

    if (inputs.command === "plan") {
      await runPlanCommand(inputs);
    } else {
      await runExecuteCommand(inputs);
    }

    core.info("Action completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
    if (isTest) {
      throw error;
    }
  }
}

if (!isTest) {
  run();
}

import * as core from "@actions/core";

const ROOT_TYPES = new Set([
  "flow",
  "solution",
  "buffer",
  "dataStore",
  "parameter",
  "relay",
  "userGroup",
  "serviceView",
  "flowTrigger",
]);

/**
 * @param {string} name
 * @param {{ required?: boolean, defaultValue?: string }} [options]
 * @returns {string}
 */
export function getInput(name, options = {}) {
  const value = core.getInput(name) || options.defaultValue || "";
  if (options.required && !value.trim()) {
    throw new Error(`Input '${name}' is required`);
  }
  return value.trim();
}

/**
 * @param {string} name
 * @param {boolean} [defaultValue=false]
 * @returns {boolean}
 */
export function getBooleanInput(name, defaultValue = false) {
  const raw = core.getInput(name);
  if (!raw) {
    return defaultValue;
  }
  return raw.toLowerCase() === "true";
}

/**
 * @returns {boolean}
 */
export function isTruthyDefaultTrue(name) {
  const raw = core.getInput(name);
  if (!raw) {
    return true;
  }
  return raw.toLowerCase() === "true";
}

/**
 * @param {string} command
 * @returns {import('../types.js').ActionInputs}
 */
export function parseInputs(command) {
  const normalizedCommand = command.toLowerCase();
  if (normalizedCommand !== "plan" && normalizedCommand !== "execute") {
    throw new Error(`Invalid command '${command}'. Must be 'plan' or 'execute'.`);
  }

  const apiUrl = getInput("api-url", { required: true }).replace(/\/+$/, "");
  const apiKey = getInput("api-key", { required: true });
  const planPath =
    getInput("plan-path") || ".synatic/plans/plan.json";

  /** @type {import('../types.js').ActionInputs} */
  const inputs = {
    command: normalizedCommand,
    apiUrl,
    apiKey,
    planPath,
  };

  if (normalizedCommand === "plan") {
    inputs.sourceOrg = getInput("source-org", { required: true });
    inputs.rootType = getInput("root-type", { required: true });
    inputs.rootId = getInput("root-id", { required: true });

    if (!ROOT_TYPES.has(inputs.rootType)) {
      throw new Error(
        `Invalid root-type '${inputs.rootType}'. Must be one of: ${[...ROOT_TYPES].join(", ")}`
      );
    }

    inputs.planOptions = parsePlanOptions(getInput("plan-options") || "{}");
    inputs.autoCommit = isTruthyDefaultTrue("auto-commit");
    inputs.createPr = isTruthyDefaultTrue("create-pr");
    inputs.prTitle = getInput("pr-title");
    inputs.prBody = getInput("pr-body");
    inputs.prBaseBranch = getInput("pr-base-branch") || "main";
    inputs.commitMessage =
      getInput("commit-message") || "chore: update entity sync plan";
  }

  if (normalizedCommand === "execute") {
    inputs.destOrg = getInput("dest-org", { required: true });
    inputs.previewFirst = isTruthyDefaultTrue("preview-first");
    inputs.previewOnly = getBooleanInput("preview-only", false);
    inputs.failOnConflict = isTruthyDefaultTrue("fail-on-conflict");
  }

  return inputs;
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parsePlanOptions(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("plan-options must be a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Invalid plan-options JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

import * as core from "@actions/core";
import { EntitySyncApiClient } from "../lib/api-client.js";
import { readPlanFile } from "../lib/fs.js";

/**
 * @param {Record<string, unknown> | undefined} summary
 * @returns {number}
 */
function getConflictCount(summary) {
  if (!summary || typeof summary !== "object") {
    return 0;
  }
  const value = summary.toConflict;
  return typeof value === "number" ? value : 0;
}

/**
 * @param {Record<string, unknown> | undefined} summary
 * @returns {number}
 */
function getFailedCount(summary) {
  if (!summary || typeof summary !== "object") {
    return 0;
  }
  const value = summary.failed;
  return typeof value === "number" ? value : 0;
}

/**
 * @param {Record<string, unknown>} preview
 */
function logPreviewSummary(preview) {
  const summary = preview.summary;
  core.info(`Preview summary: ${JSON.stringify(summary)}`);

  const actions = preview.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (action && typeof action === "object") {
        const record = /** @type {Record<string, unknown>} */ (action);
        core.info(
          `  [${record.order}] ${record.entityType} ${record.sourceName}: ${record.action}`
        );
      }
    }
  }

  const warnings = preview.warnings;
  if (Array.isArray(warnings) && warnings.length > 0) {
    core.warning(`Preview warnings (${warnings.length}):`);
    for (const warning of warnings) {
      core.warning(JSON.stringify(warning));
    }
  }
}

/**
 * @param {Record<string, unknown>} run
 */
function logRunAudit(run) {
  core.info(`Run status: ${run.status}`);
  const steps = run.steps;
  if (!Array.isArray(steps)) {
    return;
  }

  for (const step of steps) {
    if (!step || typeof step !== "object") {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (step);
    const line = `[${record.order}] ${record.entityType} ${record.sourceName}: ${record.outcome}`;
    if (record.error) {
      core.warning(`${line} — ${record.error}`);
    } else if (record.conflictReason) {
      core.warning(`${line} — ${record.conflictReason}`);
    } else {
      core.info(line);
    }
  }
}

/**
 * @param {import('../types.js').ActionInputs} inputs
 */
export async function runExecuteCommand(inputs) {
  const client = new EntitySyncApiClient({
    apiUrl: inputs.apiUrl,
    apiKey: inputs.apiKey,
  });

  const plan = readPlanFile(inputs.planPath);
  core.setOutput("plan-id", plan.planId);
  core.setOutput("plan-path", inputs.planPath);

  core.info(
    `Loaded plan ${plan.planId} with ${plan.steps.length} steps from ${inputs.planPath}`
  );

  let previewResult;

  if (inputs.previewFirst) {
    core.startGroup("Preview");
    previewResult = await client.preview(inputs.destOrgId, plan);
    logPreviewSummary(previewResult);

    const conflicts = getConflictCount(
      /** @type {Record<string, unknown>} */ (previewResult.summary)
    );
    core.setOutput("conflicts", String(conflicts));
    core.setOutput("summary", JSON.stringify(previewResult.summary ?? {}));
    core.endGroup();

    if (inputs.failOnConflict && conflicts > 0) {
      throw new Error(
        `Preview reported ${conflicts} conflict(s). Resolve conflicts before executing.`
      );
    }
  }

  if (inputs.previewOnly) {
    core.info("preview-only is true; skipping execute");
    return;
  }

  core.startGroup("Execute");
  const executeResult = await client.execute(inputs.destOrgId, plan);
  const runId = String(executeResult.runId || "");
  const executeSummary = executeResult.summary;

  core.info(`Execute summary: ${JSON.stringify(executeSummary)}`);
  core.setOutput("run-id", runId);
  core.setOutput("summary", JSON.stringify(executeSummary ?? {}));
  core.endGroup();

  if (runId) {
    core.startGroup("Run audit");
    const run = await client.getRun(inputs.destOrgId, runId);
    logRunAudit(run);
    core.endGroup();

    const failed = getFailedCount(
      /** @type {Record<string, unknown>} */ (executeSummary)
    );
    const status = String(run.status || "");

    if (failed > 0) {
      throw new Error(`Execute completed with ${failed} failed step(s)`);
    }

    if (status === "completed_with_errors") {
      throw new Error("Sync run completed with errors");
    }
  }
}

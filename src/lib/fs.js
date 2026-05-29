import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH = ".synatic/plans/manifest.json";

/**
 * @returns {string}
 */
export function getWorkspaceRoot() {
  return process.env.GITHUB_WORKSPACE || process.cwd();
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
export function resolvePlanPath(relativePath) {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.join(getWorkspaceRoot(), relativePath);
}

/**
 * @param {import('../types.js').SyncPlan} plan
 * @param {string} planPath
 * @returns {{ planAbsolutePath: string, manifestAbsolutePath: string }}
 */
export function writePlanFiles(plan, planPath) {
  const planAbsolutePath = resolvePlanPath(planPath);
  const manifestAbsolutePath = resolvePlanPath(MANIFEST_PATH);

  fs.mkdirSync(path.dirname(planAbsolutePath), { recursive: true });

  fs.writeFileSync(planAbsolutePath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  const manifest = {
    planFile: planPath.replace(/\\/g, "/"),
    planId: plan.planId,
    sourceOrgId: plan.sourceOrgId,
    rootType: plan.rootType,
    rootId: plan.rootId,
    generatedAt: plan.generatedAt,
  };

  fs.mkdirSync(path.dirname(manifestAbsolutePath), { recursive: true });
  fs.writeFileSync(
    manifestAbsolutePath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  return { planAbsolutePath, manifestAbsolutePath };
}

/**
 * @param {string} planPath
 * @returns {import('../types.js').SyncPlan}
 */
export function readPlanFile(planPath) {
  const absolutePath = resolvePlanPath(planPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Plan file not found at ${planPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to parse plan file at ${planPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  validatePlan(parsed, planPath);
  return parsed;
}

/**
 * @param {unknown} plan
 * @param {string} planPath
 */
export function validatePlan(plan, planPath) {
  if (!plan || typeof plan !== "object") {
    throw new Error(`Invalid plan at ${planPath}: expected a JSON object`);
  }

  const record = /** @type {Record<string, unknown>} */ (plan);

  if (typeof record.planId !== "string" || !record.planId) {
    throw new Error(`Invalid plan at ${planPath}: planId is required`);
  }

  if (!Array.isArray(record.steps)) {
    throw new Error(`Invalid plan at ${planPath}: steps must be an array`);
  }
}

/**
 * @param {string} absolutePath
 * @param {string} workspaceRoot
 * @returns {string}
 */
export function toRepoRelativePath(absolutePath, workspaceRoot) {
  return path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
}

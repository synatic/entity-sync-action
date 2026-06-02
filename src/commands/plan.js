import * as core from "@actions/core";
import * as github from "@actions/github";
import { EntitySyncApiClient } from "../lib/api-client.js";
import {
  getWorkspaceRoot,
  toRepoRelativePath,
  writePlanFiles,
} from "../lib/fs.js";
import {
  createBranchName,
  GitHubCommit,
  repoPathFromAbsolute,
} from "../lib/github.js";

/**
 * @param {import('../types.js').ActionInputs} inputs
 */
export async function runPlanCommand(inputs) {
  const client = new EntitySyncApiClient({
    apiUrl: inputs.apiUrl,
    apiKey: inputs.apiKey,
  });

  core.info(
    `Generating plan for ${inputs.rootType} ${inputs.rootId} in org ${inputs.sourceOrg}`
  );

  const requestBody = {
    rootType: inputs.rootType,
    rootId: inputs.rootId,
    options: inputs.planOptions || {},
  };

  core.info(
    `POST ${inputs.apiUrl}/v1/organizations/${inputs.sourceOrg}/entity-sync/plan`
  );
  core.info(`Request body: ${JSON.stringify(requestBody)}`);

  const plan = await client.plan(inputs.sourceOrg, requestBody);

  const { planAbsolutePath, manifestAbsolutePath } = writePlanFiles(
    plan,
    inputs.planPath
  );

  core.info(`Plan ${plan.planId} written to ${inputs.planPath}`);
  core.setOutput("plan-id", plan.planId);
  core.setOutput("plan-path", inputs.planPath);

  if (!inputs.autoCommit) {
    core.info("auto-commit is false; plan file written locally only");
    return;
  }

  const token = core.getInput("github-token") || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "A GitHub token is required when auto-commit is enabled (set the github-token input or GITHUB_TOKEN env)"
    );
  }

  const { owner, repo } = github.context.repo;
  const workspaceRoot = getWorkspaceRoot();
  const branchName = createBranchName();
  const git = new GitHubCommit(token);

  const prTitle =
    inputs.prTitle || `Entity sync plan ${plan.planId.slice(0, 8)}`;
  const prBody =
    inputs.prBody ||
    [
      "Automated entity sync plan update.",
      "",
      `- Plan ID: ${plan.planId}`,
      `- Source org: ${inputs.sourceOrg}`,
      `- Root: ${inputs.rootType} ${inputs.rootId}`,
      `- Generated: ${plan.generatedAt}`,
    ].join("\n");

  const result = await git.commitFiles({
    files: [
      {
        absolutePath: planAbsolutePath,
        repoPath: toRepoRelativePath(planAbsolutePath, workspaceRoot),
      },
      {
        absolutePath: manifestAbsolutePath,
        repoPath: repoPathFromAbsolute(workspaceRoot, manifestAbsolutePath),
      },
    ],
    owner,
    repo,
    branchName,
    baseBranch: inputs.prBaseBranch || "main",
    commitMessage: inputs.commitMessage || "chore: update entity sync plan",
    createPr: inputs.createPr ?? true,
    prTitle,
    prBody,
  });

  core.info(
    inputs.createPr
      ? `Created branch ${result.branchName} and opened pull request`
      : `Committed plan to branch ${result.branchName}`
  );
  core.setOutput("branch-name", result.branchName);
}

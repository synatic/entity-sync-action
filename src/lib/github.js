import { Octokit } from "octokit";
import fs from "node:fs";
import path from "node:path";

export class GitHubCommit {
  /**
   * @param {string} token
   */
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * @param {string} owner
   * @param {string} repo
   * @param {string} baseBranch
   * @returns {Promise<string>}
   */
  async getDefaultBranch(owner, repo, baseBranch) {
    if (baseBranch) {
      return baseBranch;
    }

    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return data.default_branch;
  }

  /**
   * @param {string} owner
   * @param {string} repo
   * @param {string} baseBranch
   * @returns {Promise<string>}
   */
  async getBaseSha(owner, repo, baseBranch) {
    const { data: baseRef } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    return baseRef.object.sha;
  }

  /**
   * @param {Array<{ absolutePath: string, repoPath: string }>} files
   * @param {string} owner
   * @param {string} repo
   * @param {string} branchName
   * @param {string} baseBranch
   * @param {string} commitMessage
   * @param {boolean} createPr
   * @param {string} prTitle
   * @param {string} prBody
   * @returns {Promise<{ branchName: string, commitSha: string }>}
   */
  async commitFiles({
    files,
    owner,
    repo,
    branchName,
    baseBranch,
    commitMessage,
    createPr,
    prTitle,
    prBody,
  }) {
    const resolvedBaseBranch = await this.getDefaultBranch(owner, repo, baseBranch);
    const baseSha = await this.getBaseSha(owner, repo, resolvedBaseBranch);

    const { data: baseCommit } = await this.octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha,
    });

    try {
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });
    } catch (error) {
      if (error.status !== 422) {
        throw error;
      }
    }

    const tree = files.map((file) => ({
      path: file.repoPath,
      mode: "100644",
      type: "blob",
      content: fs.readFileSync(file.absolutePath, "utf8"),
    }));

    const { data: newTree } = await this.octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseCommit.tree.sha,
      tree,
    });

    const { data: newCommit } = await this.octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [baseSha],
    });

    await this.octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: newCommit.sha,
      force: true,
    });

    if (createPr) {
      await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: prTitle,
        head: branchName,
        base: resolvedBaseBranch,
        body: prBody,
      });
    }

    return {
      branchName,
      commitSha: newCommit.sha,
    };
  }
}

/**
 * @returns {string}
 */
export function createBranchName() {
  return `entity-sync-plan-${new Date()
    .toISOString()
    .replaceAll(":", "-")
    .split(".")[0]}`;
}

/**
 * @param {string} workspaceRoot
 * @param {string} absolutePath
 * @returns {string}
 */
export function repoPathFromAbsolute(workspaceRoot, absolutePath) {
  return path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
}

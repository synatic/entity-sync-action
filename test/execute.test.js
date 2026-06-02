import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  setOutput: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
  setFailed: vi.fn(),
}));

import * as core from "@actions/core";
import { runExecuteCommand } from "../src/commands/execute.js";
import { EntitySyncApiClient } from "../src/lib/api-client.js";
import { writePlanFiles } from "../src/lib/fs.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("runExecuteCommand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "entity-sync-exec-"));
    process.env.GITHUB_WORKSPACE = workspace;

    writePlanFiles(
      {
        planId: "plan-1",
        sourceOrgId: "org-1",
        rootType: "flow",
        rootId: "507f1f77bcf86cd799439011",
        generatedAt: "2026-05-28T10:00:00.000Z",
        options: {},
        steps: [{ order: 1 }],
      },
      ".synatic/plans/flow.json"
    );
  });

  it("fails when preview reports conflicts and fail-on-conflict is true", async () => {
    vi.spyOn(EntitySyncApiClient.prototype, "preview").mockResolvedValue({
      planId: "plan-1",
      summary: { total: 2, toConflict: 1 },
      actions: [],
      warnings: [],
    });

    await expect(
      runExecuteCommand({
        command: "execute",
        apiUrl: "https://api.example.com",
        apiKey: "syn_api_test",
        planPath: ".synatic/plans/flow.json",
        destOrgId: "507f1f77bcf86cd799439012",
        previewFirst: true,
        previewOnly: false,
        failOnConflict: true,
      })
    ).rejects.toThrow(/1 conflict/);

    expect(core.setOutput).toHaveBeenCalledWith("conflicts", "1");
  });

  it("stops after preview when preview-only is true", async () => {
    const preview = vi
      .spyOn(EntitySyncApiClient.prototype, "preview")
      .mockResolvedValue({
        planId: "plan-1",
        summary: { total: 1, toConflict: 0 },
        actions: [],
        warnings: [],
      });
    const execute = vi.spyOn(EntitySyncApiClient.prototype, "execute");

    await runExecuteCommand({
      command: "execute",
      apiUrl: "https://api.example.com",
      apiKey: "syn_api_test",
      planPath: ".synatic/plans/flow.json",
      destOrgId: "507f1f77bcf86cd799439012",
      previewFirst: true,
      previewOnly: true,
      failOnConflict: true,
    });

    expect(preview).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });
});

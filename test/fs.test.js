import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readPlanFile,
  resolvePlanPath,
  validatePlan,
  writePlanFiles,
} from "../src/lib/fs.js";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
  delete process.env.GITHUB_WORKSPACE;
});

function createTempWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "entity-sync-"));
  tempDirs.push(dir);
  process.env.GITHUB_WORKSPACE = dir;
  return dir;
}

describe("plan file helpers", () => {
  it("writes plan and manifest files", () => {
    const workspace = createTempWorkspace();
    const plan = {
      planId: "plan-1",
      sourceOrgId: "org-1",
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [{ order: 1 }],
    };

    writePlanFiles(plan, ".synatic/plans/flow.json");

    const planPath = resolvePlanPath(".synatic/plans/flow.json");
    const manifestPath = resolvePlanPath(".synatic/plans/manifest.json");

    expect(fs.existsSync(planPath)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(planPath, "utf8")).planId).toBe("plan-1");
    expect(JSON.parse(fs.readFileSync(manifestPath, "utf8")).planFile).toBe(
      ".synatic/plans/flow.json"
    );
    expect(workspace).toBeTruthy();
  });

  it("reads and validates a plan file", () => {
    createTempWorkspace();
    const plan = {
      planId: "plan-1",
      steps: [],
    };

    writePlanFiles(
      {
        ...plan,
        sourceOrgId: "org-1",
        rootType: "flow",
        rootId: "507f1f77bcf86cd799439011",
        generatedAt: "2026-05-28T10:00:00.000Z",
        options: {},
      },
      ".synatic/plans/flow.json"
    );

    const loaded = readPlanFile(".synatic/plans/flow.json");
    expect(loaded.planId).toBe("plan-1");
  });

  it("throws when plan file is missing", () => {
    createTempWorkspace();
    expect(() => readPlanFile(".synatic/plans/missing.json")).toThrow(
      /Plan file not found/
    );
  });

  it("validates required plan fields", () => {
    expect(() => validatePlan({}, "plan.json")).toThrow(/planId is required/);
    expect(() => validatePlan({ planId: "x" }, "plan.json")).toThrow(
      /steps must be an array/
    );
  });
});

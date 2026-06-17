import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  setOutput: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  setFailed: vi.fn(),
}));

import * as core from "@actions/core";
import { parseInputs, parsePlanOptions, parseRoots } from "../src/lib/inputs.js";

describe("parseRoots", () => {
  it("parses a valid roots array", () => {
    expect(
      parseRoots(
        '[{"rootType":"solution","rootId":"67cee4ac1c53a7be24dc77b7"},{"rootType":"serviceView","rootId":"abc"}]'
      )
    ).toEqual([
      { rootType: "solution", rootId: "67cee4ac1c53a7be24dc77b7" },
      { rootType: "serviceView", rootId: "abc" },
    ]);
  });

  it("throws for invalid JSON", () => {
    expect(() => parseRoots("{invalid")).toThrow(/Invalid roots JSON/);
  });

  it("throws for empty array", () => {
    expect(() => parseRoots("[]")).toThrow(/non-empty JSON array/);
  });

  it("throws for duplicate roots", () => {
    expect(() =>
      parseRoots(
        '[{"rootType":"parameter","rootId":"P1"},{"rootType":"parameter","rootId":"P1"}]'
      )
    ).toThrow(/duplicate root/);
  });
});

describe("parsePlanOptions", () => {
  it("parses a valid JSON object", () => {
    expect(parsePlanOptions('{"includeTriggers": true}')).toEqual({
      includeTriggers: true,
    });
  });

  it("throws for invalid JSON", () => {
    expect(() => parsePlanOptions("{invalid")).toThrow(/Invalid plan-options JSON/);
  });

  it("throws for non-object values", () => {
    expect(() => parsePlanOptions("[]")).toThrow(/must be a JSON object/);
  });
});

describe("parseInputs", () => {
  beforeEach(() => {
    vi.mocked(core.getInput).mockReset();
  });

  it("parses plan command inputs", () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      const values = {
        command: "plan",
        "api-url": "https://api.example.com/",
        "api-key": "syn_api_test",
        "source-org-id": "60ff27eab96f22106d98f1f2",
        "root-type": "flow",
        "root-id": "507f1f77bcf86cd799439011",
        "plan-path": ".synatic/plans/flow.json",
        "plan-options": '{"includeReverseDeps": true}',
        "auto-commit": "true",
        "create-pr": "false",
        "pr-base-branch": "main",
      };
      return values[name] ?? "";
    });

    const inputs = parseInputs("plan");

    expect(inputs.command).toBe("plan");
    expect(inputs.apiUrl).toBe("https://api.example.com");
    expect(inputs.sourceOrgId).toBe("60ff27eab96f22106d98f1f2");
    expect(inputs.planOptions).toEqual({ includeReverseDeps: true });
    expect(inputs.autoCommit).toBe(true);
    expect(inputs.createPr).toBe(false);
  });

  it("parses plan command inputs with roots", () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      const values = {
        command: "plan",
        "api-url": "https://api.example.com",
        "api-key": "syn_api_test",
        "source-org-id": "60ff27eab96f22106d98f1f2",
        roots: '[{"rootType":"solution","rootId":"S1"},{"rootType":"serviceView","rootId":"SV1"}]',
        "plan-path": ".synatic/plans/bundle.json",
      };
      return values[name] ?? "";
    });

    const inputs = parseInputs("plan");

    expect(inputs.roots).toEqual([
      { rootType: "solution", rootId: "S1" },
      { rootType: "serviceView", rootId: "SV1" },
    ]);
    expect(inputs.rootType).toBeUndefined();
  });

  it("rejects roots together with root-type", () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      const values = {
        "api-url": "https://api.example.com",
        "api-key": "syn_api_test",
        "source-org-id": "60ff27eab96f22106d98f1f2",
        roots: '[{"rootType":"flow","rootId":"F1"}]',
        "root-type": "flow",
        "root-id": "F1",
      };
      return values[name] ?? "";
    });

    expect(() => parseInputs("plan")).toThrow(/not both/);
  });

  it("parses execute command inputs with defaults", () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      const values = {
        command: "execute",
        "api-url": "https://api.example.com",
        "api-key": "syn_api_test",
        "dest-org-id": "507f1f77bcf86cd799439012",
        "plan-path": ".synatic/plans/flow.json",
      };
      return values[name] ?? "";
    });

    const inputs = parseInputs("execute");

    expect(inputs.command).toBe("execute");
    expect(inputs.destOrgId).toBe("507f1f77bcf86cd799439012");
    expect(inputs.previewFirst).toBe(true);
    expect(inputs.previewOnly).toBe(false);
    expect(inputs.failOnConflict).toBe(true);
  });

  it("rejects invalid command", () => {
    expect(() => parseInputs("sync")).toThrow(/Invalid command/);
  });

  it("rejects invalid root type", () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      const values = {
        "api-url": "https://api.example.com",
        "api-key": "syn_api_test",
        "source-org-id": "60ff27eab96f22106d98f1f2",
        "root-type": "invalid",
        "root-id": "507f1f77bcf86cd799439011",
      };
      return values[name] ?? "";
    });

    expect(() => parseInputs("plan")).toThrow(/Invalid root-type/);
  });
});

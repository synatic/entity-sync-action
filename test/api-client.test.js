import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntitySyncApiClient } from "../src/lib/api-client.js";

function createMockClient(responses) {
  const post = vi.fn(async (url, options) => {
    const key = `POST ${url}`;
    const handler = responses[key];
    if (!handler) {
      throw new Error(`Unexpected POST ${url}`);
    }
    return handler(options);
  });

  const get = vi.fn(async (url) => {
    const key = `GET ${url}`;
    const handler = responses[key];
    if (!handler) {
      throw new Error(`Unexpected GET ${url}`);
    }
    return handler();
  });

  const client = new EntitySyncApiClient({
    apiUrl: "https://api.example.com",
    apiKey: "syn_api_test",
  });

  client.client = { post, get };
  return { client, post, get };
}

describe("EntitySyncApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls plan against the source org", async () => {
    const plan = {
      planId: "plan-1",
      sourceOrgId: "org-1",
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [],
    };

    const { client, post } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-uat/entity-sync/plan":
        async (options) => ({
          statusCode: 200,
          body: plan,
          request: { options },
        }),
    });

    const result = await client.plan("acme-uat", {
      rootType: "flow",
      rootId: "507f1f77bcf86cd799439011",
      options: {},
    });

    expect(result.planId).toBe("plan-1");
    expect(post).toHaveBeenCalledOnce();
  });

  it("calls plan with a roots array", async () => {
    const plan = {
      planId: "plan-multi",
      sourceOrgId: "org-1",
      roots: [
        { rootType: "parameter", rootId: "P1" },
        { rootType: "parameter", rootId: "P2" },
      ],
      generatedAt: "2026-05-28T10:00:00.000Z",
      options: {},
      steps: [],
    };

    const { client, post } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-uat/entity-sync/plan":
        async (options) => ({
          statusCode: 200,
          body: plan,
          request: { options },
        }),
    });

    const result = await client.plan("acme-uat", {
      roots: [
        { rootType: "parameter", rootId: "P1" },
        { rootType: "parameter", rootId: "P2" },
      ],
      options: {},
    });

    expect(result.roots).toHaveLength(2);
    expect(post).toHaveBeenCalledOnce();
    const callBody = post.mock.calls[0][1].json;
    expect(callBody.roots).toHaveLength(2);
  });

  it("throws a readable error for failed preview", async () => {
    const { client } = createMockClient({
      "POST https://api.example.com/v1/organizations/acme-prod/entity-sync/preview":
        async () => ({
          statusCode: 400,
          body: {
            message: "plan.planId is required",
            code: "bad_request",
          },
        }),
    });

    await expect(
      client.preview("acme-prod", {
        planId: "",
        steps: [],
      })
    ).rejects.toThrow(/Preview failed \(HTTP 400\)/);
  });

  it("fetches run audit details", async () => {
    const { client } = createMockClient({
      "GET https://api.example.com/v1/organizations/acme-prod/entity-sync/runs/run-1":
        async () => ({
          statusCode: 200,
          body: {
            runId: "run-1",
            status: "completed",
            steps: [],
          },
        }),
    });

    const run = await client.getRun("acme-prod", "run-1");
    expect(run.status).toBe("completed");
  });
});

import { describe, expect, it } from "vitest";
import { formatApiError } from "../src/lib/api-errors.js";

describe("formatApiError", () => {
  it("includes request context and server error guidance for 500 responses", () => {
    const message = formatApiError(
      {
        statusCode: 500,
        body: {
          statusCode: 500,
          url: "/v1/organizations/development/entity-sync/plan",
          method: "POST",
          message: "Cannot read properties of undefined (reading 'length')",
          code: "internal_error",
          error: {},
        },
      },
      "Plan",
      {
        method: "POST",
        url: "https://api.us.synatic.dev/v1/organizations/development/entity-sync/plan",
        requestBody: {
          rootType: "flow",
          rootId: "611a1a0493eda02d8728b116",
          options: { includeReverseDeps: true },
        },
      }
    );

    expect(message).toContain("Plan failed (HTTP 500)");
    expect(message).toContain(
      "POST https://api.us.synatic.dev/v1/organizations/development/entity-sync/plan"
    );
    expect(message).toContain('"rootType":"flow"');
    expect(message).toContain("Cannot read properties of undefined (reading 'length')");
    expect(message).toContain("Code: internal_error");
    expect(message).toContain("server-side error from the Synatic API");
  });

  it("adds auth guidance for 403 responses", () => {
    const message = formatApiError(
      {
        statusCode: 403,
        body: {
          message: "Forbidden",
        },
      },
      "Plan",
      {
        method: "POST",
        url: "https://api.example.com/v1/organizations/acme/entity-sync/plan",
      }
    );

    expect(message).toContain("Check that the API key is valid");
  });
});

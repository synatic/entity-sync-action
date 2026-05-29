import { RetryClient } from "./retry.js";

/**
 * @typedef {Object} ApiClientConfig
 * @property {string} apiUrl
 * @property {string} apiKey
 */

export class EntitySyncApiClient {
  /**
   * @param {ApiClientConfig} config
   */
  constructor(config) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.client = new RetryClient().extend({
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      responseType: "json",
      throwHttpErrors: false,
    });
  }

  /**
   * @param {string} orgName
   * @returns {string}
   */
  entitySyncBase(orgName) {
    return `${this.apiUrl}/v1/organizations/${encodeURIComponent(orgName)}/entity-sync`;
  }

  /**
   * @param {import('got').Response} response
   * @param {string} action
   * @returns {Promise<never>}
   */
  async throwForResponse(response, action) {
    const body = response.body;
    const message =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `Request failed with status ${response.statusCode}`;
    const code =
      body && typeof body === "object" && "code" in body
        ? String(body.code)
        : undefined;

    const detail = code ? `${message} (code: ${code})` : message;
    throw new Error(`${action} failed (${response.statusCode}): ${detail}`);
  }

  /**
   * @param {string} sourceOrg
   * @param {{ rootType: string, rootId: string, options?: Record<string, unknown> }} body
   * @returns {Promise<import('../types.js').SyncPlan>}
   */
  async plan(sourceOrg, body) {
    const response = await this.client.post(`${this.entitySyncBase(sourceOrg)}/plan`, {
      json: body,
    });

    if (response.statusCode !== 200) {
      await this.throwForResponse(response, "Plan");
    }

    return /** @type {import('../types.js').SyncPlan} */ (response.body);
  }

  /**
   * @param {string} destOrg
   * @param {import('../types.js').SyncPlan} plan
   * @returns {Promise<Record<string, unknown>>}
   */
  async preview(destOrg, plan) {
    const response = await this.client.post(
      `${this.entitySyncBase(destOrg)}/preview`,
      {
        json: { plan },
      }
    );

    if (response.statusCode !== 200) {
      await this.throwForResponse(response, "Preview");
    }

    return /** @type {Record<string, unknown>} */ (response.body);
  }

  /**
   * @param {string} destOrg
   * @param {import('../types.js').SyncPlan} plan
   * @returns {Promise<Record<string, unknown>>}
   */
  async execute(destOrg, plan) {
    const response = await this.client.post(
      `${this.entitySyncBase(destOrg)}/execute`,
      {
        json: { plan },
      }
    );

    if (response.statusCode !== 200) {
      await this.throwForResponse(response, "Execute");
    }

    return /** @type {Record<string, unknown>} */ (response.body);
  }

  /**
   * @param {string} destOrg
   * @param {string} runId
   * @returns {Promise<Record<string, unknown>>}
   */
  async getRun(destOrg, runId) {
    const response = await this.client.get(
      `${this.entitySyncBase(destOrg)}/runs/${encodeURIComponent(runId)}`
    );

    if (response.statusCode !== 200) {
      await this.throwForResponse(response, "Get run");
    }

    return /** @type {Record<string, unknown>} */ (response.body);
  }
}

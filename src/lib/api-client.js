import { RetryClient } from "./retry.js";
import { throwForApiResponse } from "./api-errors.js";

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
   * @param {string} orgId
   * @returns {string}
   */
  entitySyncBase(orgId) {
    return `${this.apiUrl}/v1/organizations/${encodeURIComponent(orgId)}/entity-sync`;
  }

  /**
   * @param {string} sourceOrgId
   * @param {{ roots?: import('../types.js').EntitySyncRoot[], rootType?: string, rootId?: string, options?: Record<string, unknown> }} body
   * @returns {Promise<import('../types.js').SyncPlan>}
   */
  async plan(sourceOrgId, body) {
    const url = `${this.entitySyncBase(sourceOrgId)}/plan`;
    const response = await this.client.post(url, {
      json: body,
    });

    if (response.statusCode !== 200) {
      throwForApiResponse(response, "Plan", {
        method: "POST",
        url,
        requestBody: body,
      });
    }

    return /** @type {import('../types.js').SyncPlan} */ (response.body);
  }

  /**
   * @param {string} destOrgId
   * @param {import('../types.js').SyncPlan} plan
   * @returns {Promise<Record<string, unknown>>}
   */
  async preview(destOrgId, plan) {
    const url = `${this.entitySyncBase(destOrgId)}/preview`;
    const response = await this.client.post(url, {
      json: { plan },
    });

    if (response.statusCode !== 200) {
      throwForApiResponse(response, "Preview", {
        method: "POST",
        url,
        requestBody: {
          planId: plan.planId,
          stepCount: plan.steps.length,
        },
      });
    }

    return /** @type {Record<string, unknown>} */ (response.body);
  }

  /**
   * @param {string} destOrgId
   * @param {import('../types.js').SyncPlan} plan
   * @returns {Promise<Record<string, unknown>>}
   */
  async execute(destOrgId, plan) {
    const url = `${this.entitySyncBase(destOrgId)}/execute`;
    const response = await this.client.post(url, {
      json: { plan },
    });

    if (response.statusCode !== 200) {
      throwForApiResponse(response, "Execute", {
        method: "POST",
        url,
        requestBody: {
          planId: plan.planId,
          stepCount: plan.steps.length,
        },
      });
    }

    return /** @type {Record<string, unknown>} */ (response.body);
  }

  /**
   * @param {string} destOrgId
   * @param {string} runId
   * @returns {Promise<Record<string, unknown>>}
   */
  async getRun(destOrgId, runId) {
    const url = `${this.entitySyncBase(destOrgId)}/runs/${encodeURIComponent(runId)}`;
    const response = await this.client.get(url);

    if (response.statusCode !== 200) {
      throwForApiResponse(response, "Get run", {
        method: "GET",
        url,
      });
    }

    return /** @type {Record<string, unknown>} */ (response.body);
  }
}

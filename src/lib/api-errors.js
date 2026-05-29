/**
 * @param {unknown} body
 * @returns {Record<string, unknown> | null}
 */
function asErrorBody(body) {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return /** @type {Record<string, unknown>} */ (body);
  }
  return null;
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function stringifyDetail(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * @typedef {Object} ApiErrorContext
 * @property {string} [url]
 * @property {string} [method]
 * @property {Record<string, unknown>} [requestBody]
 */

/**
 * @param {import('got').Response} response
 * @param {string} action
 * @param {ApiErrorContext} [context]
 * @returns {string}
 */
export function formatApiError(response, action, context = {}) {
  const body = asErrorBody(response.body);
  const lines = [`${action} failed (HTTP ${response.statusCode})`];

  if (context.method && context.url) {
    lines.push(`${context.method} ${context.url}`);
  } else if (context.url) {
    lines.push(`URL: ${context.url}`);
  }

  if (context.requestBody) {
    lines.push(`Request body: ${JSON.stringify(context.requestBody)}`);
  }

  if (body?.url) {
    lines.push(`API path: ${String(body.url)}`);
  }

  if (body?.method) {
    lines.push(`API method: ${String(body.method)}`);
  }

  if (body?.message) {
    lines.push(`Message: ${String(body.message)}`);
  }

  if (body?.code) {
    lines.push(`Code: ${String(body.code)}`);
  }

  const errorDetail = stringifyDetail(body?.error);
  if (errorDetail && errorDetail !== "{}") {
    lines.push(`Details: ${errorDetail}`);
  }

  if (!body?.message && typeof response.body === "string" && response.body) {
    lines.push(`Response: ${response.body}`);
  }

  if (!body?.message && response.body && typeof response.body !== "string") {
    const raw = stringifyDetail(response.body);
    if (raw) {
      lines.push(`Response body: ${raw}`);
    }
  }

  if (response.statusCode >= 500) {
    lines.push(
      "This is a server-side error from the Synatic API. Verify the org, root entity, and API URL are correct. If they are, share the details above with Synatic support."
    );
  } else if (response.statusCode === 401 || response.statusCode === 403) {
    lines.push(
      "Check that the API key is valid for the org in the URL and has access to entity-sync."
    );
  } else if (response.statusCode === 404) {
    lines.push(
      "The org or root entity may not exist, or the API key may not have access to this org."
    );
  }

  return lines.join("\n");
}

/**
 * @param {import('got').Response} response
 * @param {string} action
 * @param {ApiErrorContext} [context]
 * @returns {never}
 */
export function throwForApiResponse(response, action, context = {}) {
  throw new Error(formatApiError(response, action, context));
}

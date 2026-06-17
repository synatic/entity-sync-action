/**
 * @typedef {Object} EntitySyncRoot
 * @property {string} rootType
 * @property {string} rootId
 */

/**
 * @typedef {Object} ActionInputs
 * @property {'plan' | 'execute'} command
 * @property {string} apiUrl
 * @property {string} apiKey
 * @property {string} planPath
 * @property {string} [sourceOrgId]
 * @property {string} [rootType]
 * @property {string} [rootId]
 * @property {EntitySyncRoot[]} [roots]
 * @property {Record<string, unknown>} [planOptions]
 * @property {boolean} [autoCommit]
 * @property {boolean} [createPr]
 * @property {string} [prTitle]
 * @property {string} [prBody]
 * @property {string} [prBaseBranch]
 * @property {string} [commitMessage]
 * @property {string} [destOrgId]
 * @property {boolean} [previewFirst]
 * @property {boolean} [previewOnly]
 * @property {boolean} [failOnConflict]
 */

/**
 * @typedef {Object} SyncPlan
 * @property {string} planId
 * @property {string} sourceOrgId
 * @property {string} [rootType]
 * @property {string} [rootId]
 * @property {EntitySyncRoot[]} [roots]
 * @property {string} generatedAt
 * @property {Record<string, unknown>} options
 * @property {Array<Record<string, unknown>>} steps
 */

export {};

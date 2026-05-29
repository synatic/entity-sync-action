import { got } from "got";

/**
 * @typedef {Object} RetryConfig
 * @property {number} [maxRetries]
 * @property {number} [initialDelay]
 * @property {number} [maxDelay]
 * @property {number} [exponentialBase]
 */

export class RetryClient {
  /**
   * @param {RetryConfig} config
   */
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 5,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      exponentialBase: config.exponentialBase ?? 2,
    };
  }

  /**
   * @param {import('got').ExtendOptions} options
   * @returns {import('got').Got}
   */
  extend(options) {
    return got.extend({
      ...options,
      retry: {
        limit: 0,
      },
      hooks: {
        beforeRetry: [
          async (_options, error, retryCount) => {
            if (error?.response?.statusCode !== 429) {
              throw error;
            }

            if (retryCount >= this.config.maxRetries) {
              throw error;
            }

            const delay = Math.min(
              this.config.initialDelay *
                Math.pow(this.config.exponentialBase, retryCount),
              this.config.maxDelay
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
          },
        ],
      },
    });
  }
}

/**
 * Base error class for eBay API errors
 */
export class EbayAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'EbayAPIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when eBay API rate limit is exceeded
 */
export class EbayRateLimitError extends EbayAPIError {
  constructor(message: string = 'eBay API rate limit exceeded') {
    super(message, 429);
    this.name = 'EbayRateLimitError';
  }
}

/**
 * Error thrown when parsing eBay response fails
 */
export class EbayParseError extends Error {
  constructor(message: string, public rawData?: any) {
    super(message);
    this.name = 'EbayParseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when required environment variables are missing
 */
export class EbayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EbayConfigError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Expected failures, so callers can tell them apart from programming errors. */
export class AppError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends AppError {}
export class NotFoundError extends AppError {}
export class ServiceError extends AppError {}

/**
 * Plain-language message that is safe to show to a user.
 * @param {unknown} error
 * @returns {string}
 */
export function userMessage(error) {
  if (error instanceof ValidationError || error instanceof NotFoundError) return error.message;
  if (error instanceof ServiceError) return `${error.message} Please try again.`;
  return 'Something went wrong. Please try again.';
}

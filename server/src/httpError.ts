/** An error that becomes an HTTP response (status + machine-readable code + safe message). */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

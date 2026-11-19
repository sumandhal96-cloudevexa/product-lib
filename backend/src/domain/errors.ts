/** Errors safe to describe to API clients. Anything else becomes a generic 500. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', message, fields);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}

/** A dependency we call (product source, mail server) failed. */
export class UpstreamError extends AppError {
  constructor(code: string, message: string) {
    super(502, code, message);
  }
}

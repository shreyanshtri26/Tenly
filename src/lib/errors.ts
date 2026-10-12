// Typed application errors. Route handlers map these to HTTP status codes in
// one place (`toHttpResponse`) instead of scattering status logic everywhere.

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sign in required") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this") {
    super(message, 403, "forbidden");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "not_found");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "bad_request");
  }
}

export class LimitExceededError extends AppError {
  constructor(message: string) {
    super(message, 402, "plan_limit_exceeded");
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests, try again later") {
    super(message, 429, "rate_limited");
  }
}

export function toHttpResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "internal_error", message: "Something went wrong" }, { status: 500 });
}

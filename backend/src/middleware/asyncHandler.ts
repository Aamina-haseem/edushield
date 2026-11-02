import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 does not catch rejections from async route handlers — an unhandled one
 * crashes the whole process (observed: ml-service 404 -> unhandled rejection -> process
 * exit). Wrapping every async handler routes the error to Express's error middleware instead. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

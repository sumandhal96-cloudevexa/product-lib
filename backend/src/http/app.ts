import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { AppError, NotFoundError, ValidationError } from '../domain/errors.ts';
import type { Logger } from '../logger.ts';
import type { CatalogueService } from '../services/catalogueService.ts';
import type { EnquiryService } from '../services/enquiryService.ts';

export interface AppDeps {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  logger: Logger;
  corsOrigins: string[];
  trustProxy: number;
  /** Overridable so tests can exercise the limiter quickly. */
  enquiryRateLimit?: { windowMs: number; limit: number };
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const route =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function createApp(deps: AppDeps): express.Express {
  const { catalogue, enquiries, logger } = deps;
  const app = express();

  app.set('trust proxy', deps.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      // Explicit allow-list; no wildcard.
      origin: (origin, cb) => cb(null, !origin || deps.corsOrigins.includes(origin)),
      methods: ['GET', 'POST'],
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

  const enquiryLimit = deps.enquiryRateLimit ?? { windowMs: 15 * 60_000, limit: 5 };
  const enquiryLimiter = rateLimit({
    ...enquiryLimit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many enquiries, please try again later' } }),
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/products/featured', route(async (_req, res) => {
    res.json({ products: await catalogue.getFeatured() });
  }));

  app.get('/api/categories', route(async (_req, res) => {
    res.json({ categories: await catalogue.listCategories() });
  }));

  app.get('/api/categories/:name/products', route(async (req, res) => {
    const name = String(req.params.name ?? '');
    if (name.length === 0 || name.length > 100) throw new ValidationError('Invalid category');
    res.json(await catalogue.getCategory(name));
  }));

  app.get('/api/products', route(async (req, res) => {
    const q = req.query.q;
    if (typeof q !== 'string' || q.trim().length === 0 || q.length > 100) {
      throw new ValidationError('Search term must be 1 to 100 characters', { q: 'Enter a search term' });
    }
    res.json({ query: q.trim(), products: await catalogue.search(q) });
  }));

  app.get('/api/products/:id', route(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid product id');
    res.json({ product: await catalogue.getProduct(id) });
  }));

  app.post('/api/enquiries', enquiryLimiter, route(async (req, res) => {
    await enquiries.submit(req.body);
    res.status(201).json({ status: 'sent' });
  }));

  app.use((_req, _res, next) => next(new NotFoundError('Not found')));

  // Error handler: only AppErrors reach the client with detail; everything else is a generic 500.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      if (err.status >= 500) logger.error('Request failed', { code: err.code, path: req.path });
      res.status(err.status).json({
        error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
      });
      return;
    }
    const type = (err as { type?: string } | null)?.type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' } });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
      return;
    }
    logger.error('Unhandled error', { path: req.path, name: err instanceof Error ? err.name : 'unknown' });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  return app;
}

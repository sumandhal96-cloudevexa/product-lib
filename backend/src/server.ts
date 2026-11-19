import { CachedProductProvider } from './adapters/cachedProductProvider.ts';
import { FakeStoreProductProvider } from './adapters/fakeStoreProductProvider.ts';
import { SmtpEmailSender } from './adapters/smtpEmailSender.ts';
import { loadConfig } from './config.ts';
import { createApp } from './http/app.ts';
import { createLogger } from './logger.ts';
import { CatalogueService } from './services/catalogueService.ts';
import { EnquiryService } from './services/enquiryService.ts';

/**
 * Composition root: the only place that chooses concrete adapters.
 * To change the product source or email provider, swap the two lines marked ADAPTER.
 */
const logger = createLogger();
const config = loadConfig();

const productProvider = new CachedProductProvider( // ADAPTER: product data source
  new FakeStoreProductProvider(config.fakeStoreBaseUrl),
  config.cacheTtlSeconds,
);
const emailSender = new SmtpEmailSender(config.smtp); // ADAPTER: email provider

const app = createApp({
  catalogue: new CatalogueService(
    productProvider,
    { featuredIds: config.featuredProductIds, categoryTopRatedCount: config.categoryTopRatedCount },
    logger,
  ),
  enquiries: new EnquiryService(
    productProvider,
    emailSender,
    { salesInbox: config.salesInboxEmail, from: config.mailFrom },
    logger,
  ),
  logger,
  corsOrigins: config.corsOrigins,
  trustProxy: config.trustProxy,
});

const server = app.listen(config.port, () => logger.info('API listening', { port: config.port }));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info('Shutting down', { signal });
    server.close(() => process.exit(0));
  });
}

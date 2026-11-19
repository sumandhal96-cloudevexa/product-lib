export interface Config {
  port: number;
  fakeStoreBaseUrl: string;
  cacheTtlSeconds: number;
  featuredProductIds: number[];
  categoryTopRatedCount: number;
  smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string };
  mailFrom: string;
  salesInboxEmail: string;
  corsOrigins: string[];
  trustProxy: number;
}

type Env = Record<string, string | undefined>;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fail fast: a mis-configured service should refuse to start rather than run with unsafe guesses. */
export function loadConfig(env: Env = process.env): Config {
  const problems: string[] = [];

  const str = (key: string, fallback?: string): string => {
    const value = env[key]?.trim() || fallback;
    if (!value) problems.push(`${key} is required`);
    return value ?? '';
  };
  const int = (key: string, fallback: number, min = 0, max = 65535): number => {
    const raw = env[key]?.trim();
    if (raw === undefined || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      problems.push(`${key} must be an integer between ${min} and ${max}`);
      return fallback;
    }
    return n;
  };
  const email = (key: string): string => {
    const value = str(key);
    if (value && !EMAIL_RE.test(value)) problems.push(`${key} must be an email address`);
    return value;
  };

  const featured = (env.FEATURED_PRODUCT_IDS ?? '3,5,7,11,12')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (featured.some((n) => !Number.isInteger(n) || n <= 0)) {
    problems.push('FEATURED_PRODUCT_IDS must be a comma-separated list of positive integers');
  }

  const fakeStoreBaseUrl = str('FAKE_STORE_BASE_URL', 'https://fakestoreapi.com');
  if (!/^https?:\/\//i.test(fakeStoreBaseUrl)) problems.push('FAKE_STORE_BASE_URL must be an http(s) URL');

  const config: Config = {
    port: int('PORT', 3000, 1),
    fakeStoreBaseUrl,
    cacheTtlSeconds: int('CACHE_TTL_SECONDS', 300, 0, 86400),
    featuredProductIds: featured,
    categoryTopRatedCount: int('CATEGORY_TOP_RATED_COUNT', 3, 1, 50),
    smtp: {
      host: str('SMTP_HOST'),
      port: int('SMTP_PORT', 1025, 1),
      secure: env.SMTP_SECURE === 'true',
      ...(env.SMTP_USER ? { user: env.SMTP_USER } : {}),
      ...(env.SMTP_PASS ? { pass: env.SMTP_PASS } : {}),
    },
    mailFrom: email('MAIL_FROM'),
    salesInboxEmail: email('SALES_INBOX_EMAIL'),
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxy: int('TRUST_PROXY', 0, 0, 10),
  };

  if (problems.length > 0) throw new Error(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  return config;
}

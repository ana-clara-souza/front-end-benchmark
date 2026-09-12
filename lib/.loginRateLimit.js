const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;


const failures = new Map();

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const maxAttempts = positiveInteger(
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  DEFAULT_MAX_ATTEMPTS,
);
const windowMs =
  positiveInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000;

function getEntry(key, now = Date.now()) {
  const entry = failures.get(key);

  if (entry && now - entry.startedAt >= windowMs) {
    failures.delete(key);
    return undefined;
  }

  return entry;
}

function check(keys) {
  const now = Date.now();
  let retryAfterMs = 0;

  for (const key of keys) {
    const entry = getEntry(key, now);
    if (entry && entry.count >= maxAttempts) {
      retryAfterMs = Math.max(retryAfterMs, windowMs - (now - entry.startedAt));
    }
  }

  return {
    allowed: retryAfterMs === 0,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}

function registerFailure(keys) {
  const now = Date.now();

  for (const key of keys) {
    const entry = getEntry(key, now);
    failures.set(key, {
      count: (entry?.count || 0) + 1,
      startedAt: entry?.startedAt || now,
    });
  }
}

module.exports = { check, registerFailure };

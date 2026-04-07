export interface AuthTestEnvConfig {
  enabled: boolean;
  email: string;
  password: string;
  code: string;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function parseString(value: string | undefined): string {
  return value?.trim() ?? '';
}

export const AUTH_TEST_ENV: AuthTestEnvConfig = {
  enabled: parseBoolean(import.meta.env.VITE_AUTH_TEST_ENABLED, false),
  email: parseString(import.meta.env.VITE_AUTH_TEST_EMAIL).toLowerCase(),
  password: parseString(import.meta.env.VITE_AUTH_TEST_PASSWORD),
  code: parseString(import.meta.env.VITE_AUTH_TEST_CODE),
};

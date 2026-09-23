/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_AUTH_TEST_ENABLED?: string;
  readonly VITE_AUTH_TEST_EMAIL?: string;
  readonly VITE_AUTH_TEST_PASSWORD?: string;
  readonly VITE_AUTH_TEST_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

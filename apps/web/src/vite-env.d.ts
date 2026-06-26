/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL absolut backend untuk deploy terpisah (mis. https://api-5s.up.railway.app). Kosong = origin sama (pakai proxy dev / rewrite). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

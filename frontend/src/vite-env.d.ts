/// <reference types="vite/client" />

// Tell TypeScript about the custom env variables we read from import.meta.env.
interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Let us import the AOS animation library (loaded from a CDN script tag has no
// types, but we import the npm-less version through a tiny ambient module).
declare module "aos";

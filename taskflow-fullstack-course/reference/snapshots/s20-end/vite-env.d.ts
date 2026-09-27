// Declaration merging (06.10): tell TypeScript which VITE_* variables exist.
// Everything in import.meta.env is compiled INTO the bundle: never put secrets here (13.11).
interface ImportMetaEnv {
  /** Optional override of the API base URL. Default: '/api' (through the Vite proxy). */
  readonly VITE_API_BASE_URL?: string;
}

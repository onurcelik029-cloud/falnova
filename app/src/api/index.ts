import type { Api } from './types.ts';
import { createDemoApi } from './demo.ts';
import { createRemoteApi } from './remote.ts';

export * from './types.ts';

/** EXPO_PUBLIC_API_URL tanımlıysa canlı backend, yoksa demo modu. */
export function createApi(): Api {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? createRemoteApi(url) : createDemoApi();
}

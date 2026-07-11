export function tryRequire<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // eslint-disable-next-line global-require
    // @ts-ignore
    return require(name) as T;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn(`Optional module "${name}" not available:`, e?.message || e);
    return null;
  }
}

declare module '*.ink' {
  /** Compiled Ink story JSON, produced at build time by tools/ink-plugin.ts. */
  const story: Record<string, unknown>;
  export default story;
}

import { Compiler } from 'inkjs/full';
import type { Plugin } from 'vite';

/** Compiles `.ink` imports to Ink story JSON at build time, failing the build on Ink errors. */
export function ink(): Plugin {
  return {
    name: 'gridlock-ink',
    transform(source, id) {
      if (!id.endsWith('.ink')) return null;
      const compiler = new Compiler(source);
      let json: string | void;
      try {
        json = compiler.Compile().ToJson();
      } catch (err) {
        const errors = compiler.errors.length ? compiler.errors.join('\n') : String(err);
        this.error(`Ink compile failed for ${id}:\n${errors}`);
      }
      for (const w of compiler.warnings) this.warn(w);
      return { code: `export default ${json};`, map: null };
    },
  };
}

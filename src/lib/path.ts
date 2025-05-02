import { Option as Maybe } from "@swan-io/boxed";
import { basename, extname, resolve } from "path";
import { curry } from "./curry";

export const maybeResolve = curry((cwd: Maybe<string>, program: string) =>
  cwd.mapOr(program, cwd => resolve(cwd, program)),
);

export const isPathToProgram = curry(
  (program: string | string[], path: string) =>
    Array.isArray(program)
      ? program.includes(basename(path))
      : basename(path) === program,
);

export const isPathToScript = curry((ext: string | string[], path: string) =>
  Array.isArray(ext) ? ext.includes(extname(path)) : extname(path) === ext,
);

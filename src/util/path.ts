import path from "path";

export const maybeResolve = (cwd: string | undefined, program: string) =>
  cwd === undefined ? program : path.resolve(cwd, program);

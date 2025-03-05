import path from "path";
import { curry } from "./fp";

export const isPathToProgram = curry(
  (program: string, _path: string) => path.basename(_path) === program,
);

export const isPathToScript = curry((ext: string | RegExp, _path: string) =>
  ext instanceof RegExp
    ? ext.test(path.extname(_path))
    : path.extname(_path) === ext,
);

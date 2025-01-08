import path from "path";
import { match, P } from "ts-pattern";
import { Pattern } from "ts-pattern/types";
import { partition } from "./array_utils";

interface DebugAdapterParams {
  type: string;
  [key: string]: any;
}

type DebugAdapter = (
  argv: string[],
  cwd?: string,
) => DebugAdapterParams | undefined;

const programSpecifierRe = /^-m|-c|-|.*\.py$/;

const isPathToPythonScript = (program: string) =>
  path.extname(program) === ".py";
const isPathToPython = (program: string) => path.basename(program) === "python";
const isWellKnownPythonModule = (program: string) => program === "pytest";
const moduleWithArgs: Pattern<string[]> = ["-m", P.string, ...P.array()];
const scriptWithArgs: Pattern<string[]> = [
  P.when(isPathToPythonScript),
  ...P.array(),
];

const maybeResolve = (cwd: string | undefined, program: string) =>
  cwd === undefined ? program : path.resolve(cwd, program);

// Some possible options for argv:
// [python, ...pythonArgs, program.py, ...programArgs]
// [python, ...pythonArgs, -m, module, ...programArgs]
// [python, ...pythonArgs, -c, code]
// [python, ...pythonArgs, -]
// [program.py, ...programArgs]
// [module, ...programArgs]
export const debugpy: DebugAdapter = (argv, cwd) => {
  const params: DebugAdapterParams = { type: "debugpy" };

  const [program, ...args] = argv;
  if (isPathToPython(program)) {
    if (program !== "python") {
      params.python = maybeResolve(cwd, program);
    }
    const [pythonArgs, programArgv] = partition(args, arg =>
      programSpecifierRe.test(arg),
    );
    if (pythonArgs.length > 0) {
      params.pythonArgs = pythonArgs;
    }
    argv = programArgv;
  }

  if (isWellKnownPythonModule(program)) {
    // prepend with -m to have uniform handling with the case when module is specified
    argv = ["-m", ...argv];
  }

  // Now argv is one of
  //  [program.py, ...programArgs]
  //  [-m module, ...programArgs]
  //  [-c, code]
  //  [-]
  //  [...something else]
  return match(argv)
    .with(moduleWithArgs, ([_, module, ...args]) => ({
      ...params,
      module,
      args,
    }))
    .with(scriptWithArgs, ([program, ...args]) => ({
      ...params,
      program: maybeResolve(cwd, program),
      args,
    }))
    .otherwise(() => {
      console.warn("Cannot debug this command");
      return undefined;
    });
};

export const adapters = [debugpy];

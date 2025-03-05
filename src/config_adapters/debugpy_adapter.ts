import { match, P } from "ts-pattern";
import { Pattern } from "ts-pattern/types";
import { DebugConfigAdapter } from ".";
import { partition } from "../util/array";
import { maybeResolve } from "../util/path";
import { isPathToProgram, isPathToScript } from "../util/predicates";
import { DebugpyLaunchConfiguration } from "./debugpy_schema";

const programSpecifierRe = /^-m|-c|-|.*\.py$/;
const knownModules = ["pytest"];

const moduleWithArgs: Pattern<string[]> = ["-m", P.string, ...P.array()];
const scriptWithArgs: Pattern<string[]> = [
  P.when(isPathToScript(".py")),
  ...P.array(),
];

// Some possible options for argv:
// [python, ...pythonArgs, program.py, ...programArgs]
// [python, ...pythonArgs, -m, module, ...programArgs]
// [python, ...pythonArgs, -c, code]
// [python, ...pythonArgs, -]
// [program.py, ...programArgs]
// [module, ...programArgs]
export const debugpyConfigAdapter: DebugConfigAdapter<
  DebugpyLaunchConfiguration
> = (action, argv, cwd) => {
  if (action !== "launch") {
    console.warn("debugpy supports only launch");
    return;
  }

  const config: DebugpyLaunchConfiguration = {
    type: "debugpy",
    request: "launch",
    name: `Cdb: debugpy`,
  };

  const [program, ...args] = argv;
  if (isPathToProgram("python", program)) {
    if (program !== "python") {
      config.python = maybeResolve(cwd, program);
    }
    const [pythonArgs, programArgv] = partition(
      arg => programSpecifierRe.test(arg),
      args,
    );
    if (pythonArgs.length > 0) {
      config.pythonArgs = pythonArgs;
    }
    argv = programArgv;
  }

  if (knownModules.includes(program)) {
    // prepend with -m to have uniform handling with the case when module is specified
    argv = ["-m", ...argv];
  }

  // Now argv is one of
  //  [program.py, ...programArgs]
  //  [-m, module, ...programArgs]
  //  [-c, code]
  //  [-]
  //  [...something else]
  return match(argv)
    .with(scriptWithArgs, ([program, ...args]) => ({
      ...config,
      program: maybeResolve(cwd, program),
      ...(args.length > 0 && { args }),
    }))
    .with(moduleWithArgs, ([_, module, ...args]) => ({
      ...config,
      module,
      ...(args.length > 0 && { args }),
    }))
    .otherwise(() => {
      console.warn("Cannot debug this command");
      return undefined;
    });
};

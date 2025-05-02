import { Option as Maybe, Result } from "@swan-io/boxed";
import { match, P } from "ts-pattern";
import { DebugConfigAdapter } from ".";
import { Dict, List } from "../lib/collections";
import { either, equals, isUndefined, not, oneOf } from "../lib/operators";
import { isPathToProgram, isPathToScript, maybeResolve } from "../lib/path";
import { DebugpyLaunchConfiguration } from "./debugpy_schema";

const knownModules = ["pytest"];
const scriptFlags = ["-m", "-c", "-"];
const pythonInterpreters = ["python", "python3"];

const isPathToPython = isPathToProgram(pythonInterpreters);
const isPythonScriptOrModule = either(
  isPathToScript(".py"),
  oneOf(knownModules),
);

const checkPathToPython = (p: string): Result<string, string> =>
  isPathToPython(p) ? Result.Ok(p) : Result.Error("Invalid python path");

const checkPathToPythonProgram = (p: string): Result<string, string> =>
  isPythonScriptOrModule(p)
    ? Result.Ok(p)
    : Result.Error("Invalid program path");

const parsePythonArgv = (
  [python, ...pythonArgs]: string[],
  cwd: Maybe<string> = Maybe.None(),
) =>
  python === undefined
    ? Result.Ok({})
    : checkPathToPython(python).map(python => ({
        ...(oneOf(pythonInterpreters, python)
          ? {}
          : { python: maybeResolve(cwd, python) }),
        ...Dict.filterValues({ pythonArgs }, not(List.empty)),
      }));

const parseModuleArgv = ([module, ...args]: string[]) =>
  match(module)
    .when(isUndefined, () => Result.Error("No module specified"))
    .with(P.string.regex(/^[a-zA-Z_]+\w*(\.[a-zA-Z_]+\w*)*$/), () =>
      Result.Ok({ module, ...Dict.filterValues({ args }, not(List.empty)) }),
    )
    .otherwise(() => Result.Error("Invalid module name"));

const parseProgramArgv = (
  [program, ...args]: string[],
  cwd: Maybe<string> = Maybe.None(),
) =>
  match(program)
    .when(isUndefined, () => Result.Error("No file or module specified"))
    .when(oneOf(knownModules), () => parseModuleArgv([program, ...args]))
    .when(equals("-m"), () => parseModuleArgv(args))
    .when(oneOf(["-c", "-"]), () =>
      Result.Error("Can't launch script from stdin or command line"),
    )
    .otherwise(() =>
      checkPathToPythonProgram(program).map(program => ({
        program: maybeResolve(cwd, program),
        ...Dict.filterValues({ args }, not(List.empty)),
      })),
    );

export const debugpyConfigAdapter: DebugConfigAdapter<
  DebugpyLaunchConfiguration
> = (action, argv, cwd = Maybe.None()) => {
  if (action !== "launch") {
    console.warn("debugpy supports only launch");
    return Maybe.None();
  }

  const [pythonArgv, programArgv] = List.partition(
    either(isPythonScriptOrModule, oneOf(scriptFlags)),
    argv,
  );

  return Result.all([
    parsePythonArgv(pythonArgv, cwd),
    parseProgramArgv(programArgv, cwd),
  ])
    .map(([pythonParams, programParams]) => ({
      type: "debugpy" as "debugpy",
      request: "launch" as "launch",
      name: `Cdb: debugpy`,
      ...pythonParams,
      ...programParams,
    }))
    .tapError(console.error)
    .toOption();
};

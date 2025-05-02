import { Option as Maybe, Result } from "@swan-io/boxed";
import { match } from "ts-pattern";
import { DebugConfigAdapter } from ".";
import { Dict, List } from "../lib/collections";
import { either, equals, isUndefined, not } from "../lib/operators";
import { isPathToProgram, isPathToScript, maybeResolve } from "../lib/path";
import { NodeLaunchConfiguration } from "./node_schema";

type RuntimeParams = {
  runtimeExecutable?: string;
  runtimeArgs?: string[];
};

type ProgramParams = {
  program: string;
  args?: string[];
};

const isPathToNodeScript = isPathToScript([
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".cts",
  ".mts",
]);
const checkPathToNodeScript = (p: string): Result<string, string> =>
  isPathToNodeScript(p) ? Result.Ok(p) : Result.Error("Invalid script path");

const isNodeScriptArg = (arg: string, i: number, args: readonly string[]) =>
  isPathToNodeScript(arg) && args[i - 1] !== "-r";

export const parseRuntimeArgv = (
  [runtimeExecutable, ...runtimeArgs]: string[],
  cwd: Maybe<string>,
): Result<RuntimeParams, string> =>
  match(runtimeExecutable)
    .returnType<Result<RuntimeParams, string>>()
    .when(either(isUndefined, equals("node")), () => Result.Ok({}))
    .when(isPathToProgram("node"), () =>
      Result.Ok({ runtimeExecutable: maybeResolve(cwd, runtimeExecutable) }),
    )
    .otherwise(() => Result.Error("Invalid runtime executable"))
    .map(params => ({
      ...params,
      ...Dict.filterValues({ runtimeArgs }, not(List.empty)),
    }));

export const parseProgramArgv = (
  [program, ...args]: string[],
  cwd: Maybe<string>,
): Result<ProgramParams, string> =>
  program === undefined
    ? Result.Error("Program is undefined")
    : checkPathToNodeScript(program).map(program => ({
        program: maybeResolve(cwd, program),
        ...(args.length > 0 ? { args } : {}),
      }));

export const nodeConfigAdapter: DebugConfigAdapter<NodeLaunchConfiguration> = (
  action,
  argv,
  cwd = Maybe.None(),
) => {
  // TODO: Only launch for now
  if (action !== "launch") {
    console.warn("node supports only launch");
    return Maybe.None();
  }

  const [runtimeArgv, programArgv] = List.partition(isNodeScriptArg, argv);
  return Result.all([
    parseRuntimeArgv(runtimeArgv, cwd),
    parseProgramArgv(programArgv, cwd),
  ])
    .map(([runtimeParams, programParams]) => ({
      name: `Cdb: node`,
      type: "node" as "node",
      request: "launch" as "launch",
      ...runtimeParams,
      ...programParams,
    }))
    .tapError(console.error)
    .toOption();
};

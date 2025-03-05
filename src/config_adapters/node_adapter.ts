import { match, P } from "ts-pattern";
import { Pattern } from "ts-pattern/types";
import { DebugConfigAdapter } from ".";
import { partition } from "../util/array";
import { maybeResolve } from "../util/path";
import { isPathToProgram, isPathToScript } from "../util/predicates";
import { NodeLaunchConfiguration } from "./node_schema";

const isPathToNodeScript = isPathToScript(/\.[me]?[jt]s$/);
const isNodeScriptArg = (arg: string, i: number, args: readonly string[]) =>
  isPathToNodeScript(arg) && args[i - 1] !== "-r";
const scriptWithArgs: Pattern<string[]> = [
  P.when(isPathToNodeScript),
  ...P.array(),
];

// Some possible options for argv:
// node -r ./gtm_bootstrap.js ./server_bin.js
// node ./server.js
// node --inspect-brk=9229 ./server.js
// ./my_script.mts

export const nodeConfigAdapter: DebugConfigAdapter<NodeLaunchConfiguration> = (
  action,
  argv,
  cwd,
) => {
  // TODO: Only launch for now
  if (action !== "launch") {
    console.warn("node supports only launch");
    return;
  }

  const config: NodeLaunchConfiguration = {
    type: "node",
    request: "launch",
    name: `Cdb: node`,
  };

  const [runtime, ...rest] = argv;
  if (isPathToProgram("node", runtime)) {
    if (runtime !== "node") {
      config.runtimeExecutable = maybeResolve(cwd, runtime);
    }

    const [runtimeArgs, args] = partition(isNodeScriptArg, rest);

    if (runtimeArgs.length > 0) {
      config.runtimeArgs = runtimeArgs;
    }
    argv = args;
  }

  return match(argv)
    .with(scriptWithArgs, ([program, ...args]) => ({
      ...config,
      program: maybeResolve(cwd, program),
      ...(args.length > 0 && { args }),
    }))
    .otherwise(() => {
      console.warn("Cannot debug this command");
      return undefined;
    });
};

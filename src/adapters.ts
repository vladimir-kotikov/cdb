import path from "path";
import { match, P } from "ts-pattern";
import { partition } from "./array_utils";

interface DebugAdapterParams {
  type: string;
  [key: string]: any;
}

type DebugAdapter = (argv: string[], cwd?: string) => DebugAdapterParams | undefined;

export const debugpy: DebugAdapter = (argv, cwd) => {
  const [program, ...args] = argv;

  const params: DebugAdapterParams = {
    type: "debugpy",
  };

  if (path.extname(program) === ".py") {
    return { ...params, program, args };
  }

  if (path.basename(program) === "python") {
    if (program !== "python") {
      params.python = path.resolve(cwd ?? "", program);
    }

    // ./python -Lnp script.py arg1 arg2
    // ./python -Lnp -m module arg1 arg2
    // ./python -Lnp -c 'some code'  -  not supported
    // ./python -Lnp - <stdin>  - not supported
    const programSpecifierRe = /^-m|-c|-|.*\.py$/;

    const [pythonArgs, programArgv] = partition(args, arg => programSpecifierRe.test(arg));
    return match(programArgv)
      .with(["-m", P.string, ...P.array()], ([, module, ...args]) => ({
        ...params, pythonArgs, module, args
      }))
      .with(
        [P.string.regex(/^.*\.py$/), ...P.array()],
        ([program, ...args]) => ({
          ...params, pythonArgs, program, args
        }),
      )
      .otherwise(() => undefined);
  }
};

export const adapters = [debugpy];

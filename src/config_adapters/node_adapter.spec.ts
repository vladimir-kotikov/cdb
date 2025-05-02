import { expect, it } from "@jest/globals";
import { Option as Maybe, Result } from "@swan-io/boxed";
import {
  nodeConfigAdapter,
  parseProgramArgv,
  parseRuntimeArgv,
} from "./node_adapter";

const configPragma = {
  type: "node",
  request: "launch",
  name: "Cdb: node",
};

describe("parseRuntimeArgv", () => {
  it.each([
    ["node", Result.Ok({}), undefined],
    // parseRuntimeArgv doesn't distinguish between node args, script and
    // script args, this has to be done by the caller
    ["node script.js", Result.Ok({ runtimeArgs: ["script.js"] }), undefined],
    [
      "node --foo bar --no-baz script.js",
      Result.Ok({
        runtimeArgs: ["--foo", "bar", "--no-baz", "script.js"],
      }),
      undefined,
    ],
    [
      "/some/path/to/node --foo bar",
      Result.Ok({
        runtimeExecutable: "/some/path/to/node",
        runtimeArgs: ["--foo", "bar"],
      }),
      "/home/user",
    ],
  ])(
    "should parse %p as runtime arguments",
    (argv: string, expectedConfig: any, cwd?: string) =>
      expect(
        parseRuntimeArgv(argv.split(" "), Maybe.fromUndefined(cwd)),
      ).toStrictEqual(expectedConfig),
  );
  it.each(["--foo bar", "lytdybr"])(
    "should return error for invalid runtime executable",
    argv =>
      expect(
        parseRuntimeArgv(argv.split(" "), Maybe.Some("/home/user")),
      ).toStrictEqual(Result.Error("Invalid runtime executable")),
  );
});

describe("parseScriptArgv", () => {
  it.each([
    ["script.js", Result.Ok({ program: "script.js" }), undefined],
    [
      "script.mjs",
      Result.Ok({ program: "/home/user/script.mjs" }),
      "/home/user",
    ],
    [
      "script.ts run test",
      Result.Ok({ program: "script.ts", args: ["run", "test"] }),
      undefined,
    ],
    [
      "script.cjs run --test",
      Result.Ok({ program: "/home/user/script.cjs", args: ["run", "--test"] }),
      "/home/user",
    ],
  ])(
    "should parse '%s' as script arguments",
    (argv: string, expectedConfig: any, cwd?: string) =>
      expect(
        parseProgramArgv(argv.split(" "), Maybe.fromUndefined(cwd)),
      ).toStrictEqual(expectedConfig),
  );
});

describe("Node debug config adapter", () => {
  it.each(["attach", "halsjlf" as any])(
    "should return none for non-launch action: %s",
    action => expect(nodeConfigAdapter(action, [])).toStrictEqual(Maybe.None()),
  );

  it.each([
    ["node", Maybe.None()],
    ["node script.js", Maybe.Some({ ...configPragma, program: "script.js" })],
    [
      "node --foo bar --no-baz script.js",
      Maybe.Some({
        ...configPragma,
        program: "script.js",
        runtimeArgs: ["--foo", "bar", "--no-baz"],
      }),
    ],
    [
      "node -r hook.js script.js",
      Maybe.Some({
        ...configPragma,
        program: "script.js",
        runtimeArgs: ["-r", "hook.js"],
      }),
    ],
    [
      "script.js -- --some-opt semi",
      Maybe.Some({
        ...configPragma,
        program: "script.js",
        args: ["--", "--some-opt", "semi"],
      }),
    ],
    [
      "../bin/node script.js",
      Maybe.Some({
        ...configPragma,
        runtimeExecutable: "../bin/node",
        program: "script.js",
      }),
    ],
  ])(
    "should parse '%s' to the correct config",
    (argv: string, expectedConfig: any) => {
      expect(nodeConfigAdapter("launch", argv.split(" "))).toStrictEqual(
        expectedConfig,
      );
    },
  );

  it.each([
    [
      "./bin/node script.js",
      "/home/user/",
      Maybe.Some({
        ...configPragma,
        runtimeExecutable: "/home/user/bin/node",
        program: "/home/user/script.js",
      }),
    ],
  ])(
    "should parse %s to the correct config within cwd: %s",
    (argv: string, cwd: string, expectedConfig: any) => {
      expect(
        nodeConfigAdapter("launch", argv.split(" "), Maybe.fromUndefined(cwd)),
      ).toStrictEqual(expectedConfig);
    },
  );
});

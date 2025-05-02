import { expect, it } from "@jest/globals";
import { Option as Maybe } from "@swan-io/boxed";
import { debugpyConfigAdapter } from "./debugpy_adapter";

const configPragma = {
  type: "debugpy",
  request: "launch",
  name: "Cdb: debugpy",
};

const positiveCases: [string, object][] = [
  ["cdb file.py", { program: "file.py" }],
  [
    "cdb file.py -- --some-opt semi",
    { program: "file.py", args: ["--", "--some-opt", "semi"] },
  ],
  [
    "cdb -m some.module file.py --opt",
    { module: "some.module", args: ["file.py", "--opt"] },
  ],
  ["cdb pytest -vv tests", { module: "pytest", args: ["-vv", "tests"] }],
];
const negativeCases = [
  "cdb some.module",
  "cdb foo.js",
  "cdb -c 'import universe;'",
  "cdb -",
  "cdb -m",
  "cdb -m -",
  "cdb -m https://example.com",
  "cdb -m 111someinvalid.module",
  "cdb ",
];

describe("python debug config adapter", () => {
  it.each(["attach", "halsjlf" as any])(
    "should return none for non-launch action: %s",
    action =>
      expect(debugpyConfigAdapter(action, [])).toStrictEqual(Maybe.None()),
  );

  it.each(positiveCases)(
    "should parse '%s' to the correct config",
    (cmd: string, expected: object) => {
      const [_, ...argv] = cmd.split(" ");

      const result = debugpyConfigAdapter("launch", argv, Maybe.None());

      expect(result).toStrictEqual(
        Maybe.Some({ ...configPragma, ...expected }),
      );
    },
  );

  it.each(negativeCases)("should return none for invalid cases: %s", cmd => {
    const [_, ...argv] = cmd.split(" ");
    const result = debugpyConfigAdapter("launch", argv, Maybe.None());
    expect(result).toStrictEqual(Maybe.None());
  });
});

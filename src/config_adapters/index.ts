import { Option as Maybe } from "@swan-io/boxed";
import { DebugConfiguration } from "vscode";
import { debugpyConfigAdapter } from "./debugpy_adapter";
import { nodeConfigAdapter } from "./node_adapter";

export type DebugConfigAdapter<T extends DebugConfiguration> = (
  action: "launch" | "attach",
  argv: string[],
  cwd?: Maybe<string>,
) => Maybe<T>;

export const adapters: DebugConfigAdapter<DebugConfiguration>[] = [
  debugpyConfigAdapter,
  nodeConfigAdapter,
];

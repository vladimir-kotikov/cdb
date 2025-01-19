import { DebugConfiguration } from "vscode";
import { debugpyConfigAdapter } from "./debugpy_adapter";

export type DebugConfigAdapter<T extends DebugConfiguration> = (
  action: "launch" | "attach",
  argv: string[],
  cwd?: string,
) => T | undefined;

export const adapters = [debugpyConfigAdapter];

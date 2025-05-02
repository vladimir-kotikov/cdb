import { Array as List, Option as Maybe, Result } from "@swan-io/boxed";
import { match, P } from "ts-pattern";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { Uri } from "vscode";
import { adapters } from "./config_adapters";
import { curry } from "./lib/curry";
import { pass } from "./lib/operators";

interface CdbParams {
  action: "launch" | "attach";
  program: string;
  cwd: Maybe<string>;
}

const validateAction = (action: string): Result<"launch" | "attach", string> =>
  match(action)
    .with("debug", () => Result.Ok("attach" as const))
    .with(P.union("attach", "launch"), Result.Ok)
    .otherwise(action =>
      Result.Error(
        `Unknown action: ${action}. Supported actions are: attach, launch`,
      ),
    );

const validateProgram = (program: string | null): Result<string, string> =>
  program
    ? Result.Ok(program)
    : Result.Error("Missing required parameter: program");

const parseUri = (uri: Uri): Result<CdbParams, string> => {
  // Remove the leading slash from the path
  const action = uri.path.slice(1);
  const urlParams = new URLSearchParams(uri.query);

  return Result.allFromDict({
    action: validateAction(action),
    program: validateProgram(urlParams.get("program")),
    cwd: Result.Ok(Maybe.fromNullable(urlParams.get("cwd"))),
  });
};

const handleDebug = (cdbParams: CdbParams): Result<Thenable<any>, string> => {
  const { action, program, cwd } = cdbParams;
  const workspaceFolder = cwd
    .map(Uri.file)
    .map(vscode.workspace.getWorkspaceFolder);

  const startDebugging = curry(vscode.debug.startDebugging)(
    workspaceFolder.toUndefined(),
  );

  return List.findMap(adapters, configAdapter =>
    configAdapter(action, program.split(" "), cwd),
  )
    .map(debugConfiguration => ({ ...debugConfiguration, justMyCode: false }))
    .map(startDebugging)
    .toResult("No adapter found");
};

export const handleUri = (uri: Uri): Thenable<any> =>
  parseUri(uri)
    .flatMap(handleDebug)
    .match({
      Ok: pass,
      Error: error =>
        vscode.window.showErrorMessage(`Could not parse URI: ${error}`),
    });

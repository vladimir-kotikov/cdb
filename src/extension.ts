import * as vscode from "vscode";
import { generateDebugAdapterSchemas, installCdb } from "./commands";
import { handleUri } from "./uri_handler";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerUriHandler({ handleUri }),
    vscode.commands.registerCommand(
      "cdb.install",
      installCdb(context.extensionPath),
    ),
    vscode.commands.registerCommand(
      "cdb.genDebuggerSpecs",
      generateDebugAdapterSchemas,
    ),
  );
}

export function deactivate() {}

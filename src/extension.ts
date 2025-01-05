import path from "path";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { adapters } from "./adapters";

interface DebugParams {
  cwd?: string;
  program: string;
  [key: string]: string | string[] | undefined;
}

const mapFirst = <T, U>(arr: T[], fn: (t: T) => U | undefined): U | undefined => {
  for (const item of arr) {
    const result = fn(item);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
};

const isSubpath = (current: string, maybeParent: string): boolean => {
  const relative = path.relative(maybeParent, current);
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
};

class DebugUriHandler implements vscode.UriHandler {
  private parseUri(uri: vscode.Uri): [string, DebugParams] {
    const action = uri.path;
    const urlParams = new URLSearchParams(uri.query);

    const debugParams: { program?: string, [key: string]: any } = {};
    for (const key of urlParams.keys()) {
      const values = urlParams.getAll(key);
      debugParams[key] = values.length === 1 ? values[0] : values;
    }

    if (Array.isArray(debugParams.cwd)) {
      throw new Error("Expected cwd to be a single value");
    }

    if (!debugParams.program) {
      throw new Error("Expected program to be set");
    }

    return [action, { ...debugParams, program: debugParams.program }];
  }

  private handleDebug(debugParams: DebugParams): vscode.ProviderResult<void> {
    const workspaceFolder = !!debugParams.cwd ? vscode.workspace.workspaceFolders?.find((f) =>
      isSubpath(debugParams.cwd!, f.uri.fsPath),
    ) : undefined;

    // TODO: More robust args parsing
    const argv = debugParams.program.split(" ");
    const debugAdapterParams = mapFirst(adapters, adapter => adapter(argv));

    if (!debugAdapterParams) {
      return vscode.window.showErrorMessage(
        `Could not start debug session: unknown program ${debugParams.program}`,
      ).then();
    }

    vscode.debug.startDebugging(workspaceFolder, {
      name: `cdb: ${debugParams.program}`,
      request: "launch",
      ...debugAdapterParams,
    });
  }


  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    const [action, params] = this.parseUri(uri);

    if (action === "/debug") {
      return this.handleDebug(params);
    }

    return vscode.window
      .showErrorMessage(
        `Could not start debug session: unknown action ${action}`,
      )
      .then();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.window.registerUriHandler(new DebugUriHandler());
  context.subscriptions.push(disposable);
}

export function deactivate() { }

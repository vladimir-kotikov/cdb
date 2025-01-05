import { exec } from "child_process";
import path from "path";
import { URLSearchParams } from "url";
import { promisify } from "util";
import * as vscode from "vscode";
import { adapters } from "./adapters";
import { mapFirst } from "./array_utils";

interface CdbParams {
  cwd?: string;
  program: string;
  [key: string]: string | string[] | undefined;
}

const isSubpath = (current: string, maybeParent: string): boolean => {
  const relative = path.relative(maybeParent, current);
  return !relative || !relative.startsWith("..") && !path.isAbsolute(relative);
};

const installCdb = async (sourceDir: string) => {
  const source = `/usr/local/bin/cdb`;
  const target = path.join(sourceDir, "cdb");
  const command = `osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'${target}\' \'${source}\'\\" with administrator privileges"`;
  await promisify(exec)(command);
};

class DebugUriHandler implements vscode.UriHandler {
  private parseUri(uri: vscode.Uri): [string, CdbParams] {
    const action = uri.path;
    const urlParams = new URLSearchParams(uri.query);

    const debugParams: { program?: string;[key: string]: any } = {};
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

  private handleDebug(cdbParams: CdbParams): vscode.ProviderResult<any> {
    const { cwd, program } = cdbParams;
    const workspaceFolder = !!cwd
      ? vscode.workspace.workspaceFolders?.find((f) =>
        isSubpath(cwd!, f.uri.fsPath),
      )
      : undefined;

    // TODO: More robust args parsing
    const debugParams = mapFirst(adapters, (adapter) =>
      adapter(program.split(" "), cwd),
    );
    if (!debugParams) {
      return vscode.window
        .showErrorMessage(
          `Could not start debug session: unknown program ${program}`,
        )
        .then();
    }

    return vscode.debug.startDebugging(workspaceFolder, {
      name: `cdb: ${program}`,
      request: "launch",
      justMyCode: false,
      ...debugParams,
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
  context.subscriptions.push(
    vscode.window.registerUriHandler(new DebugUriHandler()),
    vscode.commands.registerCommand("cdb.install", () => installCdb(context.extensionPath)),
  );
}

export function deactivate() { }

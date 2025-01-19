import path from "path";
import { URLSearchParams } from "url";
import * as vscode from "vscode";
import { ProviderResult, Uri, UriHandler } from "vscode";
import { mapFirst } from "./array_utils";
import { adapters } from "./config_adapters";

interface CdbParams {
  cwd?: string;
  program: string;
  [key: string]: string | string[] | undefined;
}

const isSubpath = (current: string, maybeParent: string): boolean => {
  const relative = path.relative(maybeParent, current);
  return (
    !relative || (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

export class CdbUriHandler implements UriHandler {
  private parseUri(uri: Uri): [string, CdbParams] {
    const action = uri.path;
    const urlParams = new URLSearchParams(uri.query);

    const debugParams: { program?: string; [key: string]: any } = {};
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

  private handleDebug(cdbParams: CdbParams): ProviderResult<void> {
    const { cwd, program } = cdbParams;
    const workspaceFolder = !!cwd
      ? vscode.workspace.getWorkspaceFolder(Uri.file(cwd!))
      : undefined;

    // TODO: More robust args parsing
    const debugConfiguration = mapFirst(adapters, configAdapter =>
      configAdapter(program.split(" "), cwd),
    );

    if (!debugConfiguration) {
      return vscode.window
        .showErrorMessage(
          `Could not start debug session: unknown program ${program}`,
        )
        .then();
    }

    return vscode.debug
      .startDebugging(workspaceFolder, {
        ...debugConfiguration,
        justMyCode: false,
        name: `cdb: ${program}`,
      })
      .then();
  }

  handleUri(uri: Uri): ProviderResult<void> {
    const [action, params] = this.parseUri(uri);

    if (action === "/debug") {
      return this.handleDebug(params);
    }

    const errorMessage = `Could not start debug session: unknown action ${action}`;
    return vscode.window.showErrorMessage(errorMessage).then();
  }
}

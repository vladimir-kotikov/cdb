import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { compile, JSONSchema } from "json-schema-to-typescript";
import * as vscode from "vscode";
import { filterMap } from "./array_utils";

type Visitor = (key: string, obj: any) => void;

// These definitions are manually compiled based on https://github.com/microsoft/vscode/blob/862fa30/src/vs/workbench/contrib/debug/browser/debugAdapterManager.ts#L164
const commonDefinitions = {
  definitions: {
    common: {
      properties: {
        name: {
          type: "string",
          description:
            "Name of configuration; appears in the launch configuration dropdown menu.",
          default: "Launch",
        },
        debugServer: {
          type: "number",
          description:
            "For debug extension development only: if a port is specified VS Code tries to connect to a debug adapter running in server mode",
          default: 4711,
        },
        preLaunchTask: {
          type: ["string"],
          default: "",
          description: "Task to run before debug session starts.",
        },
        postDebugTask: {
          type: ["string"],
          default: "",
          description: "Task to run after debug session ends.",
        },
        presentation: {
          type: "object",
          description:
            "Presentation options on how to show this configuration in the debug configuration dropdown and the command palette.",
          properties: {
            hidden: {
              type: "boolean",
              default: false,
              description:
                "Controls if this configuration should be shown in the configuration dropdown and the command palette.",
            },
            group: {
              type: "string",
              default: "",
              description:
                "Group that this configuration belongs to. Used for grouping and sorting in the configuration dropdown and the command palette.",
            },
            order: {
              type: "number",
              default: 1,
              description:
                "Order of this configuration within a group. Used for grouping and sorting in the configuration dropdown and the command palette.",
            },
          },
          default: {
            hidden: false,
            group: "",
            order: 1,
          },
        },
        internalConsoleOptions: {
          enum: ["neverOpen", "openOnSessionStart", "openOnFirstSessionStart"],
          default: "openOnFirstSessionStart",
          description: "Controls when the internal Debug Console should open.",
        },
        suppressMultipleSessionWarning: {
          type: "boolean",
          description:
            "Disable the warning when trying to start the same debug configuration more than once.",
          default: true,
        },
      },
    },
  },
};

const unknownFields = [
  "markdownDescription",
  "enumDescriptions",
  "doNotSuggest",
  "patternErrorMessage",
  "errorMessage",
  "deprecationMessage",
];

function forKeyInObject(obj: any, ...visitors: Visitor[]): any {
  for (const key in obj) {
    visitors.forEach(visit => visit(key, obj));
    if (typeof obj[key] === "object") {
      forKeyInObject(obj[key], ...visitors);
    }
  }
  return obj;
}

const removeUnknownFields = (key: string, obj: any) => {
  if (unknownFields.includes(key)) {
    delete obj[key];
  }
};

const renameLabelToTitle = (key: string, obj: any) => {
  if (key === "label") {
    obj.title = obj.label;
    delete obj.label;
  }
};

export async function generateDebugAdapterSchemas(): Promise<void> {
  let debuggersSchemas = filterMap(
    vscode.extensions.all,
    ({ packageJSON }) => packageJSON.contributes?.debuggers,
  )
    .flat(1)
    .reduce((acc, { type, deprecated, configurationAttributes }) => {
      if (type === "*" || deprecated || !configurationAttributes) {
        return acc;
      }

      Object.entries(configurationAttributes).forEach(([action, schema]) => {
        acc[`${type}_${action}`] = {
          ...forKeyInObject(schema, removeUnknownFields, renameLabelToTitle),
          ...commonDefinitions,
        };
      });

      return acc;
    }, {});

  await Object.entries(debuggersSchemas).reduce<Promise<any>>(
    (promise, [key, schema]) =>
      promise
        .then(() => compile(schema as JSONSchema, key))
        .then(ts =>
          vscode.workspace
            .openTextDocument(vscode.Uri.parse("untitled:///" + key + ".ts"))
            .then(doc => vscode.window.showTextDocument(doc))
            .then(editor =>
              editor.edit(edit => edit.insert(new vscode.Position(0, 0), ts)),
            ),
        ),
    Promise.resolve(),
  );
}

export async function installCdb(sourceDir: string): Promise<void> {
  const source = `/usr/local/bin/cdb`;
  const target = path.join(sourceDir, "cdb");
  const command = `osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'${target}\' \'${source}\'\\" with administrator privileges"`;
  await promisify(exec)(command);
}

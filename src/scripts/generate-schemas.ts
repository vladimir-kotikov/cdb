import { compile, type JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface DebuggerContribution {
  type: string;
  configurationAttributes: {
    [key: string]: JSONSchema;
  };
  deprecated?: boolean;
}

type Visitor = (key: string, obj: any) => void;

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

function forKeyInObject(visitors: Visitor[], obj: any): any {
  for (const key in obj) {
    visitors.forEach(visit => visit(key, obj));
    if (typeof obj[key] === "object") {
      forKeyInObject(visitors, obj[key]);
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

const isSupportedDebugger = ({
  type,
  deprecated,
  configurationAttributes,
}: DebuggerContribution) =>
  type !== "*" && !deprecated && configurationAttributes;

const prepareSchema = (schema: JSONSchema) => ({
  ...forKeyInObject([removeUnknownFields, renameLabelToTitle], schema),
  ...commonDefinitions,
});

const fetchDebuggerConfigurationSchemas = ({
  type,
  configurationAttributes,
}: DebuggerContribution): [string, JSONSchema][] =>
  Object.entries(configurationAttributes).map(([action, schema]) => [
    `${type}_${action}`,
    prepareSchema(schema),
  ]);

async function generateSchemas() {
  const extensionsPath = path.join(
    process.env.HOME || "",
    ".vscode/extensions",
  );
  const outputDir = path.join(process.cwd(), "src/config_adapters");

  mkdirSync(outputDir, { recursive: true });

  // Find all installed extensions with debuggers
  let extensionFolders: string[] = [];

  try {
    extensionFolders = readdirSync(extensionsPath);
  } catch {
    console.log("Note: Could not read extensions directory");
    return;
  }

  for (const folder of extensionFolders) {
    const packageJsonPath = path.join(extensionsPath, folder, "package.json");
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const debuggers = packageJson.contributes?.debuggers ?? [];

      for (const debugger_ of debuggers.filter(isSupportedDebugger)) {
        const schemas = fetchDebuggerConfigurationSchemas(debugger_);

        for (const [className, schema] of schemas) {
          const ts = await compile(schema, className);
          const outputPath = path.join(outputDir, `${className}_schema.d.ts`);
          writeFileSync(outputPath, ts);
          console.log(`Generated ${outputPath}`);
        }
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("no such file or directory")
      ) {
        continue;
      }
      // Silently skip extensions without debuggers
    }
  }
}

generateSchemas().catch(console.error);

import path from "path";

interface DebugAdapterParams {
    type: string;
    [key: string]: any;
}

type DebugAdapter = (argv: string[]) => DebugAdapterParams | undefined;

export const debugpy: DebugAdapter = argv => {
    const [executable, ...rest] = argv;

    if (path.basename(executable) === "python") {
        const moduleIndex = rest.findIndex(arg => arg === "-m");
        return {
            type: "debugpy",
            python: executable,
            python_args: rest.slice(0, moduleIndex),
            program: rest[moduleIndex + 1],
            args: rest.slice(moduleIndex + 2),
        };
    }

    if (path.extname(executable) === ".py") {
        return {
            type: "debugpy",
            program: executable,
            args: rest,
        };
    }
};

export const adapters = [debugpy];

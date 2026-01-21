import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

export const installCdb = (sourceDir: string) => async (): Promise<void> => {
  const source = `/usr/local/bin/cdb`;
  const target = path.join(sourceDir, "cdb");
  const command = `osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'${target}\' \'${source}\'\\" with administrator privileges"`;
  await promisify(exec)(command);
};

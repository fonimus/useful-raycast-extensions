/* eslint-disable */
const fs = require("fs");
const execSync = require("child_process").execSync;
const extensionsDirectory = "./extensions/";
const files = fs.readdirSync(extensionsDirectory, { withFileTypes: true });
for (const dir of files.filter((file) => file.isDirectory())) {
  const extension = dir.name;
  const extensionBinDir = "extensions/" + extension + "/node_modules/.bin/";
  const tscAlias = extensionBinDir + "tsc";
  if (!fs.existsSync(tscAlias)) {
    fs.mkdirSync(extensionBinDir, { recursive: true });
    execSync("ln -s ../../../../node_modules/typescript/bin/tsc " + tscAlias, {
      encoding: "utf-8",
    });
  }
}

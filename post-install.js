/* eslint-disable */
const fs = require("fs");
const execSync = require("child_process").execSync;
const extensionsDirectory = "./extensions/";
const files = fs.readdirSync(extensionsDirectory, { withFileTypes: true });
for (const dir of files.filter((file) => file.isDirectory())) {
  const extension = dir.name;
  const tscAlias = "extensions/" + extension + "/node_modules/.bin/tsc";
  if (!fs.existsSync(tscAlias)) {
    execSync("ln -s ../../../../node_modules/typescript/bin/tsc extensions/" + extension + "/node_modules/.bin/tsc", {
      encoding: "utf-8",
    });
  }
}

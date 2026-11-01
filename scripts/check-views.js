const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const viewsRoot = path.join(__dirname, "..", "views");

function collectTemplates(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTemplates(entryPath);
    return entry.isFile() && entry.name.endsWith(".ejs") ? [entryPath] : [];
  });
}

const templates = collectTemplates(viewsRoot);
let failures = 0;
for (const filename of templates) {
  try {
    ejs.compile(fs.readFileSync(filename, "utf8"), { filename });
  } catch (error) {
    failures += 1;
    process.stderr.write("EJS template error in " + path.relative(viewsRoot, filename) + ": " + error.message + "\n");
  }
}

if (failures > 0) process.exitCode = 1;
else process.stdout.write("Validated " + templates.length + " EJS templates.\n");

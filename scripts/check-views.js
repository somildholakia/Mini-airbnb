const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");
const ejsMate = require("ejs-mate");

const viewsRoot = path.join(__dirname, "..", "views");

function collectTemplates(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTemplates(entryPath);
    return entry.isFile() && entry.name.endsWith(".ejs") ? [entryPath] : [];
  });
}

function renderLayoutSmokeTest() {
  const viewPath = path.join(viewsRoot, "error.ejs");
  const locals = {
    message: "WanderSite layout smoke test",
    pageTitle: "WanderSite layout smoke test",
    metaDescription: "Template layout integration test",
    currUser: null,
    success: [],
    error: []
  };

  return new Promise((resolve, reject) => {
    ejsMate(viewPath, {
      ...locals,
      settings: {
        views: viewsRoot,
        "view engine": "ejs"
      }
    }, (error, html) => {
      if (error) return reject(error);
      if (!html.includes("<!DOCTYPE html>") || !html.includes(locals.message)) {
        return reject(new Error("EJS-Mate did not render the shared layout and child template."));
      }
      resolve();
    });
  });
}

async function main() {
  const templates = collectTemplates(viewsRoot);
  let failures = 0;

  for (const filename of templates) {
    try {
      ejs.compile(fs.readFileSync(filename, "utf8"), { filename });
    } catch (error) {
      failures += 1;
      process.stderr.write(
        "EJS template error in " + path.relative(viewsRoot, filename) + ": " + error.message + "\n"
      );
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  await renderLayoutSmokeTest();
  process.stdout.write("Validated " + templates.length + " EJS templates and shared layout rendering.\n");
}

main().catch((error) => {
  process.stderr.write("EJS layout integration error: " + error.message + "\n");
  process.exitCode = 1;
});

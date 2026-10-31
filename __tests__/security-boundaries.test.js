// @vitest-environment node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { expect, it } from "vitest";

const root = process.cwd();
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : /\.(js|jsx)$/.test(file) ? [file] : [];
  });
}
const sources = [...files(path.join(root, "app")), ...files(path.join(root, "components")), ...files(path.join(root, "lib"))];
const modules = new Map(sources.map(file => [file, { source: readFileSync(file, "utf8"), ast: parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] }) }]));
function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, fn));
    else if (value && typeof value === "object") walk(value, fn);
  }
}

it("no client import graph can reach Admin SDK, server-only code or private environment values", () => {
  const errors = [];
  const visited = new Set();
  function inspect(file) {
    if (visited.has(file) || !modules.has(file)) return;
    visited.add(file);
    const { ast, source } = modules.get(file);
    for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (match[1] !== "NODE_ENV" && !match[1].startsWith("NEXT_PUBLIC_")) errors.push(`${file}: ${match[1]}`);
    }
    walk(ast, node => {
      const dependency = node.type === "ImportDeclaration" || node.type?.startsWith("Export") ? node.source?.value
        : node.type === "CallExpression" && node.callee.type === "Import" ? node.arguments[0]?.value : null;
      if (typeof dependency !== "string") return;
      if (dependency === "server-only" || dependency.startsWith("firebase-admin")) errors.push(`${file}: ${dependency}`);
      const base = dependency.startsWith("@/") ? path.join(root, dependency.slice(2)) : dependency.startsWith(".") ? path.resolve(path.dirname(file), dependency) : null;
      if (base) inspect([base, base + ".js", base + ".jsx", path.join(base, "index.js")].find(candidate => existsSync(candidate)));
    });
  }
  for (const [file, { ast }] of modules) if (ast.program.directives.some(d => d.value.value === "use client")) inspect(file);
  expect(errors).toEqual([]);
  expect(modules.get(path.join(root, "lib/firebase-admin.js")).source).toContain('import "server-only"');
});

it("contains no invalid paragraph/span nesting or nested native interactive controls", () => {
  const errors = [];
  const blocks = new Set(["div", "p", "section", "article", "main", "h1", "h2", "h3", "ul", "ol", "table", "form"]);
  function inspect(node, file, parents = []) {
    if (!node || typeof node !== "object") return;
    let next = parents;
    if (node.type === "JSXElement") {
      const name = node.openingElement.name.name;
      if ((blocks.has(name) && parents.includes("p")) || (name === "div" && parents.includes("span")) || (["button", "a"].includes(name) && parents.includes(name))) errors.push(`${file}:${node.loc.start.line} ${name}`);
      next = [...parents, name];
    }
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => inspect(child, file, next));
      else if (value && typeof value === "object") inspect(value, file, next);
    }
  }
  for (const [file, { ast }] of modules) inspect(ast, file);
  expect(errors).toEqual([]);
});

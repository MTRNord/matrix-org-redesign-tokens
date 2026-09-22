/**
 * Checks the build output for invalid or missing CSS, e.g. after a change in
 * the Penpot export format. Expects `build/` to exist.
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (f) => readFileSync(`build/css/${f}`, "utf8");

const vars = read("_variables.css");
assert.doesNotMatch(vars, /font-size: [\d.]+;/, "unitless font-size");
assert.doesNotMatch(vars, /letter-spacing: [\d.]*[1-9][\d.]*;/, "unitless letter-spacing");
assert.match(vars, /--h1-font-size: [\d.]+rem;/);
assert.match(read("_variables.mode.dark.css"), /@media \(prefers-color-scheme: dark\)/);
assert.match(read("typography.css"), /:where\(h1\), \.text-h1 \{/);

console.log("build output ok");

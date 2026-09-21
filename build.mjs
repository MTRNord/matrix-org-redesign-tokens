import StyleDictionary from "style-dictionary";
import { register } from "@tokens-studio/sd-transforms";
import { writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import getConfig, { fontsConfig } from "./sd.config.mjs";

// Registers all tokens-studio transforms/transformGroups/preprocessor
register(StyleDictionary);

// --- helpers: find Penpot files by set name (hash-prefixed filenames) ---

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Recursively collect every .json file under dir (incl. $-prefixed). */
const collectJson = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJson(p));
    else if (entry.name.endsWith(".json")) out.push(p);
  }
  return out;
};

/**
 * Resolve a Penpot set name to its file. Matches by filename suffix so it
 * works with and without Penpot's hash prefixes (`abc123-dark.json`, `dark.json`).
 */
const makeFileResolver = (allFiles) => (name) => {
  const suffix = `-${name}.json`;
  const plain = `/${name}.json`;
  const matches = allFiles.filter(
    (p) => p.endsWith(suffix) || p.endsWith(plain),
  );
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one file for set '${name}', found ${matches.length}.` +
        ` Files: ${allFiles.join(", ")}`,
    );
  }
  return matches[0];
};

const resolve = makeFileResolver(collectJson("tokens"));
const setFile = (setName) => resolve(setName.split("/").pop());

// --- read Penpot metadata ---
// --- read Penpot metadata ---------------------------------------------------

const themes = JSON.parse(readFileSync(resolve("$themes"), "utf8"));
const metadata = JSON.parse(readFileSync(resolve("$metadata"), "utf8"));

/** Source list for a set of token-set names, in Penpot's own precedence order. */
const sourcesFor = (setNames) =>
  metadata.tokenSetOrder.filter((s) => setNames.includes(s)).map(setFile);

// --- theme strategy -----------------------------------------------------------

/** Groups whose themes follow the system color scheme. Extend as needed. */
const SYSTEM_COLOR_SCHEME_THEMES = {
  Mode: { Dark: "(prefers-color-scheme: dark)" },
};

// --- derive passes from the theme definitions --------------------------------

if (themes.length === 0) {
  throw new Error(
    "$themes.json is empty — define themes in Penpot and re-export.",
  );
}

// sets shared by every theme → belong in the base file
const commonSets = Object.keys(themes[0].selectedTokenSets).filter((s) =>
  themes.every((t) => t.selectedTokenSets[s]),
);

const activeTheme =
  themes.find((t) => `${t.group}/${t.name}` === metadata.activeThemes?.[0]) ??
  themes[0];

const MEDIA_QUERY_FOR = {
  "Mode/Dark": "(prefers-color-scheme: dark)",
  // "Mode/Light": "(prefers-color-scheme: light)", // optional; light is the default anyway
};

const passes = [
  // base pass: shared sets + active theme, emitted unscoped under :root
  {
    source: sourcesFor([
      ...commonSets,
      ...Object.keys(activeTheme.selectedTokenSets),
    ]),
    dest: "variables",
  },
  ...themes
    .filter((t) => t !== activeTheme)
    .map((t) => {
      const ownSets = Object.keys(t.selectedTokenSets).filter(
        (s) => !commonSets.includes(s),
      );

      return {
        // full context so aliases resolve…
        source: sourcesFor(Object.keys(t.selectedTokenSets)),
        // …but emit only tokens physically defined in this theme's own sets
        onlyFiles: ownSets.map(setFile),
        dest: `variables.${kebab(t.group)}.${kebab(t.name)}`,
        media: MEDIA_QUERY_FOR[`${t.group}/${t.name}`],
      };
    }),
];

// --- build ---------------------------------------------------------------------

rmSync("build", { recursive: true, force: true });

// 1. fonts pass — mode-independent, built once
const fontsSd = new StyleDictionary(fontsConfig([resolve("font")]));
await fontsSd.buildAllPlatforms();

// 2. one pass per theme artifact
for (const pass of passes) {
  await new StyleDictionary(getConfig(pass)).buildAllPlatforms();
}

// 3. index files — fonts first, base before theme overrides
const importTargets = ["fonts", ...passes.map((p) => p.dest)];

writeFileSync(
  "build/css/index.css",
  [
    `@import url("fonts.css");`,
    ...passes.map((p) => `@import url("_${p.dest}.css");`),
  ].join("\n") + "\n",
);

console.log(`Built ${passes.length} theme pass(es)`);

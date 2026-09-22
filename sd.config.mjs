import { expandTypesMap } from "@tokens-studio/sd-transforms";
import StyleDictionary from "style-dictionary";
import { transformTypes } from "style-dictionary/enums";
import { fileHeader } from "style-dictionary/utils";

/**
 * Penpot typography keys mapped to their DTCG names.
 *
 * Penpot exports typography composites with the plural Tokens Studio keys,
 * which neither sd-transforms nor Style Dictionary recognise after expansion.
 * Can be removed once https://github.com/penpot/penpot/issues/8140 is fixed.
 */
const PENPOT_TYPOGRAPHY_KEYS = {
  fontFamilies: "fontFamily",
  fontSizes: "fontSize",
  fontWeights: "fontWeight",
  lineHeights: "lineHeight",
};

/**
 * Renames the keys of a Penpot typography value to their DTCG names.
 *
 * A font family list holding a single reference is unwrapped, because the
 * referenced token is a list itself and would otherwise resolve to a nested
 * array.
 *
 * @param {Record<string, unknown>} value typography composite value
 * @returns {Record<string, unknown>} value with DTCG keys
 */
const normalizeTypography = (value) => {
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[PENPOT_TYPOGRAPHY_KEYS[key] ?? key] = v;
  }
  if (Array.isArray(out.fontFamily) && out.fontFamily.length === 1) {
    out.fontFamily = out.fontFamily[0];
  }
  return out;
};

StyleDictionary.registerPreprocessor({
  name: "penpot/typography",
  preprocessor: function walk(node) {
    if (node && typeof node === "object") {
      if (node.$type === "typography" && typeof node.$value === "object") {
        node.$value = normalizeTypography(node.$value);
      } else {
        Object.values(node).forEach(walk);
      }
    }
    return node;
  },
});

/**
 * Reads family, weight and style of a font token from its path
 * (`asset.font.<family>.<weight>.<style>`).
 */
StyleDictionary.registerTransform({
  name: "attribute/font",
  type: transformTypes.attribute,
  transform: (prop) => ({
    category: prop.path[0],
    type: prop.path[1],
    family: prop.path[2],
    weight: prop.path[3],
    style: prop.path[4],
  }),
});

/**
 * File extension mapped to the `format()` hint of `@font-face` `src`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src
 */
const FONT_SRC_FORMATS = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

/**
 * One `@font-face` rule per font token. The token value is the file path
 * without extension, `formats` lists the available extensions.
 */
StyleDictionary.registerFormat({
  name: "font-face",
  format: async ({ dictionary: { allTokens }, options, file }) => {
    const { fontPathPrefix = "" } = options;

    const rules = allTokens.map((prop) => {
      const { family, weight, style } = prop.attributes;
      const srcs = (prop.formats ?? ["woff2"])
        .map(
          (ext) =>
            `url("${fontPathPrefix}${prop.$value}.${ext}") format("${FONT_SRC_FORMATS[ext]}")`,
        )
        .join(", ");
      return [
        "@font-face {",
        `  font-family: "${family}";`,
        `  font-style: ${style};`,
        `  font-weight: ${weight};`,
        `  src: ${srcs};`,
        "  font-display: fallback;",
        "}",
      ].join("\n");
    });
    return (await fileHeader({ file })) + rules.join("\n\n") + "\n";
  },
});

/** Expanded typography sub-token key mapped to its CSS property. */
const TYPOGRAPHY_PROPERTIES = {
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  lineHeight: "line-height",
  letterSpacing: "letter-spacing",
  textCase: "text-transform",
  textDecoration: "text-decoration",
};

/**
 * One `.text-<token>` rule per typography token, using the expanded custom
 * properties so the rules follow theme overrides.
 *
 * Tokens named `h1` to `h6` also style the matching element. The element
 * selector sits in `:where()` so it has zero specificity and site CSS can
 * override it.
 */
StyleDictionary.registerFormat({
  name: "css/typography-classes",
  format: async ({ dictionary: { allTokens }, file }) => {
    const classes = new Map();
    for (const token of allTokens) {
      const key = token.path.at(-1);
      const property = TYPOGRAPHY_PROPERTIES[key];
      if (!property) continue;
      // The token name is the composite name followed by the kebab-cased key.
      const keySuffix = "-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
      const className = token.name.slice(0, -keySuffix.length);
      if (!classes.has(className)) classes.set(className, []);
      classes.get(className).push(`  ${property}: var(--${token.name});`);
    }
    const rules = [...classes].map(([name, decls]) => {
      const selector = /^h[1-6]$/.test(name)
        ? `:where(${name}), .text-${name}`
        : `.text-${name}`;
      return `${selector} {\n${decls.join("\n")}\n}`;
    });
    return (await fileHeader({ file })) + rules.join("\n\n") + "\n";
  },
});

/**
 * Style Dictionary config for one theme.
 *
 * @param {object} pass
 * @param {string[]} pass.source token files to load, later files take precedence
 * @param {string} pass.dest output file name without leading underscore and extension
 * @param {string} [pass.media] media query wrapping the `:root` block
 * @param {string[]} [pass.onlyFiles] only emit tokens defined in these files
 * @param {boolean} [pass.typographyClasses] also emit `typography.css`
 * @returns {import("style-dictionary/types").Config}
 */
export default function getConfig(pass) {
  const { source, dest, media, onlyFiles, typographyClasses } = pass;

  const files = [
    {
      destination: `_${dest}.css`,
      format: "css/variables",
      options: {
        selector: media ? [`@media ${media}`, ":root"] : ":root",
        outputReferences: true,
      },
      ...(onlyFiles && {
        filter: (token) => onlyFiles.includes(token.filePath),
      }),
    },
  ];
  if (typographyClasses) {
    files.push({
      destination: "typography.css",
      format: "css/typography-classes",
    });
  }

  return {
    source,
    usesDtcg: true,
    preprocessors: ["penpot/typography", "tokens-studio"],
    log: { warnings: "error" },
    expand: {
      typesMap: {
        ...expandTypesMap,
        // Penpot exports letter spacing without a unit. DTCG types it as a
        // dimension, so it gets px like font sizes.
        typography: { ...expandTypesMap.typography, letterSpacing: "dimension" },
      },
    },
    platforms: {
      css: {
        transformGroup: "tokens-studio",
        // Runs after the group, so name/kebab overrides its name/camel.
        transforms: ["name/kebab", "size/pxToRem"],
        buildPath: "build/css/",
        files,
        // Theme overrides reference tokens defined only in the base file,
        // which Style Dictionary reports as filtered out references.
        // Broken references still fail the build.
        ...(onlyFiles && { log: { warnings: "disabled" } }),
      },
    },
  };
}

/**
 * Style Dictionary config for `fonts.css`. Fonts are the same for every
 * theme, so this is built once.
 *
 * @param {string[]} source font token files
 * @returns {import("style-dictionary/types").Config}
 */
export const fontsConfig = (source) => ({
  source,
  usesDtcg: true,
  preprocessors: ["tokens-studio"],
  log: { warnings: "error" },
  platforms: {
    "css-font-face": {
      transforms: ["name/kebab", "attribute/font"],
      buildPath: "build/css/",
      files: [
        {
          destination: "fonts.css",
          format: "font-face",
          filter: { attributes: { category: "asset", type: "font" } },
          // Root-absolute, the site serves fonts from /fonts/.
          options: { fontPathPrefix: "/" },
        },
      ],
    },
  },
});

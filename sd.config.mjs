import { expandTypesMap } from "@tokens-studio/sd-transforms";
import StyleDictionary from "style-dictionary";
import { transformTypes } from "style-dictionary/enums";

// Register an "attribute" transform to codify the font's details
// as named attributes.
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

// https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src
const FONT_SRC_FORMATS = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

// Register a custom format to generate @font-face rules.
StyleDictionary.registerFormat({
  name: "font-face",
  format: ({ dictionary: { allTokens }, options }) => {
    const { fontPathPrefix = "", formats = ["woff2", "woff"] } = options;

    return allTokens
      .map((prop) => {
        const { family, weight, style } = prop.attributes;
        const path = prop.$value ?? prop.value;
        const srcs = formats
          .map(
            (ext) =>
              `url("${fontPathPrefix}${path}.${ext}") format("${FONT_SRC_FORMATS[ext]}")`,
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
      })
      .join("\n\n");
  },
});

/**
 * Like the builtin css/variables, but wraps the block in a media query.
 * (The builtin format only supports `selector`, not `media`.)
 */
StyleDictionary.registerFormat({
  name: "css/variables-media",
  format: ({ dictionary: { allTokens }, options, file }) => {
    const { media = "", selector = ":root" } = options;
    const declarations = allTokens
      .map((t) => "  --" + t.name + ": " + (t.$value ?? t.value) + ";")
      .join("\n");
    const body = selector + " {\n" + declarations + "\n}";
    const output = media
      ? "@media " + media + " {\n" + body.replace(/^/gm, "  ") + "\n}"
      : body;
    return (
      "/* Do not edit directly, this file was auto-generated. */\n\n" +
      output +
      "\n"
    );
  },
});

/**
 * @param {object}  pass
 * @param {string[]} pass.source    token files to load (order = precedence)
 * @param {string}   [pass.media]     media query for system-following
 * @param {string}   pass.dest        output filename base (without _ and ext)
 * @param {string[]} [pass.onlyFiles] emit only tokens from these files (diff mode)
 */
export default function getConfig(pass) {
  const { source, media, dest, onlyFiles } = pass;

  const diffFilter =
    onlyFiles && ((token) => onlyFiles.includes(token.filePath));

  const files = [
    {
      destination: `_${dest}.css`,
      format: media ? "css/variables-media" : "css/variables",
      ...(media && { options: { media } }),
      ...(diffFilter && { filter: diffFilter }),
    },
  ];

  return {
    source,
    usesDtcg: true,
    preprocessors: ["tokens-studio"],
    expand: { typesMap: expandTypesMap },
    platforms: {
      css: {
        transformGroup: "tokens-studio",
        buildPath: "build/css/",
        files,
      },
    },
  };
}

// Fonts pass (mode-independent, built once)
export const fontsConfig = (source) => ({
  source,
  usesDtcg: true,
  preprocessors: ["tokens-studio"],
  platforms: {
    "css-font-face": {
      transforms: ["name/kebab", "attribute/font"],
      buildPath: "build/css/",
      files: [
        {
          destination: "fonts.css",
          format: "font-face",
          filter: { attributes: { category: "asset", type: "font" } },
          options: { fontPathPrefix: "/" }, // relative to stylesheet — no root-absolute paths
        },
      ],
    },
  },
});

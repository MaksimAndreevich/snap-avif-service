import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: {},
  },

  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
];

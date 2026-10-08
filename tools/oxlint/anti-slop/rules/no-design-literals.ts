import { defineRule } from "@oxlint/plugins";

// A string that is nothing but a colour: #rgb, #rgba, #rrggbb, #rrggbbaa, or an rgb()/rgba()/hsl()/
// hsla() call. Whole-string only, so "Order #10428" and "abc" are never mistaken for one.
const colourLiteral =
  /^\s*(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?)\([^)]*\))\s*$/i;

// The type properties .claude/instruction_mds/frontend.md rule 6 keeps out of call sites. The uppercase label and
// tabular digits live in the theme tokens (labelMedium, amount), so a call site never needs either.
const typeKeys = new Set([
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "fontFamily",
  "textTransform",
  "fontVariant",
]);

/**
 * Ban colour literals and inline type properties. Scoped in .oxlintrc.json: on for src/**, off for
 * src/themes.js, the one file allowed to define them (.claude/instruction_mds/frontend.md rules 5 and 6).
 */
export const noDesignLiteralsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow colour literals and inline font properties outside the theme file.",
    },
    messages: {
      colour:
        "Colour literal outside src/themes.js. Read a key from the theme; if the design needs a colour the theme lacks, add the key to both themes (.claude/instruction_mds/frontend.md rule 5).",
      type:
        "Inline `{{name}}` outside src/themes.js. Use a Paper Text variant; sizes live in the theme (.claude/instruction_mds/frontend.md §3.1).",
    },
  },
  createOnce(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string" && colourLiteral.test(node.value)) {
          context.report({ node, messageId: "colour" });
        }
      },
      Property(node) {
        const key = node.key;
        const name =
          key.type === "Identifier"
            ? key.name
            : key.type === "Literal" && typeof key.value === "string"
              ? key.value
              : null;
        if (name !== null && typeKeys.has(name)) {
          context.report({ node: key, messageId: "type", data: { name } });
        }
      },
    };
  },
});

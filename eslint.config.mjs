import eslint from "@eslint/js"
import prettier from "eslint-plugin-prettier/recommended"
import tsdoc from "eslint-plugin-tsdoc"
import tseslint from "typescript-eslint"

export default tseslint.config(
	{
		ignores: ["dist"],
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	prettier,
	{
		plugins: {
			tsdoc,
		},
		rules: {
			"no-console": ["warn", { allow: ["info", "warn", "error"] }],
			"no-debugger": "warn",
			"no-undef": "off",
			curly: "error",
			"prefer-const": "error",
			"padding-line-between-statements": [
				"error",
				{
					blankLine: "always",
					prev: "*",
					next: "return",
				},
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-require-imports": "off",
			"@typescript-eslint/explicit-module-boundary-types": "error",
			"@typescript-eslint/consistent-type-imports": "error",
			"tsdoc/syntax": "warn",
		},
	},
)

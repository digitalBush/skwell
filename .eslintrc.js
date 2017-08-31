module.exports = {
	extends: [ "leankit", "leankit/es6" ],
	parserOptions: {
		ecmaVersion: 2017,
		sourceType: 'module'
	},
	rules: {
		strict: [ "error", "global" ],
		"init-declarations": 0,
		"global-require": 0,
		"max-lines": 0,
		"padded-blocks": ["error", {
			classes: "always",
			blocks: "never",
			switches: "never"
		}]
	}
};

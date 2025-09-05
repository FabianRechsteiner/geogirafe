const { defineConfig, globalIgnores } = require('eslint/config');

const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const esX = require('eslint-plugin-es-x');
const globals = require('globals');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

// FlatCompat is a temporary compatibility layer that helps migrate from the legacy
// ESLint config format (.eslintrc) to the new flat config format (eslint.config.js).
// It allows us to continue using legacy config presets like "eslint:recommended"
// and "plugin:@typescript-eslint/recommended" until all plugins support flat config natively.
// TODO REG: In a more or less near future, this should be migrated.
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([
  {
    extends: compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      '@esX': esX
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_'
        }
      ],
      // With ES2022, Safari does not fully support TLA (top level await)
      // see https://caniuse.com/mdn-javascript_operators_await_top_level
      // Therefore, we deactivate the usage of TPA for the moment.
      '@esX/no-top-level-await': 'error'
    }
  },
  {
    files: [
      'src/tools/state/brain/**/*.ts',
      'src/tools/utils/**/*.ts',
      'src/tools/ogcapi/**/*.ts',
      'src/tools/auth/authmanager.ts',
      'src/tools/auth/openidconnectmanager.ts',
      'src/components/drawing/**/*.ts',
      'src/components/map/component.ts',
      'src/components/userpreferences/userPreference.ts',
      'src/components/extlayers/component.ts'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  globalIgnores(['src/tools/tests', 'src/typings', '**/*.spec.ts'])
]);

import js from '@eslint/js';
import globals from 'globals';

export default [{
  ignores: [
    'node_modules/**',
    'reports/**',
    'tmp/**',
    'tests/fixtures/**'
  ]
}, {
  ...js.configs.recommended,
  languageOptions: {
    globals: {
      ...globals.node
    }
  }
}, {
  files: [
    'tests/**'
  ],
  ...js.configs.recommended,
  languageOptions: {
    globals: {
      ...globals.mocha
    }
  }
}];

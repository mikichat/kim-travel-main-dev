const js = require('@eslint/js');
const globals = require('globals');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,

  // 무시할 파일
  {
    ignores: ['node_modules/**', 'logs/**', 'coverage/**', 'scripts/**'],
  },

  // 소스 파일 (CommonJS, Node.js)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },

  // 테스트 파일 (Jest globals 추가)
  {
    files: ['__tests__/**/*.js', 'jest.config.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // Prettier 충돌 방지
  prettierConfig,
];

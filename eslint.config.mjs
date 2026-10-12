// ESLint flat config, adopted incrementally: CI lints only files changed in a PR
// (see .github/workflows/ci.yml). Rules target real bugs, not formatting.
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

const bugRules = {
    // Unawaited promises silently drop errors (a common source of unhandled rejections here)
    // Logger methods are async but catch everything internally, so fire-and-forget calls are safe
    '@typescript-eslint/no-floating-promises': ['error', {
        ignoreVoid: true,
        ignoreIIFE: true,
        // path is relative to the package's tsconfig root (server/)
        allowForKnownSafeCalls: [{ from: 'file', name: ['log', 'debug', 'info', 'warn', 'error'], path: 'src/utils/Logger.ts' }]
    }],
    // Async callbacks passed where a void return is expected (e.g. Express handlers) are fine
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    // Existing codebase uses `any` widely; tightening that is separate work
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-useless-escape': 'warn',
    'no-case-declarations': 'warn',
    'prefer-const': 'warn',
    // TypeScript already checks undefined identifiers (and the client relies on auto-imports)
    'no-undef': 'off'
};

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**', '**/dist/**', '**/dist-*/**', '**/*.d.ts',
            'ams/**', 'backup/**', 'tmp/**', 'logs/**', '.venv/**', 'genblaze/**',
            'electron/**', 'client/public/**', 'server/bin/**', 'server/scripts/**',
            '**/vite.config.ts', '**/vitest.config.ts', 'eslint.config.mjs'
        ]
    },

    ...tseslint.configs.recommended,

    // Server (Node)
    {
        files: ['server/src/**/*.ts', 'server/tests/**/*.ts'],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: bugRules
    },

    // Client (Vue + TS)
    ...pluginVue.configs['flat/essential'],
    {
        files: ['client/src/**/*.{ts,vue}', 'client/tests/**/*.ts'],
        languageOptions: {
            globals: globals.browser,
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.vue'],
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            ...bugRules,
            // Rendering untrusted HTML is how the earlier XSS happened; require sanitizeHtml/escapeHtml
            'vue/no-v-html': 'warn',
            'vue/multi-word-component-names': 'off',
            'vue/no-mutating-props': 'warn'
        }
    },

    // Test files aren't part of the tsconfig projects: lint them without type information
    {
        files: ['server/tests/**/*.ts', 'client/tests/**/*.ts'],
        ...tseslint.configs.disableTypeChecked,
        languageOptions: {
            ...tseslint.configs.disableTypeChecked.languageOptions,
            parser: tseslint.parser,
            parserOptions: { projectService: false, project: null }
        }
    }
);

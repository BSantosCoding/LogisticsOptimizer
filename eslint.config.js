import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                // Browser globals
                console: 'readonly',
                document: 'readonly',
                window: 'readonly',
                crypto: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                localStorage: 'readonly',
                FileReader: 'readonly',
                confirm: 'readonly',
                alert: 'readonly',
                navigator: 'readonly',

                // DOM types
                HTMLInputElement: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLButtonElement: 'readonly',
                HTMLSpanElement: 'readonly',
                HTMLTextAreaElement: 'readonly',

                // TypeScript built-ins
                Set: 'readonly',
                Map: 'readonly',
                Promise: 'readonly',
                Record: 'readonly',
                Partial: 'readonly',
                Omit: 'readonly',
                React: 'readonly',

                // Node.js (for config files)
                process: 'readonly',
                __dirname: 'readonly',
                module: 'readonly',
                require: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react': react,
            'react-hooks': reactHooks
        },
        rules: {
            // Unused variables - warn level for cleanup
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],

            // React hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // TypeScript specific
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',

            // General code quality
            'no-console': 'off',
            'prefer-const': 'warn',
            'no-var': 'error'
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    },
    {
        ignores: ['dist/**', 'node_modules/**', '*.config.js']
    }
];

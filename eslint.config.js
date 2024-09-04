import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
  js.configs.recommended,
  includeIgnoreFile(gitignorePath),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        browser: 'readonly',
        game: 'writable',
        Roll: 'writable',
        ChatMessage: 'writable',
        Dialog: 'writable',
        foundry: 'writable',
        ui: 'writable',
        console: 'writable',
        Hooks: 'writable',
        CONFIG: 'writable',
        MidiQOL: 'writable',
        fromUuidSync: 'writable',
        CONST: 'writable',
        canvas: 'writable',
        elwinHelpers: 'writable',
        PIXI: 'writable',
        Ray: 'writable',
        fromUuid: 'writable',
        ActiveEffect: 'writable',
        Item: 'writable',
        Macro: 'writable',
        Token: 'writable',
        TokenDocument: 'writable',
        Actor: 'writable',
        VideoHelper: 'writable',
        socketlib: 'writable',
        document: 'writable',
        socket: 'writable',
        DAE: 'writable',
        duplicate: 'writable',
        chrisPremades: 'writable',
        macroUtil: 'writable',
        dragRuler: 'writable',
        OperatorTerm: 'writable',
        NumericTerm: 'writable',
        Die: 'writable',
        setTimeout: 'writable',
        structuredClone: 'writable',
        Sequence: 'writable',
        getProperty: 'writable',
        system: 'writable',
        Sequencer: 'writable',
        randomID: 'writable',
        SimpleCalendar: 'writable',
        Folder: 'writable',
      },
    },
    rules: {
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
          ignoredNodes: ['TemplateLiteral *', 'ConditionalExpression *'],
        },
      ],
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      semi: ['error', 'always'],
      'no-unused-vars': ['off'],
      'no-inner-declarations': ['off'],
      'no-async-promise-executor': ['off'],
    },
  },
];

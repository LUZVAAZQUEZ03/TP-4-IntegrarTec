import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
          parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          keepClassNames: true,
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  // pnpm uses symlinks: transform everything inside node_modules.
  // Jest still skips JSON/binary by default; performance impact is acceptable
  // because we only run e2e on demand.
  transformIgnorePatterns: [],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testTimeout: 30000,
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
};

export default config;

import type { Config } from 'jest'

const config: Config = {
  displayName: 'tms',

  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.ts'],

  preset: 'ts-jest',
  /* testEnvironment: 'node', */ // ✅ 중요 (pure logic)
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json'
      }
    ]
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@repo/(.*)$': '<rootDir>/../../packages/$1/index.js'
  },
  // workspace 패키지의 ESM 문법을 ts-jest가 변환하도록 허용한다.
  transformIgnorePatterns: ['node_modules/(?!(@repo)/)']

  /* globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }
  } */
}

export default config

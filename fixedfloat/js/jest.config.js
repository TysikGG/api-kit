/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/live/"],
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text", "text-summary"],
  coverageThreshold: {
    global: {
      lines: 95,
      statements: 95,
    },
  },
};

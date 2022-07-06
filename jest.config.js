const config = require("@karakuri-ai/jest-config/jest.config");

config.rootDir = "src";
config.globals = {
  preset: "ts-jest",
  "ts-jest": {
    tsconfig: "./tsconfig.json",
  },
};
config.testTimeout = 30 * 1000;
config.transform = {
  "^.+\\.(t|j)sx?$": ["@swc/jest"],
};

module.exports = config;

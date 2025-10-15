module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  // Avoid running compiled JavaScript tests under build/ causing duplicate execution & socket issues
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
};

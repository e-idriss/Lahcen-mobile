/**
 * Jest setup.
 *
 * AsyncStorage is a native module with no implementation under Node, so it
 * throws on import. The package ships an official in-memory mock — use that
 * rather than hand-rolling one.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

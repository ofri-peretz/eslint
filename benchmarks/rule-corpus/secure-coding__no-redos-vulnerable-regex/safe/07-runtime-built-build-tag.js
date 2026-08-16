/**
 * SAFE - A build-tag matcher assembled from two escaped configuration values.
 * `^release-\d+\+(\.\d+)*$` after interpolation: `\d+` is terminated by a
 * mandatory literal separator, and `(\.\d+)*` requires a `.` to start each
 * iteration, so no two quantifiers can ever trade characters.
 */
import { escapeRegExp } from 'lodash-es';

export function createBuildTagMatcher(config) {
  const prefix = escapeRegExp(config.tagPrefix);
  const separator = escapeRegExp(config.buildSeparator);
  return new RegExp(`^${prefix}\\d+${separator}(\\.\\d+)*$`);
}

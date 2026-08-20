/**
 * SAFE - OpenFeature's evaluation API. `evaluate` is the verb every flag SDK
 * uses, and the argument is an evaluation context object.
 */
import { evaluate } from '../lib/flags';

export interface UserContext {
  readonly userId: string;
  readonly plan: 'free' | 'team';
}

export function canUseExport(userContext: UserContext): boolean {
  return evaluate(userContext).flags.exportEnabled === true;
}

/**
 * SAFE - NgRx. `select` here is the store operator and its argument is a memoised
 * selector function, not a string, let alone an XPath expression. There is no XML
 * anywhere in this file.
 */
import { Store, select } from '@ngrx/store';
import { map } from 'rxjs/operators';
import type { Observable } from 'rxjs';

import { selectUserProfile } from '../state/user.selectors';

export function profileName$(store: Store): Observable<string> {
  return store.pipe(select(selectUserProfile)).pipe(map((profile) => profile.displayName));
}

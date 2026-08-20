/**
 * SAFE - ADVERSARIAL. The BROWSER `DOMParser` global, not @xmldom/xmldom. Per
 * the HTML standard an XML document parsed by `DOMParser` has no external
 * entity resolution: user agents do not fetch external entities, so XXE is not
 * reachable through this API at all. The input is also a compiled-in constant.
 *
 * Only the construction site tells this apart from vulnerable/04.
 */
import React from 'react';

const SPRITE_SHEET = '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="check"/></svg>';

export function useSpriteSheet() {
  return React.useMemo(() => new DOMParser().parseFromString(SPRITE_SHEET, 'image/svg+xml'), []);
}

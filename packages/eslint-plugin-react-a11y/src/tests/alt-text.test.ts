/**
 * Comprehensive tests for alt-text rule
 * Accessibility: WCAG 2.1 Level A
 * (Renamed from img-requires-alt to match jsx-a11y naming)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { altText } from '../rules/alt-text';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('alt-text', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - images with alt text', altText, {
      valid: [
        // Image with alt attribute
        {
          name: 'an image with descriptive alt text',
          code: '<img src="photo.jpg" alt="A beautiful sunset" />',
        },
        {
          name: 'a descriptive alt on a logo image',
          code: '<img src="logo.png" alt="Company logo" />',
        },
        // Image with empty alt (decorative)
        {
          code: '<img src="decoration.png" alt="" />',
        },
        // Image with aria-label (if allowed)
        {
          code: '<img src="photo.jpg" aria-label="A beautiful sunset" />',
          options: [{ allowAriaLabel: true }],
        },
        // Image with aria-labelledby (if allowed)
        {
          code: '<img src="photo.jpg" aria-labelledby="img-desc" />',
          options: [{ allowAriaLabelledby: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Alt', () => {
    ruleTester.run('invalid - images without alt text', altText, {
      valid: [],
      invalid: [
        // Note: Rule may not detect all missing alt cases
        // Some patterns may not be detected due to JSX parsing limitations
        // These tests represent expected behavior, but rule may need enhancement
        {
          // @found fidelity model react-a11y/alt_text
          name: 'FN: alt={undefined} renders no alt',
          code: '<img src="photo.jpg" alt={undefined} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        {
          name: 'an image with no alt attribute',
          code: '<img src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="logo.png" className="logo" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="logo.png" className="logo" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="logo.png" className="logo" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src={imageSrc} />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src={imageSrc} alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src={imageSrc} alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: `
            <div>
              <img src="photo.jpg" />
            </div>
          `,
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: `
            <div>
              <img src="photo.jpg" alt="TODO: Add descriptive text" />
            </div>
          `,
                },
                {
                  messageId: 'useEmptyAlt',
                  output: `
            <div>
              <img src="photo.jpg" alt="" />
            </div>
          `,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', altText, {
      valid: [],
      invalid: [
        {
          code: '<img src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options - allowAriaLabel', () => {
    ruleTester.run('allowAriaLabel option', altText, {
      valid: [
        {
          code: '<img src="photo.jpg" aria-label="Description" />',
          options: [{ allowAriaLabel: true }],
        },
      ],
      invalid: [
        {
          code: '<img src="photo.jpg" />',
          options: [{ allowAriaLabel: true }],
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options - allowAriaLabelledby', () => {
    ruleTester.run('allowAriaLabelledby option', altText, {
      valid: [
        {
          code: '<img src="photo.jpg" aria-labelledby="img-desc" />',
          options: [{ allowAriaLabelledby: true }],
        },
      ],
      invalid: [
        {
          code: '<img src="photo.jpg" />',
          options: [{ allowAriaLabelledby: true }],
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', altText, {
      valid: [
        // Not an img element
        {
          code: '<div src="photo.jpg" />',
        },
        {
          code: '<Image src="photo.jpg" />',
        },
        // Image with JSXSpreadAttribute (to cover line 89-91 in getAltValue)
        {
          code: '<img src="photo.jpg" {...props} alt="Description" />',
        },
        // `alt={undefined}` is NOT here: React drops an undefined attribute,
        // so it renders no alt at all (jsx-a11y reports it too). See the
        // 'FN: alt={undefined} renders no alt' case.
      ],
      invalid: [
        // Image with JSXSpreadAttribute but no alt (to cover line 89-91)
        // Note: The rule may not detect this case if spread attributes are present
        // This test covers the getAltValue function's handling of non-JSXAttribute types
        {
          code: '<img {...props} src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img {...props} src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img {...props} src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        // Image with filename-based suggestion (to cover line 149)
        {
          code: '<img src="/images/beautiful-sunset.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        // Image with no attributes except src (to cover lines 196-213 - no lastAttr case)
        {
          code: '<img src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases - hasAriaLabel', () => {
    ruleTester.run('edge cases - aria-label with JSXSpreadAttribute (line 107)', altText, {
      valid: [
        // Test with JSXSpreadAttribute to cover line 107 (attr.type !== 'JSXAttribute')
        {
          code: '<img src="photo.jpg" {...props} aria-label="Description" />',
          options: [{ allowAriaLabel: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Uncovered Lines', () => {
    // Lines 89-91: getAltValue edge cases
    ruleTester.run('line 89-91 - getAltValue edge cases', altText, {
      valid: [
        // alt attribute with no value (empty alt)
        {
          code: '<img src="photo.jpg" alt />',
        },
        // alt attribute with empty string value
        {
          code: '<img src="photo.jpg" alt="" />',
        },
        // JSXSpreadAttribute before alt (to test getAltValue with spread)
        {
          code: '<img {...props} alt="test" />',
        },
      ],
      invalid: [
        // No invalid cases here. The previous fixtures (`alt={undefined}`,
        // `alt={imageAlt}`) were moved to `valid:` 2026-05-09 — the rule
        // now matches jsx-a11y semantics and trusts dynamic alt values.
      ],
    });

    // Line 149: filename-based suggestion in suggestAltText
    ruleTester.run('line 149 - filename-based suggestion', altText, {
      valid: [],
      invalid: [
        {
          code: '<img src="/images/beautiful-sunset.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="/images/beautiful-sunset.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="user_profile_picture.png" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="user_profile_picture.png" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="user_profile_picture.png" alt="" />',
                },
              ],
            },
          ],
        },
        {
          code: '<img src="https://example.com/images/product-hero.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="https://example.com/images/product-hero.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="https://example.com/images/product-hero.jpg" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });

    // Lines 196-213: Fixer with no attributes (lastAttr is undefined)
    ruleTester.run('line 196-213 - fixer with no attributes', altText, {
      valid: [],
      invalid: [
        // Image with only src attribute (to test lastAttr handling)
        {
          code: '<img src="photo.jpg" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" alt="" />',
                },
              ],
            },
          ],
        },
        // Image with multiple attributes to test lastAttr fallback
        {
          code: '<img src="photo.jpg" className="image" id="img1" />',
          errors: [
            {
              messageId: 'missingAlt',
              suggestions: [
                {
                  messageId: 'addDescriptiveAlt',
                  output: '<img src="photo.jpg" className="image" id="img1" alt="TODO: Add descriptive text" />',
                },
                {
                  messageId: 'useEmptyAlt',
                  output: '<img src="photo.jpg" className="image" id="img1" alt="" />',
                },
              ],
            },
          ],
        },
      ],
    });

    // alt={variable} / alt={getAltText()} — dynamic values are accepted by
    // the rule per the jsx-a11y semantics adopted 2026-05-09 (alt={undefined}
    // is not dynamic: it renders no alt, and is reported):
    // "when alt resolves to a non-string expression, the rule trusts the
    // author." This matches the standard `jsx-a11y/alt-text` contract and
    // is what every major React codebase expects.
    ruleTester.run('dynamic alt values are valid (jsx-a11y semantics)', altText, {
      valid: [
        { code: '<img src="photo.jpg" alt={altText} />' },
        { code: '<img src="photo.jpg" alt={getAltText()} />' },
      ],
      invalid: [],
    });
  });

  /**
   * Regression lock — `next/image` is resolved from its IMPORT, not from a name list.
   *
   * It is the dominant image component in every Next.js app and was invisible unless the
   * consumer set `{ img: ['Image'] }` — a default nobody sets, on the framework most likely
   * to need it. Resolving the import catches `import Pic from 'next/image'` too, while an
   * unrelated `<Image>` from a charting library stays out of scope.
   */
  describe('next/image resolved from the import', () => {
    ruleTester.run('next-image-from-import', altText, {
      valid: [
        {
          code: "import Image from 'next/image';\nconst H = () => <Image src={s} alt='hero' />;",
        },
        // A same-named component from an unrelated module is not an image.
        {
          code: "import Image from 'some-chart-lib';\nconst H = () => <Image src={s} />;",
        },
        // A namespace import binds the module, not a component.
        {
          code: "import * as NS from 'next/image';\nconst H = () => <NS src={s} />;",
        },
        // DEFAULT import only. `next/image` also exports `getImageProps`, a helper that
        // returns props rather than rendering — aliasing it to `Image` does not make it
        // an image component.
        {
          code: "import { getImageProps as Image } from 'next/image';\nconst H = () => <Image src={s} />;",
        },
      ],
      invalid: [
        {
          code: "import Image from 'next/image';\nconst H = () => <Image src={s} width={8} height={4} />;",
          errors: 1,
        },
        // Renamed default import — the local name is irrelevant, the module is what counts.
        {
          code: "import Pic from 'next/image';\nconst H = () => <Pic src={s} />;",
          errors: 1,
        },
        // Legacy and future paths ship in real Next.js codebases.
        {
          code: "import Image from 'next/legacy/image';\nconst H = () => <Image src={s} />;",
          errors: 1,
        },

      ],
    });
  });
});

/**
 * `elements` and the `input[type="image"]` key, cases ported from upstream's
 * `__tests__/src/rules/alt-text-test.js` at v6.10.2 (its `array` options object
 * and the `Object` / `Area` / `InputImage` cases that use it). Upstream cases
 * with `alt` written as a bare attribute (`<Image alt />`) are not ported: this
 * rule reads a bare `alt` as an empty, decorative one.
 */
const UPSTREAM_ARRAY_OPTIONS = {
  img: ['Thumbnail', 'Image'],
  object: ['Object'],
  area: ['Area'],
  'input[type="image"]': ['InputImage'],
};

describe('alt-text custom components, upstream option names', () => {
  ruleTester.run('upstream array options', altText, {
    valid: [
      { name: 'a listed img component with alt', code: '<Thumbnail alt="foo" />;', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'an unlisted component is not checked', code: '<Card />;', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed object component with aria-label', code: '<Object aria-label="foo" />', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed object component with text', code: '<Object>Foo</Object>', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed object component with title', code: '<Object title="An object" />', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed area component with aria-labelledby', code: '<Area aria-labelledby="id1" />', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed area component with empty alt', code: '<Area alt="" />', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed input-image component with aria-label', code: '<InputImage aria-label="foo" />', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed input-image component with empty alt', code: '<InputImage alt="" />', options: [UPSTREAM_ARRAY_OPTIONS] },
      { name: 'a listed input-image component with a dynamic alt', code: '<InputImage alt={altText} />', options: [UPSTREAM_ARRAY_OPTIONS] },
    ],
    invalid: [
      { name: 'a listed img component without alt', code: '<Image />;', options: [UPSTREAM_ARRAY_OPTIONS], errors: 1 },
      { name: 'a listed object component without a text alternative', code: '<Object />', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'objectMissingAlternative' }] },
      { name: 'a listed area component without alt', code: '<Area />', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'areaMissingAlternative' }] },
      { name: 'a listed area component whose alt is undefined', code: '<Area alt={undefined} />', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'areaMissingAlternative' }] },
      { name: 'a listed area component with a spread and no alt', code: '<Area {...this.props} />', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'areaMissingAlternative' }] },
      { name: 'a listed input-image component without type or alt', code: '<InputImage />', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'inputImageMissingAlternative' }] },
      { name: 'a listed input-image component whose alt is undefined', code: '<InputImage alt={undefined} />', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'inputImageMissingAlternative' }] },
      { name: 'a listed input-image component with text children only', code: '<InputImage>Foo</InputImage>', options: [UPSTREAM_ARRAY_OPTIONS], errors: [{ messageId: 'inputImageMissingAlternative' }] },
      { name: 'the ours-named inputImage list still works', code: '<ImageButton />', options: [{ inputImage: ['ImageButton'] }], errors: [{ messageId: 'inputImageMissingAlternative' }] },
      { name: 'both input-image lists are merged', code: '<><A /><B /></>', options: [{ inputImage: ['A'], 'input[type="image"]': ['B'] }], errors: [{ messageId: 'inputImageMissingAlternative' }, { messageId: 'inputImageMissingAlternative' }] },
    ],
  });
});

/**
 * `elements` limits which kinds are checked. Every upstream element name has a
 * pair of cases: reported when listed, silent when another one is listed.
 */
const KINDS = [
  { element: 'img', code: '<img />', errors: 1 },
  { element: 'object', code: '<object />', errors: [{ messageId: 'objectMissingAlternative' }] },
  { element: 'area', code: '<area />', errors: [{ messageId: 'areaMissingAlternative' }] },
  { element: 'input[type="image"]', code: '<input type="image" />', errors: [{ messageId: 'inputImageMissingAlternative' }] },
] as const;

describe('alt-text elements option', () => {
  ruleTester.run('elements', altText, {
    valid: KINDS.map(({ element, code }) => ({
      name: `${element} is not checked when only another element is listed`,
      code,
      options: [{ elements: KINDS.filter((k) => k.element !== element).map((k) => k.element) }],
    })).concat([
      { name: 'an empty elements list checks nothing', code: '<img />', options: [{ elements: [] }] },
      { name: 'an unknown element name switches nothing on', code: '<img />', options: [{ elements: ['video'] }] },
      { name: 'a custom component of an unlisted kind is not checked', code: '<Thumbnail />', options: [{ elements: ['object'], img: ['Thumbnail'] } as never] },
    ]),
    invalid: [
      ...KINDS.map(({ element, code, errors }) => ({
        name: `${element} is checked when it is the only element listed`,
        code,
        options: [{ elements: [element] }],
        errors,
      })),
      ...KINDS.map(({ element, code, errors }) => ({
        name: `${element} is checked by default`,
        code,
        errors,
      })),
      {
        name: 'a custom component of a listed kind is checked',
        code: '<Thumbnail />',
        options: [{ elements: ['img'], img: ['Thumbnail'] }],
        errors: 1,
      },
    ],
  });
});

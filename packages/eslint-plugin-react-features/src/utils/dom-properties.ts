/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The property table `react-features/no-unknown-property` checks JSX against.
 *
 * What React's DOM renderer accepts is a published fact (MDN's HTML and SVG
 * attribute indexes, React's DOM-elements reference), so the table is data:
 * what a name is spelled, which tags may carry it, and which React release
 * added or dropped it. The names agree with what `eslint-plugin-react`
 * 7.37.5 (MIT, Yannick Croissant) accepts, because that is the verdict this
 * rule is graded against; the decision flow in the rule is our own.
 */

/** HTML or SVG attribute spelled in the DOM's kebab/colon form -> React's prop name. */
export const DOM_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  'accept-charset': 'acceptCharset',
  class: 'className',
  'http-equiv': 'httpEquiv',
  crossorigin: 'crossOrigin',
  for: 'htmlFor',
  nomodule: 'noModule',
};

const kebab = (name: string): string =>
  name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** SVG presentation attributes React spells in camelCase (`stroke-width` -> `strokeWidth`). */
const SVG_HYPHENATED = [
  'accentHeight',
  'alignmentBaseline',
  'arabicForm',
  'baselineShift',
  'capHeight',
  'clipPath',
  'clipRule',
  'colorInterpolation',
  'colorInterpolationFilters',
  'colorProfile',
  'colorRendering',
  'dominantBaseline',
  'enableBackground',
  'fillOpacity',
  'fillRule',
  'floodColor',
  'floodOpacity',
  'fontFamily',
  'fontSize',
  'fontSizeAdjust',
  'fontStretch',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'glyphName',
  'glyphOrientationHorizontal',
  'glyphOrientationVertical',
  'horizAdvX',
  'horizOriginX',
  'imageRendering',
  'letterSpacing',
  'lightingColor',
  'markerEnd',
  'markerMid',
  'markerStart',
  'overlinePosition',
  'overlineThickness',
  'paintOrder',
  'pointerEvents',
  'renderingIntent',
  'shapeRendering',
  'stopColor',
  'stopOpacity',
  'strikethroughPosition',
  'strikethroughThickness',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'textAnchor',
  'textDecoration',
  'textRendering',
  'underlinePosition',
  'underlineThickness',
  'unicodeBidi',
  'unicodeRange',
  'unitsPerEm',
  'vAlphabetic',
  'vHanging',
  'vIdeographic',
  'vMathematical',
  'vectorEffect',
  'vertAdvY',
  'vertOriginX',
  'vertOriginY',
  'wordSpacing',
  'writingMode',
  'xHeight',
];

/** The namespaced and irregular SVG spellings. */
const SVG_IRREGULAR: Record<string, string> = {
  'panose-1': 'panose1',
  'xlink:actuate': 'xlinkActuate',
  'xlink:arcrole': 'xlinkArcrole',
  'xlink:href': 'xlinkHref',
  'xlink:role': 'xlinkRole',
  'xlink:show': 'xlinkShow',
  'xlink:title': 'xlinkTitle',
  'xlink:type': 'xlinkType',
  'xml:base': 'xmlBase',
  'xml:lang': 'xmlLang',
  'xml:space': 'xmlSpace',
};

export const SVG_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(SVG_HYPHENATED.map((n) => [kebab(n), n])),
  ...SVG_IRREGULAR,
};

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** Names that are one lowercase word, so the DOM and React spell them alike. */
const ONE_WORD = words(`
  dir draggable hidden id lang nonce part slot style title translate inert
  accept action allow alt as async buffered capture challenge cite code cols
  content coords csp data decoding default defer disabled form headers height
  high href icon importance integrity kind label language loading list loop low
  manifest max media method min multiple muted name open optimum pattern ping
  placeholder poster preload profile rel required reversed role rows sandbox
  scope seamless selected shape size sizes span src start step summary target
  type value width wmode wrap
  accumulate additive alphabetic amplitude ascent azimuth bbox begin bias by
  clip color cursor cx cy d decelerate descent direction display divisor dur dx
  dy elevation end exponent fill filter format from fr fx fy g1 g2 hanging
  hreflang ideographic in in2 intercept k k1 k2 k3 k4 kerning local mask mode
  offset opacity operator order orient orientation origin overflow path points
  r radius restart result rotate rx ry scale seed slope spacing speed stemh
  stemv string stroke to transform u1 u2 unicode values version visibility
  widths x x1 x2 xmlns y y1 y2 z
  property ref key children results security controls
  popover popovertarget popovertargetaction
`);

/** Names React spells in camelCase (HTML first, then SVG, then React's own and event handlers). */
const CAMEL_CASE = words(`
  accessKey autoCapitalize autoFocus contentEditable enterKeyHint exportParts
  inputMode itemID itemRef itemProp itemScope itemType spellCheck tabIndex
  acceptCharset autoComplete autoPlay border cellPadding cellSpacing classID
  codeBase colSpan contextMenu dateTime encType formAction formEncType
  formMethod formNoValidate formTarget frameBorder hrefLang httpEquiv imageSizes
  imageSrcSet isMap keyParams keyType marginHeight marginWidth maxLength
  mediaGroup minLength noValidate radioGroup readOnly referrerPolicy rowSpan
  srcDoc srcLang srcSet useMap fetchPriority autoCorrect autoSave
  crossOrigin attributeName attributeType baseFrequency baseProfile calcMode
  clipPathUnits contentScriptType contentStyleType diffuseConstant edgeMode
  filterRes filterUnits glyphRef gradientTransform gradientUnits kernelMatrix
  kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle
  markerHeight markerUnits markerWidth maskContentUnits maskUnits mathematical
  numOctaves pathLength patternContentUnits patternTransform patternUnits
  pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio
  primitiveUnits refX refY repeatCount repeatDur requiredExtensions
  requiredFeatures specularConstant specularExponent spreadMethod startOffset
  stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX
  targetY textLength transformOrigin viewBox viewTarget xChannelSelector
  xmlnsXlink yChannelSelector zoomAndPan
  className dangerouslySetInnerHTML defaultValue defaultChecked htmlFor
  suppressContentEditableWarning suppressHydrationWarning
  autoPictureInPicture controlsList disablePictureInPicture
  disableRemotePlayback popoverTarget popoverTargetAction
  onAnimationEnd onAnimationIteration onAnimationStart onAuxClick onBeforeInput
  onBeforeToggle onBlur onChange onClick onContextMenu onCopy
  onCompositionEnd onCompositionStart onCompositionUpdate onCut onDoubleClick
  onDrag onDragEnd onDragEnter onDragExit onDragLeave onDragOver onDragStart
  onDrop onError onFocus onInput onInvalid onKeyDown onKeyPress onKeyUp onLoad
  onMouseDown onMouseEnter onMouseLeave onMouseMove onMouseOut onMouseOver
  onMouseUp onPaste onReset onScroll onSelect onSubmit onToggle onTouchCancel
  onTouchEnd onTouchMove onTouchStart onTransitionEnd onWheel
  onAbort onCanPlay onCanPlayThrough onDurationChange onEmptied onEncrypted
  onEnded onLoadedData onLoadedMetadata onLoadStart onPause onPlay onPlaying
  onProgress onRateChange onResize onSeeked onSeeking onStalled onSuspend
  onTimeUpdate onVolumeChange onWaiting
`);

/**
 * The `...Capture` twins React registers. Not every handler has one: the
 * enter/leave, pointer-capture and media events do not bubble, so React has
 * no capture variant of them.
 */
const CAPTURE_OF = words(`
  onCopy onCut onPaste onCompositionEnd onCompositionStart onCompositionUpdate
  onFocus onBlur onChange onBeforeInput onInput onReset onSubmit onInvalid
  onLoad onError onKeyDown onKeyPress onKeyUp onAbort onCanPlay onCanPlayThrough
  onDurationChange onEmptied onEncrypted onEnded onLoadedData onLoadedMetadata
  onLoadStart onPause onPlay onPlaying onProgress onRateChange onSeeked
  onSeeking onStalled onSuspend onTimeUpdate onVolumeChange onWaiting onSelect
  onTouchCancel onTouchEnd onTouchMove onTouchStart onScroll onWheel
  onAnimationEnd onAnimationStart onTransitionEnd onAuxClick onClick
  onContextMenu onDoubleClick onDrag onDragEnd onDragEnter onDragExit
  onDragLeave onDragOver onDragStart onDrop onMouseDown onMouseMove onMouseOut
  onMouseOver onMouseUp
`);

/** Pointer events, added in React 16.4. */
const POINTER_EVENTS = [
  'onGotPointerCapture',
  'onLostPointerCapture',
  'onPointerCancel',
  'onPointerDown',
  'onPointerEnter',
  'onPointerLeave',
  'onPointerMove',
  'onPointerOut',
  'onPointerOver',
  'onPointerUp',
].flatMap((n) => [n, `${n}Capture`]);

// Camel-case spellings come first: a case-insensitive match of `popovertarget`
// must land on React's `popoverTarget`, not on the one-word lowercase twin.
const ALWAYS_KNOWN = [
  ...CAMEL_CASE,
  ...ONE_WORD,
  ...SVG_HYPHENATED,
  ...Object.values(SVG_IRREGULAR),
  ...CAPTURE_OF.map((n) => `${n}Capture`),
];

/**
 * Every property name React accepts on a DOM element at `version`.
 * `allowTransparency` went away in 16.1, pointer events arrived in 16.4 and
 * `precedence` (stylesheets) in 19.
 */
export function knownPropertyNames(
  version: readonly [number, number, number],
): readonly string[] {
  const atLeast = (major: number, minor: number): boolean =>
    version[0] > major || (version[0] === major && version[1] >= minor);
  return [
    ...ALWAYS_KNOWN,
    ...(!atLeast(16, 1) ? ['allowTransparency'] : []),
    ...(atLeast(16, 4) ? POINTER_EVENTS : []),
    ...(atLeast(19, 0) ? ['precedence'] : []),
  ];
}

/**
 * Props that are right on some tags only. Naming the tag is the point of
 * these: `crossOrigin` is fine on `<img>` and a mistake on `<div>`.
 */
export const ATTRIBUTE_TAGS: Readonly<Record<string, readonly string[]>> =
  (() => {
    const media = ['audio', 'video'];
    const onMedia = words(`
      onAbort onCanPlay onCanPlayThrough onDurationChange onEmptied onEncrypted
      onEnded onLoadedData onLoadedMetadata onLoadStart onPause onPlay onPlaying
      onProgress onRateChange onResize onSeeked onSeeking onStalled onSuspend
      onTimeUpdate onVolumeChange onWaiting controls controlsList
      disableRemotePlayback loop muted preload
    `);
    const tableCell = ['td', 'th'];
    const tableParts = [
      'tr',
      'td',
      'th',
      'thead',
      'tbody',
      'tfoot',
      'colgroup',
      'col',
    ];
    return {
      abbr: tableCell,
      charset: ['meta'],
      checked: ['input'],
      // `image` is the SVG element; the rest are HTML.
      crossOrigin: ['script', 'img', 'video', 'audio', 'link', 'image'],
      displaystyle: ['math'],
      download: ['a', 'area'],
      fill: [
        'altGlyph',
        'circle',
        'ellipse',
        'g',
        'line',
        'marker',
        'mask',
        'path',
        'polygon',
        'polyline',
        'rect',
        'svg',
        'symbol',
        'text',
        'textPath',
        'tref',
        'tspan',
        'use',
        'animate',
        'animateColor',
        'animateMotion',
        'animateTransform',
        'set',
      ],
      focusable: ['svg'],
      imageSizes: ['link'],
      imageSrcSet: ['link'],
      property: ['meta'],
      viewBox: ['marker', 'pattern', 'svg', 'symbol', 'view'],
      as: ['link'],
      // Deprecated in HTML, but still known on these tags.
      align: [
        'applet',
        'caption',
        'col',
        'colgroup',
        'hr',
        'iframe',
        'img',
        'table',
        'tbody',
        'td',
        'tfoot',
        'th',
        'thead',
        'tr',
      ],
      valign: tableParts,
      noModule: ['script'],
      ...Object.fromEntries(onMedia.map((n) => [n, media])),
      onCancel: ['dialog'],
      onClose: ['dialog'],
      onError: [
        'audio',
        'video',
        'img',
        'link',
        'source',
        'script',
        'picture',
        'iframe',
      ],
      onLoad: [
        'script',
        'img',
        'link',
        'picture',
        'iframe',
        'object',
        'source',
      ],
      autoPictureInPicture: ['video'],
      disablePictureInPicture: ['video'],
      playsInline: ['video'],
      allowFullScreen: ['iframe', 'video'],
      webkitAllowFullScreen: ['iframe', 'video'],
      mozAllowFullScreen: ['iframe', 'video'],
      poster: ['video'],
      scrolling: ['iframe'],
      returnValue: ['dialog'],
      webkitDirectory: ['input'],
      shadowrootmode: ['template'],
      shadowrootclonable: ['template'],
      shadowrootdelegatesfocus: ['template'],
      shadowrootserializable: ['template'],
      'transform-origin': ['rect'],
    };
  })();

/** Spelled by a community convention rather than by React, so any casing is read as one name. */
export const CASE_INSENSITIVE_NAMES: readonly string[] = [
  'charset',
  'allowFullScreen',
  'webkitAllowFullScreen',
  'mozAllowFullScreen',
  'webkitDirectory',
  'popoverTarget',
  'popoverTargetAction',
];

/** The ARIA attributes (WAI-ARIA 1.2 plus the braille and description additions). */
export const ARIA_ATTRIBUTES: ReadonlySet<string> = new Set(
  words(`
    aria-atomic aria-braillelabel aria-brailleroledescription aria-busy
    aria-controls aria-current aria-describedby aria-description aria-details
    aria-disabled aria-dropeffect aria-errormessage aria-flowto aria-grabbed
    aria-haspopup aria-hidden aria-invalid aria-keyshortcuts aria-label
    aria-labelledby aria-live aria-owns aria-relevant aria-roledescription
    aria-autocomplete aria-checked aria-expanded aria-level aria-modal
    aria-multiline aria-multiselectable aria-orientation aria-placeholder
    aria-pressed aria-readonly aria-required aria-selected aria-sort
    aria-valuemax aria-valuemin aria-valuenow aria-valuetext
    aria-activedescendant aria-colcount aria-colindex aria-colindextext
    aria-colspan aria-posinset aria-rowcount aria-rowindex aria-rowindextext
    aria-rowspan aria-setsize
  `),
);

/**
 * ESLint Rule: no-unknown-property
 * Disallow unknown DOM properties in JSX
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noUnknownProperty';

const VALID_DOM_PROPERTIES = new Set([
  // HTML attributes
  'accept', 'acceptCharset', 'accessKey', 'action', 'allowFullScreen', 'allowTransparency',
  'alt', 'async', 'autoComplete', 'autoFocus', 'autoPlay', 'capture', 'cellPadding',
  'cellSpacing', 'challenge', 'charSet', 'checked', 'cite', 'classID', 'className',
  'colSpan', 'cols', 'content', 'contentEditable', 'contextMenu', 'controls', 'coords',
  'crossOrigin', 'data', 'dateTime', 'default', 'defer', 'dir', 'disabled', 'download',
  'draggable', 'encType', 'form', 'formAction', 'formEncType', 'formMethod', 'formNoValidate',
  'formTarget', 'frameBorder', 'headers', 'height', 'hidden', 'high', 'href', 'hrefLang',
  'htmlFor', 'httpEquiv', 'icon', 'id', 'inputMode', 'integrity', 'is', 'keyParams',
  'keyType', 'kind', 'label', 'lang', 'list', 'loop', 'low', 'manifest', 'marginHeight',
  'marginWidth', 'max', 'maxLength', 'media', 'mediaGroup', 'method', 'min', 'minLength',
  'multiple', 'muted', 'name', 'noValidate', 'nonce', 'open', 'optimum', 'pattern',
  'placeholder', 'poster', 'preload', 'profile', 'radioGroup', 'readOnly', 'rel',
  'required', 'reversed', 'role', 'rowSpan', 'rows', 'sandbox', 'scope', 'scoped',
  'scrolling', 'seamless', 'selected', 'shape', 'size', 'sizes', 'span', 'spellCheck',
  'src', 'srcDoc', 'srcLang', 'srcSet', 'start', 'step', 'style', 'summary', 'tabIndex',
  'target', 'title', 'type', 'useMap', 'value', 'width', 'wmode', 'wrap',

  // React-specific attributes
  'children', 'dangerouslySetInnerHTML', 'key', 'ref', 'suppressContentEditableWarning',
  'suppressHydrationWarning',

  // SVG attributes
  'accentHeight', 'accumulate', 'additive', 'alignmentBaseline', 'allowReorder',
  'alphabetic', 'amplitude', 'arabicForm', 'ascent', 'attributeName', 'attributeType',
  'autoReverse', 'azimuth', 'baseFrequency', 'baselineShift', 'baseProfile', 'bbox',
  'begin', 'bias', 'by', 'calcMode', 'capHeight', 'clip', 'clipPath', 'clipPathUnits',
  'clipRule', 'colorInterpolation', 'colorInterpolationFilters', 'colorProfile',
  'colorRendering', 'contentScriptType', 'contentStyleType', 'cursor', 'cx', 'cy',
  'd', 'decelerate', 'descent', 'diffuseConstant', 'direction', 'display', 'divisor',
  'dominantBaseline', 'dur', 'dx', 'dy', 'edgeMode', 'elevation', 'enableBackground',
  'end', 'exponent', 'externalResourcesRequired', 'fill', 'fillOpacity', 'fillRule',
  'filter', 'filterRes', 'filterUnits', 'floodColor', 'floodOpacity', 'focusable',
  'fontFamily', 'fontSize', 'fontSizeAdjust', 'fontStretch', 'fontStyle', 'fontVariant',
  'fontWeight', 'format', 'from', 'fx', 'fy', 'g1', 'g2', 'glyphName', 'glyphOrientationHorizontal',
  'glyphOrientationVertical', 'glyphRef', 'gradientTransform', 'gradientUnits', 'hanging',
  'horizAdvX', 'horizOriginX', 'ideographic', 'imageRendering', 'in', 'in2', 'intercept',
  'k', 'k1', 'k2', 'k3', 'k4', 'kernelMatrix', 'kernelUnitLength', 'kerning', 'keyPoints',
  'keySplines', 'keyTimes', 'lengthAdjust', 'letterSpacing', 'lightingColor', 'limitingConeAngle',
  'local', 'markerEnd', 'markerHeight', 'markerMid', 'markerStart', 'markerUnits', 'markerWidth',
  'mask', 'maskContentUnits', 'maskUnits', 'mathematical', 'mode', 'numOctaves', 'offset',
  'opacity', 'operator', 'order', 'orient', 'orientation', 'origin', 'overflow', 'overlinePosition',
  'overlineThickness', 'paintOrder', 'panose1', 'pathLength', 'patternContentUnits',
  'patternTransform', 'patternUnits', 'pointerEvents', 'points', 'pointsAtX', 'pointsAtY',
  'pointsAtZ', 'preserveAlpha', 'preserveAspectRatio', 'primitiveUnits', 'r', 'radius',
  'refX', 'refY', 'renderingIntent', 'repeatCount', 'repeatDur', 'requiredExtensions',
  'requiredFeatures', 'restart', 'result', 'rotate', 'rx', 'ry', 'scale', 'seed', 'shapeRendering',
  'slope', 'spacing', 'specularConstant', 'specularExponent', 'speed', 'spreadMethod',
  'startOffset', 'stdDeviation', 'stemh', 'stemv', 'stitchTiles', 'stopColor', 'stopOpacity',
  'strikethroughPosition', 'strikethroughThickness', 'string', 'stroke', 'strokeDasharray',
  'strokeDashoffset', 'strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'strokeOpacity',
  'strokeWidth', 'surfaceScale', 'systemLanguage', 'tableValues', 'targetX', 'targetY',
  'textAnchor', 'textDecoration', 'textLength', 'textRendering', 'to', 'transform', 'u1',
  'u2', 'underlinePosition', 'underlineThickness', 'unicode', 'unicodeBidi', 'unicodeRange',
  'unitsPerEm', 'vAlphabetic', 'values', 'vectorEffect', 'version', 'vertAdvY', 'vertOriginX',
  'vertOriginY', 'vHanging', 'vIdeographic', 'viewBox', 'viewTarget', 'visibility', 'vMathematical',
  'widths', 'wordSpacing', 'writingMode', 'x', 'x1', 'x2', 'xChannelSelector', 'xHeight',
  'xlinkActuate', 'xlinkArcrole', 'xlinkHref', 'xlinkRole', 'xlinkShow', 'xlinkTitle',
  'xlinkType', 'xmlBase', 'xmlLang', 'xmlSpace', 'y', 'y1', 'y2', 'yChannelSelector',
  'z', 'zoomAndPan',

  // Event handlers
  'onAbort', 'onAnimationEnd', 'onAnimationIteration', 'onAnimationStart', 'onAuxClick',
  'onBeforeInput', 'onBlur', 'onCanPlay', 'onCanPlayThrough', 'onChange', 'onClick',
  'onCompositionEnd', 'onCompositionStart', 'onCompositionUpdate', 'onContextMenu',
  'onCopy', 'onCut', 'onDoubleClick', 'onDrag', 'onDragEnd', 'onDragEnter', 'onDragExit',
  'onDragLeave', 'onDragOver', 'onDragStart', 'onDrop', 'onDurationChange', 'onEmptied',
  'onEncrypted', 'onEnded', 'onError', 'onFocus', 'onFocusIn', 'onFocusOut', 'onFormData',
  'onGotPointerCapture', 'onInput', 'onInvalid', 'onKeyDown', 'onKeyPress', 'onKeyUp',
  'onLoad', 'onLoadStart', 'onLoadedData', 'onLoadedMetadata', 'onLostPointerCapture',
  'onMouseDown', 'onMouseEnter', 'onMouseLeave', 'onMouseMove', 'onMouseOut', 'onMouseOver',
  'onMouseUp', 'onPaste', 'onPause', 'onPlay', 'onPlaying', 'onPointerCancel', 'onPointerDown',
  'onPointerEnter', 'onPointerLeave', 'onPointerMove', 'onPointerOut', 'onPointerOver',
  'onPointerUp', 'onProgress', 'onRateChange', 'onReset', 'onResize', 'onScroll', 'onSeeked',
  'onSeeking', 'onSelect', 'onStalled', 'onSubmit', 'onSuspend', 'onTimeUpdate', 'onToggle',
  'onTouchCancel', 'onTouchEnd', 'onTouchMove', 'onTouchStart', 'onTransitionEnd', 'onVolumeChange',
  'onWaiting', 'onWheel',
]);

const REACT_PROPS = new Set([
  'defaultChecked', 'defaultValue', 'suppressContentEditableWarning', 'suppressHydrationWarning',
]);

export const noUnknownProperty = createRule<[], MessageIds>({
  name: 'no-unknown-property',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unknown DOM properties',
    },
    schema: [],
    messages: {
      noUnknownProperty: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unknown DOM Property',
        description: 'Unknown DOM property detected',
        severity: 'MEDIUM',
        fix: 'Use standard DOM properties or data attributes (data-*)',
        documentationLink: 'https://react.dev/learn/writing-markup-with-jsx#html-attributes',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type === 'JSXIdentifier') {
          const propName = node.name.name;

          // Skip React-specific props and data attributes
          if (REACT_PROPS.has(propName) || propName.startsWith('data-') || propName.startsWith('aria-')) {
            return;
          }

          // Check if it's a valid DOM property
          if (!VALID_DOM_PROPERTIES.has(propName)) {
            context.report({
              node: node.name,
              messageId: 'noUnknownProperty',
            });
          }
        }
      },
    };
  },
});

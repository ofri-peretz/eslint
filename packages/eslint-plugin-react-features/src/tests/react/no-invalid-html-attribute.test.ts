import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInvalidHtmlAttribute } from '../../rules/react/no-invalid-html-attribute';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('no-invalid-html-attribute', noInvalidHtmlAttribute, {
  valid: [
    // Valid - correct React attribute names
    {
      name: 'className instead of class',
      code: `<div className="container" />`,
    },
    {
      name: 'htmlFor instead of for',
      code: `<label htmlFor="input-id">Label</label>`,
    },
    {
      name: 'tabIndex instead of tabindex',
      code: `<div tabIndex={0} />`,
    },
    {
      name: 'readOnly instead of readonly',
      code: `<input readOnly />`,
    },
    {
      name: 'maxLength instead of maxlength',
      code: `<input maxLength={100} />`,
    },
    {
      name: 'colSpan instead of colspan',
      code: `<td colSpan={2} />`,
    },
    {
      name: 'rowSpan instead of rowspan',
      code: `<td rowSpan={2} />`,
    },
    {
      name: 'httpEquiv instead of http-equiv',
      code: `<meta httpEquiv="content-type" />`,
    },
    {
      name: 'acceptCharset instead of accept-charset',
      code: `<form acceptCharset="UTF-8" />`,
    },
    {
      name: 'accessKey instead of accesskey',
      code: `<button accessKey="s" />`,
    },
    {
      name: 'contentEditable instead of contenteditable',
      code: `<div contentEditable />`,
    },
    {
      name: 'crossOrigin instead of crossorigin',
      code: `<script crossOrigin="anonymous" />`,
    },
    {
      name: 'dateTime instead of datetime',
      code: `<time dateTime="2021-01-01" />`,
    },
    {
      name: 'encType instead of enctype',
      code: `<form encType="multipart/form-data" />`,
    },
    {
      name: 'formAction instead of formaction',
      code: `<button formAction="/submit" />`,
    },
    {
      name: 'formNoValidate instead of formnovalidate',
      code: `<button formNoValidate />`,
    },
    {
      name: 'hrefLang instead of hreflang',
      code: `<a hrefLang="en" />`,
    },
    {
      name: 'inputMode instead of inputmode',
      code: `<input inputMode="numeric" />`,
    },
    {
      name: 'minLength instead of minlength',
      code: `<input minLength={5} />`,
    },
    {
      name: 'noValidate instead of novalidate',
      code: `<form noValidate />`,
    },
    {
      name: 'spellCheck instead of spellcheck',
      code: `<textarea spellCheck />`,
    },
    {
      name: 'srcDoc instead of srcdoc',
      code: `<iframe srcDoc="<p>Hello</p>" />`,
    },
    {
      name: 'srcLang instead of srclang',
      code: `<track srcLang="en" />`,
    },
    {
      name: 'srcSet instead of srcset',
      code: `<img srcSet="image.jpg 1x, image@2x.jpg 2x" />`,
    },
    {
      name: 'useMap instead of usemap',
      code: `<img useMap="#map" />`,
    },
    // Valid - data attributes
    {
      name: 'data attribute',
      code: `<div data-testid="test" />`,
    },
    {
      name: 'data attribute with hyphen',
      code: `<div data-my-value="test" />`,
    },
    // Valid - aria attributes
    {
      name: 'aria attribute',
      code: `<div aria-label="Label" />`,
    },
    {
      name: 'aria-hidden',
      code: `<div aria-hidden="true" />`,
    },
    // Valid - custom attributes
    {
      name: 'custom attribute',
      code: `<div myCustomAttr="value" />`,
    },
    // Valid - JSXNamespacedName
    {
      name: 'namespaced attribute',
      code: `<div xml:lang="en" />`,
    },
  ],
  invalid: [
    // Invalid - HTML attributes instead of React attributes
    {
      name: 'class instead of className',
      code: `<div class="container" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'for instead of htmlFor',
      code: `<label for="input-id">Label</label>`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'tabindex instead of tabIndex',
      code: `<div tabindex="0" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'readonly instead of readOnly',
      code: `<input readonly />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'maxlength instead of maxLength',
      code: `<input maxlength="100" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'colspan instead of colSpan',
      code: `<td colspan="2" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'rowspan instead of rowSpan',
      code: `<td rowspan="2" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'http-equiv instead of httpEquiv',
      code: `<meta http-equiv="content-type" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'accept-charset instead of acceptCharset',
      code: `<form accept-charset="UTF-8" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'accesskey instead of accessKey',
      code: `<button accesskey="s" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'contenteditable instead of contentEditable',
      code: `<div contenteditable />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'crossorigin instead of crossOrigin',
      code: `<script crossorigin="anonymous" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'datetime instead of dateTime',
      code: `<time datetime="2021-01-01" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'enctype instead of encType',
      code: `<form enctype="multipart/form-data" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'formaction instead of formAction',
      code: `<button formaction="/submit" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'formnovalidate instead of formNoValidate',
      code: `<button formnovalidate />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'hreflang instead of hrefLang',
      code: `<a hreflang="en" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'inputmode instead of inputMode',
      code: `<input inputmode="numeric" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'minlength instead of minLength',
      code: `<input minlength="5" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'novalidate instead of noValidate',
      code: `<form novalidate />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'spellcheck instead of spellCheck',
      code: `<textarea spellcheck />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'srcdoc instead of srcDoc',
      code: `<iframe srcdoc="<p>Hello</p>" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'srclang instead of srcLang',
      code: `<track srclang="en" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'srcset instead of srcSet',
      code: `<img srcset="image.jpg 1x, image@2x.jpg 2x" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    {
      name: 'usemap instead of useMap',
      code: `<img usemap="#map" />`,
      errors: [{ messageId: 'noInvalidHtmlAttribute' }],
    },
    // Invalid - multiple invalid attributes
    {
      name: 'multiple invalid attributes',
      code: `<div class="container" tabindex="0" />`,
      errors: [
        { messageId: 'noInvalidHtmlAttribute' },
        { messageId: 'noInvalidHtmlAttribute' },
      ],
    },
  ],
});


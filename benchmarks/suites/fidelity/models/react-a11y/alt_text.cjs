const { tag } = require('../../lib.cjs');
const { FILE, program, attr } = require('../../jsx.cjs');

const CASE = {
  ImgAltText: (sp) =>
    `<img src="cat.png" ${attr('alt', 'A cat asleep', sp)} />`,
  ImgAltEmpty: (sp) => `<img src="divider.png" ${attr('alt', '', sp)} />`,
  ImgAltDyn: () => '<img src="cat.png" alt={value} />',
  ImgAltUndef: () => '<img src="cat.png" alt={undefined} />',
  ImgNoAlt: () => '<img src="cat.png" />',
  ImgPresentation: () => '<img src="divider.png" role="presentation" />',
  ImgAriaLabel: () => '<img src="cat.png" aria-label="A cat" />',
  ImgAriaLabelledby: () =>
    '<img src="cat.png" aria-labelledby="cat-caption" />',
  AreaAriaLabel: () =>
    '<map name="m"><area href="/a" shape="rect" coords="0,0,1,1" aria-label="Home" /></map>',
  AreaAriaLabelledby: () =>
    '<map name="m"><area href="/a" shape="rect" coords="0,0,1,1" aria-labelledby="home" /></map>',
  InputAriaLabel: () =>
    '<input type="image" src="go.png" aria-label="Search" />',
  InputAriaLabelledby: () =>
    '<input type="image" src="go.png" aria-labelledby="search" />',
  ObjTitle: () => '<object data="chart.svg" title="Sales chart" />',
  ObjAriaLabel: () => '<object data="chart.svg" aria-label="Sales chart" />',
  ObjAriaLabelledby: () =>
    '<object data="chart.svg" aria-labelledby="chart-title" />',
  ObjText: () => '<object data="chart.svg">Sales chart</object>',
  ObjBare: () => '<object data="chart.svg" />',
  AreaAlt: () =>
    '<map name="m"><area href="/a" shape="rect" coords="0,0,1,1" alt="Home" /></map>',
  AreaNoAlt: () =>
    '<map name="m"><area href="/a" shape="rect" coords="0,0,1,1" /></map>',
  InputImageAlt: () => '<input type="image" src="go.png" alt="Search" />',
  InputImageNoAlt: () => '<input type="image" src="go.png" />',
  InputTextNoAlt: () => '<input type="text" name="q" />',
  InputDynType: () => '<input type={value} name="q" />',
  ImageCompNoAlt: () => '<Image src="cat.png" />',
  ImageCompAlt: () => '<Image src="cat.png" alt="A cat" />',
  MemberImageNoAlt: () => '<Ui.Image src="cat.png" />',
  EmbedCompBare: () => '<Embed data="chart.svg" />',
};
const OPT = {
  Default: undefined,
  AllowLabel: { allowAriaLabel: true },
  AllowLabelledby: { allowAriaLabelledby: true },
  Named: { img: ['Image'], object: ['Embed'] },
};

module.exports = {
  rule: 'alt-text',
  // Spellings 2 x 4; Labels 6 x 3; Elements 17; Comps 4 x 2.
  domain: 8 + 18 + 17 + 8,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['focus', 'kase', 'opt', 'spelling']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) =>
    program(`<>${CASE[tag(s.kase)](tag(s.spelling))}</>`, {
      pre: ["import { Embed, Image, Ui } from './ui';"],
    }),
};

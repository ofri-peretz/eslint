const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const ALT = {
  PhotoOf: 'Photo of a cat asleep',
  ImageOf: 'An image of a sunset',
  PictureColon: 'Picture: the team',
  UpperImage: 'IMAGE of the office',
  Plain: 'A cat asleep',
  Photograph: 'Photograph of the bridge',
  Imagery: 'Satellite imagery of the coast',
  Logo: 'Logo of Acme',
  Empty: '',
};
const ELEM = {
  Img: ['img'],
  ImgHidden: ['img', 'aria-hidden="true"'],
  Image: ['Image'],
  MemberImage: ['Ui.Image'],
};
const OPT = {
  Default: undefined,
  Words: { words: ['logo'] },
  Components: { components: ['Image'] },
};

module.exports = {
  rule: 'img-redundant-alt',
  // Alts 10 x 3 opts; Spellings 2 x 4; Elems 2 alts x 4 elems x 3 opts.
  domain: 30 + 8 + 24,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['focus', 'alt', 'spelling', 'elem', 'opt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const [name, extra] = ELEM[tag(s.elem)];
    const a = tag(s.alt);
    const altAttr =
      a === 'Dyn' ? 'alt={value}' : attr('alt', ALT[a], tag(s.spelling));
    return program(el(name, ['src="cat.png"', altAttr, extra]), {
      pre: ["import { Image, Ui } from './ui';"],
    });
  },
};

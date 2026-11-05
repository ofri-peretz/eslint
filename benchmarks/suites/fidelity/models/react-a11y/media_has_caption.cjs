const { tag } = require('../../lib.cjs');
const { FILE, program, attr } = require('../../jsx.cjs');

const track = (k) => `<track ${k ? `${k} ` : ''}src="talk.vtt" />`;
const CASE = {
  VideoNone: () => '<video src="talk.mp4" />',
  VideoEmpty: () => '<video src="talk.mp4"></video>',
  VideoCaptions: (sp) =>
    `<video src="talk.mp4">${track(attr('kind', 'captions', sp))}</video>`,
  VideoCaptionsUpper: () =>
    `<video src="talk.mp4">${track('kind="Captions"')}</video>`,
  VideoSubtitles: (sp) =>
    `<video src="talk.mp4">${track(attr('kind', 'subtitles', sp))}</video>`,
  VideoTrackNoKind: () => `<video src="talk.mp4">${track('')}</video>`,
  VideoKindDyn: () => `<video src="talk.mp4">${track('kind={value}')}</video>`,
  VideoMuted: () => '<video src="loop.mp4" muted />',
  VideoMutedTrue: () => '<video src="loop.mp4" muted={true} />',
  VideoMutedFalse: () => '<video src="talk.mp4" muted={false} />',
  VideoMutedDyn: () => '<video src="talk.mp4" muted={flag} />',
  AudioNone: () => '<audio src="talk.mp3" />',
  AudioCaptions: () =>
    `<audio src="talk.mp3">${track('kind="captions"')}</audio>`,
  AudioMuted: () => '<audio src="talk.mp3" muted />',
  VideoCompNone: () => '<Video src="talk.mp4" />',
  MemberVideoNone: () => '<Ui.Video src="talk.mp4" />',
  VideoTrackComp: () =>
    '<video src="talk.mp4"><Track kind="captions" src="talk.vtt" /></video>',
};

module.exports = {
  rule: 'media-has-caption',
  // Cases 14 x 2 opts; Spellings 2 x 4; Comps 2 x 2.
  domain: 28 + 8 + 4,
  traces: 900,
  filename: FILE,
  key: (s) =>
    ['focus', 'kase', 'opt', 'spelling']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'Named' ? { video: ['Video'], track: ['Track'] } : undefined,
  code: (s) =>
    program(CASE[tag(s.kase)](tag(s.spelling)), {
      pre: ["import { Track, Ui, Video } from './ui';"],
    }),
};

// Model of eslint-plugin-react-a11y/media-has-caption (WCAG 1.2.1, 1.2.2).
// `<audio>` and `<video>` carry speech a deaf user needs as text: the element
// needs a `<track kind="captions">` child (`kind` is an enumerated attribute,
// so ASCII case does not matter). A track with another kind (`subtitles`, or
// no kind: it defaults to subtitles) is not captions. A muted element has no
// audio to caption: `muted` / `muted={true}` exempt it, `muted={false}` does
// not, a muted or kind value the file cannot see is not a finding. The
// `audio` / `video` / `track` options name components checked as those
// elements; an unnamed component or a member expression is silent.
// Left out: candidate for change (fires on a guess): `<video>{tracks}</video>`
// (a child expression may render the track), `<video {...rest}>` (the spread
// may carry `muted`), and `<video><Track kind="captions" /></video>` with no
// `track` option (the component may render a track).
module media_has_caption {
  type Case = VideoNone | VideoEmpty | VideoCaptions | VideoCaptionsUpper | VideoSubtitles
            | VideoTrackNoKind | VideoKindDyn | VideoMuted | VideoMutedTrue | VideoMutedFalse
            | VideoMutedDyn | AudioNone | AudioCaptions | AudioMuted
            | VideoCompNone | MemberVideoNone | VideoTrackComp
  type Opt = Default | Named
  type Spelling = Lit | Braced | Template | Cond
  type Focus = Cases | Spellings | Comps

  pure def missing(c: Case): bool =
    Set(VideoNone, VideoEmpty, VideoSubtitles, VideoTrackNoKind, VideoMutedFalse, AudioNone)
      .contains(c)
  pure def reports(c: Case, o: Opt): bool =
    missing(c) or (c == VideoCompNone and o == Named)

  var focus: Focus
  var kase: Case
  var opt: Opt
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet fo = Set(Cases, Spellings, Comps).oneOf()
    nondet c = (if (fo == Cases)
                  Set(VideoNone, VideoEmpty, VideoCaptions, VideoCaptionsUpper, VideoSubtitles,
                      VideoTrackNoKind, VideoKindDyn, VideoMuted, VideoMutedTrue, VideoMutedFalse,
                      VideoMutedDyn, AudioNone, AudioCaptions, AudioMuted)
                else if (fo == Spellings) Set(VideoCaptions, VideoSubtitles)
                else Set(VideoCompNone, MemberVideoNone)).oneOf()
    nondet o = (if (fo == Comps) Set(Default, Named)
                else if (fo == Cases) Set(Default, Named)
                else Set(Default)).oneOf()
    nondet sp = (if (fo == Spellings) Set(Lit, Braced, Template, Cond) else Set(Lit)).oneOf()
    all { focus' = fo, kase' = c, opt' = o, spelling' = sp, verdict' = reports(c, o) }
  }

  action init = step
}

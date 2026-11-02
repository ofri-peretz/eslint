const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 60, // 5 sinks x 12 argument shapes
  traces: 900,
  rule: 'no-unvalidated-deeplinks',
  key: (s) => `${tag(s.sink)}|${tag(s.arg)}`,
  config: () => undefined,
  code: (s) => {
    const sink = tag(s.sink);
    const imp =
      sink === 'LinkingRenamed'
        ? "import { Linking as RNLinking } from 'react-native';"
        : "import { Linking } from 'react-native';";
    const call = (x) =>
      ({
        LinkingOpenURL: `Linking.openURL(${x})`,
        LinkingComputed: `Linking['openURL'](${x})`,
        LinkingRenamed: `RNLinking.openURL(${x})`,
        NavigationNavigate: `navigation.navigate(${x})`,
        OtherOpenURL: `browser.openURL(${x})`,
      })[sink];
    const L = sink === 'LinkingRenamed' ? 'RNLinking' : 'Linking';
    const body = {
      Variable: `${call('url')};`,
      EventMember: `${call('event.url')};`,
      ListenerUrl: `${L}.addEventListener('url', (ev: { url: string }) => {\n    ${call('ev.url')};\n  });`,
      ListenerDestructured: `${L}.addEventListener('url', (ev: { url: string }) => {\n    const { url: link } = ev;\n    ${call('link')};\n  });`,
      Literal: `${call("'https://example.com/help'")};`,
      TplStatic: `${call('`https://example.com/help`')};`,
      TplDynamic: `${call('`myapp://item/${url}`')};`,
      InitialUrl: `${L}.getInitialURL().then((initial: string) => {\n    ${call('initial')};\n  });`,
      RouteParam: `${call('route.params.next')};`,
      ListenerAllowlisted: `${L}.addEventListener('url', ({ url: link }: { url: string }) => {\n    if (ALLOWED_URLS.includes(link)) {\n      ${call('link')};\n    }\n  });`,
      ListenerTruthy: `${L}.addEventListener('url', (ev: { url: string }) => {\n    if (ev.url) {\n      ${call('ev.url')};\n    }\n  });`,
      GuardTruthy: `if (url) {\n    ${call('url')};\n  }`,
    }[tag(s.arg)];
    return [
      imp,
      'declare const navigation: any;',
      'declare const browser: any;',
      "const ALLOWED_URLS = ['myapp://home', 'myapp://settings'];",
      `export function handleLink(url: string, event: { url: string }, route: { params: { next: string } }) {\n  ${body}\n}`,
      '',
    ].join('\n');
  },
  model: (s) => s.verdict,
};

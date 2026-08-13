# Adoption target network: repos running `eslint-plugin-security`

**Built:** 2026-08-11 · **Source:** GitHub code search `"eslint-plugin-security" filename:package.json`
**Universe:** 11,696 repos match. 357 sampled (search API caps at ~1k results, 5 pages pulled).
**Qualified:** 131 — active since 2026-02, not archived, JS/TS/Vue.

> **Nothing here has been contacted.** No issues, PRs, or comments have been opened.
> Read `BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md` §6 before writing a single PR: at 36.9%
> parity we cannot ask anyone to *replace* eslint-plugin-security. The ask is **"add
> alongside"** until the prototype-pollution and bidi gaps close.

## The pitch, and its guardrails

What earns a merge (per the megalinter #8712 shape that worked):

1. **Their problem first.** Open with a finding in *their* code, verified by hand, with file:line.
2. **What we left out and why.** Name the rules we did not enable and the ones that would be noisy.
3. **Vendor disclosure up front.** "I maintain these plugins" in the first paragraph, not the footer.
4. **No AI markers.** Ofri's name, Ofri's voice.
5. **Never claim replacement.** We are additive. Saying otherwise is falsifiable in one command.

Hard rules:

- **Verify every finding by hand before it appears in a PR.** Our scan produced plausible-looking
  hits that were false on inspection — e.g. a timing-attack flag on `result.aud === GOOGLE_CLIENT_JWT_AUD`,
  which compares a public audience claim, not a secret. One bad finding costs the campaign more
  than ten merges earn.
- **Exclude `lirantal/*`.** Liran Tal maintains eslint-plugin-security. `lirantal/anti-trojan-source`
  and `lirantal/express-security-txt` are in the qualified set — pitching a competitor's maintainer
  on replacing his own plugin reads as hostile. If we ever engage there it is as a contributor, not a vendor.
- **Skip `detect-object-injection` comparisons in PRs to repos that already disabled it.** Check
  their config first; telling someone their rule is noisy when they already know is condescending.
- One PR at a time per org. No templated blasts.

## Tier 1 — lighthouse repos (credibility per merge)

Security-literate maintainers whose adoption is citable. Slowest to merge, worth the most.
Approach only with a hand-verified finding.

| Repo | ★ | Why it matters | Opening angle |
|---|---|---|---|
| [LavaMoat/LavaMoat](https://github.com/LavaMoat/LavaMoat) | 1213 | MetaMask's supply-chain hardening tooling. Security is their product. | 488 of their findings are eslint-plugin-security's; 245 are ours and mostly disjoint. Lead with `no-arbitrary-file-access` in `packages/laverna/src/index.js:235`. |
| [OWASP/cwe-tool](https://github.com/OWASP/cwe-tool) · [OWASP/cwe-sdk-javascript](https://github.com/OWASP/cwe-sdk-javascript) | 64 / 32 | OWASP badge. Our rules carry CWE metadata; theirs carry none. | We tag all 110 rules with CWE IDs — natural fit for a CWE SDK. Note: our scan found 0 issues here, so this is a *metadata* pitch, not a vulnerability pitch. |
| [cloudflare/blindrsa-ts](https://github.com/cloudflare/blindrsa-ts) | 34 | Cloudflare. Crypto code — our weak-hash/timing rules are on-topic. | Timing-safe comparison coverage their plugin's 8-word matcher cannot see. |
| [microsoft/vscode-powerquery](https://github.com/microsoft/vscode-powerquery) | 108 | Microsoft org, active. | TS-native rules; their plugin is JS-era. |
| [aws/amazon-q-vscode](https://github.com/aws/amazon-q-vscode) | 44 | AWS org. | `eslint-plugin-lambda-security` cross-sell beyond the three benchmarked. |
| [postmanlabs/openapi-to-postman](https://github.com/postmanlabs/openapi-to-postman) | 1059 | Postman. Highest raw finding count in the scan. | **Caution: we are noisier here (1,961 vs 1,419).** Only pitch a narrow rule subset. |

## Tier 2 — high-yield (scanned, real findings)

Already scanned; findings listed are **candidates requiring hand-verification**.

| Repo | ★ | Scan result | Candidate finding |
|---|---|---|---|
| [ahaenggli/AzureAD-LDAP-wrapper](https://github.com/ahaenggli/AzureAD-LDAP-wrapper) | 176 | them 5,440 / us 442 | Strongest noise story in the set: their config emits 5,440 findings on 65 files, 84% from `detect-object-injection`. SSRF candidate at `src/graph.checkVars.js:36`. LDAP domain = `no-ldap-injection` fit. |
| [shardeum/json-rpc-server](https://github.com/shardeum/json-rpc-server) | 50 | them 21 / us 176 | Weak hash at `src/eth-handlers/*.ts:46`; SSRF candidates ×4. JSON-RPC server = high SSRF relevance. |
| [ApparyllisOrg/SimplyPluralApi](https://github.com/ApparyllisOrg/SimplyPluralApi) | 60 | them 145 / us 46 | Auth-heavy TS API. **The `auth.jwt.ts:66` timing hit is a verified FP — do not use it.** |
| [lifion/lifion-kinesis](https://github.com/lifion/lifion-kinesis) | 86 | them 121 / us 20 | ADP-affiliated. Weak-hash candidate in test code only — likely not PR-worthy. |
| [add2cal/add-to-calendar-button](https://github.com/add2cal/add-to-calendar-button) | 1480 | them 13 / us 42 | Highest stars in set. Browser-side library → `browser-security` is squarely on-topic. |

## Tier 3 — volume (108 repos under 20★)

Where the campaign actually scales. Lower stakes, faster merges, and each merge is a real
dependent. Full list below. Suggested order: TypeScript + server-side first (our rules
have the most to say), then browser libraries.

## Full qualified list (131)

Rows struck through and marked ⛔ are **excluded outreach targets** under the `lirantal/*`
hard rule above. They stay listed because the qualified set is a measurement — deleting
them would misstate the 131 — but they are not selectable as targets.

| Repo | ★ | Last push | Language | License |
|---|---|---|---|---|
| [add2cal/add-to-calendar-button](https://github.com/add2cal/add-to-calendar-button) | 1480 | 2026-08-07 | JavaScript | NOASSERTION |
| [LavaMoat/LavaMoat](https://github.com/LavaMoat/LavaMoat) | 1213 | 2026-08-11 | JavaScript | MIT |
| [postmanlabs/openapi-to-postman](https://github.com/postmanlabs/openapi-to-postman) | 1059 | 2026-08-11 | JavaScript | Apache-2.0 |
| [thesongzhu/Friday](https://github.com/thesongzhu/Friday) | 865 | 2026-07-20 | TypeScript | MIT |
| [manuelbieh/react-ssr-setup](https://github.com/manuelbieh/react-ssr-setup) | 780 | 2026-02-13 | TypeScript | MIT |
| [unxsist/jet-pilot](https://github.com/unxsist/jet-pilot) | 625 | 2026-03-09 | Vue | MIT |
| [ahaenggli/AzureAD-LDAP-wrapper](https://github.com/ahaenggli/AzureAD-LDAP-wrapper) | 176 | 2026-07-11 | JavaScript | MIT |
| [microsoft/vscode-powerquery](https://github.com/microsoft/vscode-powerquery) | 108 | 2026-08-05 | TypeScript | MIT |
| ⛔ ~~[lirantal/anti-trojan-source](https://github.com/lirantal/anti-trojan-source)~~ **DO NOT CONTACT** | 86 | 2026-07-23 | JavaScript | Apache-2.0 |
| [lifion/lifion-kinesis](https://github.com/lifion/lifion-kinesis) | 86 | 2026-08-11 | JavaScript | MIT |
| [lyestarzalt/x-dispatch](https://github.com/lyestarzalt/x-dispatch) | 76 | 2026-08-10 | TypeScript | GPL-3.0 |
| [OWASP/cwe-tool](https://github.com/OWASP/cwe-tool) | 64 | 2026-04-30 | JavaScript | Apache-2.0 |
| [ApparyllisOrg/SimplyPluralApi](https://github.com/ApparyllisOrg/SimplyPluralApi) | 60 | 2026-03-25 | TypeScript | — |
| [aws/amazon-q-vscode](https://github.com/aws/amazon-q-vscode) | 44 | 2026-08-11 | TypeScript | Apache-2.0 |
| [rgrove/synchrotron](https://github.com/rgrove/synchrotron) | 43 | 2026-08-11 | JavaScript | ISC |
| [ota-meshi/eslint-online-playground](https://github.com/ota-meshi/eslint-online-playground) | 39 | 2026-08-08 | TypeScript | MIT |
| [cdklabs/cdk-enterprise-iac](https://github.com/cdklabs/cdk-enterprise-iac) | 38 | 2026-08-10 | TypeScript | Apache-2.0 |
| [cloudflare/blindrsa-ts](https://github.com/cloudflare/blindrsa-ts) | 34 | 2026-08-11 | JavaScript | NOASSERTION |
| [OWASP/cwe-sdk-javascript](https://github.com/OWASP/cwe-sdk-javascript) | 32 | 2026-04-30 | JavaScript | Apache-2.0 |
| [microsoft/applicationinsights-react-native](https://github.com/microsoft/applicationinsights-react-native) | 28 | 2026-08-11 | JavaScript | MIT |
| [universalweb/Network](https://github.com/universalweb/Network) | 23 | 2026-07-22 | JavaScript | NOASSERTION |
| [n11techhub/mcp-bitbucket](https://github.com/n11techhub/mcp-bitbucket) | 23 | 2026-07-23 | TypeScript | Apache-2.0 |
| [ably/ably-chat-js](https://github.com/ably/ably-chat-js) | 22 | 2026-06-05 | TypeScript | Apache-2.0 |
| [pustovitDmytro/logger-decorator](https://github.com/pustovitDmytro/logger-decorator) | 19 | 2026-08-10 | JavaScript | MIT |
| ⛔ ~~[lirantal/express-security-txt](https://github.com/lirantal/express-security-txt)~~ **DO NOT CONTACT** | 18 | 2026-07-23 | JavaScript | MIT |
| [hzi-braunschweig/pia-system](https://github.com/hzi-braunschweig/pia-system) | 16 | 2026-07-10 | TypeScript | NOASSERTION |
| [SynBioHub/synbiohub3](https://github.com/SynBioHub/synbiohub3) | 16 | 2026-08-11 | JavaScript | BSD-2-Clause |
| [eclass/semantic-release-docker](https://github.com/eclass/semantic-release-docker) | 15 | 2026-08-05 | JavaScript | MIT |
| [nevware21/ts-utils](https://github.com/nevware21/ts-utils) | 12 | 2026-08-10 | TypeScript | MIT |
| [pqctoday-org/pqctoday-hub](https://github.com/pqctoday-org/pqctoday-hub) | 9 | 2026-08-11 | TypeScript | GPL-3.0 |
| [staneswilson/revanced-photos](https://github.com/staneswilson/revanced-photos) | 8 | 2026-08-09 | TypeScript | GPL-3.0 |
| [AGiXT/typescript-sdk](https://github.com/AGiXT/typescript-sdk) | 8 | 2026-07-21 | TypeScript | — |
| [mediamonks/eslint-config](https://github.com/mediamonks/eslint-config) | 6 | 2026-02-08 | JavaScript | MIT |
| [droidconKE/droidconKE2022Web](https://github.com/droidconKE/droidconKE2022Web) | 6 | 2026-08-05 | TypeScript | — |
| [IGNF/cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) | 6 | 2026-08-11 | Vue | AGPL-3.0 |
| [morgangraphics/simple-superhero-service](https://github.com/morgangraphics/simple-superhero-service) | 5 | 2026-06-23 | JavaScript | MIT |
| [liventcord/LiventCord](https://github.com/liventcord/LiventCord) | 5 | 2026-08-03 | TypeScript | GPL-3.0 |
| [emartech/escher-request](https://github.com/emartech/escher-request) | 5 | 2026-08-03 | TypeScript | MIT |
| [School-of-Company/Gwangsan-Crossplatform](https://github.com/School-of-Company/Gwangsan-Crossplatform) | 5 | 2026-08-10 | TypeScript | — |
| [claranet/clara-coin-slack-command](https://github.com/claranet/clara-coin-slack-command) | 4 | 2026-07-16 | JavaScript | — |
| [BurakGur/personal-website](https://github.com/BurakGur/personal-website) | 4 | 2026-02-16 | JavaScript | — |
| [mrkingsleyobi/veritas-ai](https://github.com/mrkingsleyobi/veritas-ai) | 3 | 2026-02-14 | JavaScript | — |
| [leaonline/leaonline-content](https://github.com/leaonline/leaonline-content) | 3 | 2026-07-26 | JavaScript | AGPL-3.0 |
| [leaonline/leaonline-otulea](https://github.com/leaonline/leaonline-otulea) | 2 | 2026-07-26 | JavaScript | AGPL-3.0 |
| [habib33-3/pinterest-clone](https://github.com/habib33-3/pinterest-clone) | 2 | 2026-07-08 | TypeScript | MIT |
| [cds-snc/github-repository-metadata-exporter](https://github.com/cds-snc/github-repository-metadata-exporter) | 2 | 2026-08-11 | JavaScript | MIT |
| [ahzhezhe/onemapsg](https://github.com/ahzhezhe/onemapsg) | 2 | 2026-08-11 | TypeScript | ISC |
| [NITISH-R-G/Amypo](https://github.com/NITISH-R-G/Amypo) | 2 | 2026-08-11 | JavaScript | — |
| [K-android/Rhino.GH-Sync-Web-Console](https://github.com/K-android/Rhino.GH-Sync-Web-Console) | 2 | 2026-06-15 | TypeScript | — |
| [turnhoss-code/DriveLogicAI_CHAT](https://github.com/turnhoss-code/DriveLogicAI_CHAT) | 1 | 2026-08-07 | TypeScript | — |
| [rwese/pi-question](https://github.com/rwese/pi-question) | 1 | 2026-06-27 | TypeScript | MIT |
| [rhaymo/opencensus-node-default-metrics](https://github.com/rhaymo/opencensus-node-default-metrics) | 1 | 2026-02-04 | JavaScript | MIT |
| [njxt/roberts-cookbook](https://github.com/njxt/roberts-cookbook) | 1 | 2026-06-19 | TypeScript | — |
| [matthewgream/mqtt-archiver](https://github.com/matthewgream/mqtt-archiver) | 1 | 2026-04-03 | JavaScript | NOASSERTION |
| [kodnerds/team-collaboration](https://github.com/kodnerds/team-collaboration) | 1 | 2026-02-23 | TypeScript | — |
| [ashviputhran-mur/karunadu-kote-guide](https://github.com/ashviputhran-mur/karunadu-kote-guide) | 1 | 2026-05-19 | TypeScript | — |
| [Uno-Takashi/OGP-Dev-Tool](https://github.com/Uno-Takashi/OGP-Dev-Tool) | 1 | 2026-08-10 | TypeScript | MIT |
| [JDumonceaux/site8](https://github.com/JDumonceaux/site8) | 1 | 2026-07-01 | TypeScript | — |
| [2030karim2-dev/alzhraERP](https://github.com/2030karim2-dev/alzhraERP) | 1 | 2026-08-11 | TypeScript | — |
| [yagiz-aydin/ms-graph-nest-js](https://github.com/yagiz-aydin/ms-graph-nest-js) | 0 | 2026-02-26 | TypeScript | — |
| [xHuGODx/softwate-baseline-ses25_110](https://github.com/xHuGODx/softwate-baseline-ses25_110) | 0 | 2026-03-30 | TypeScript | — |
| [vanyauhalin/eslint-config](https://github.com/vanyauhalin/eslint-config) | 0 | 2026-02-03 | TypeScript | MIT |
| [ukorvl/yarn-plugin-pnp-doctor](https://github.com/ukorvl/yarn-plugin-pnp-doctor) | 0 | 2026-07-01 | TypeScript | MIT |
| [ucod3/dictionary-web-app-react-ts](https://github.com/ucod3/dictionary-web-app-react-ts) | 0 | 2026-07-19 | TypeScript | MIT |
| [talhak911/DevSquad-26](https://github.com/talhak911/DevSquad-26) | 0 | 2026-06-04 | TypeScript | — |
| [taiatiniyara/prism](https://github.com/taiatiniyara/prism) | 0 | 2026-08-11 | TypeScript | — |
| [strafeken/ssd-practical](https://github.com/strafeken/ssd-practical) | 0 | 2026-07-23 | JavaScript | — |
| [strafeken/ORCA](https://github.com/strafeken/ORCA) | 0 | 2026-08-08 | JavaScript | — |
| [softwareO-eng/Al-Fakhiriya1](https://github.com/softwareO-eng/Al-Fakhiriya1) | 0 | 2026-06-16 | TypeScript | — |
| [skh8erboi113-ai/Probivio](https://github.com/skh8erboi113-ai/Probivio) | 0 | 2026-08-06 | TypeScript | — |
| [skbarishahid99-commits/DSU-Explorer](https://github.com/skbarishahid99-commits/DSU-Explorer) | 0 | 2026-05-03 | TypeScript | — |
| [rodrigoabreu22/softwate-baseline-ses25_110](https://github.com/rodrigoabreu22/softwate-baseline-ses25_110) | 0 | 2026-03-30 | TypeScript | — |
| [resurrectionofmoses-dev/augment](https://github.com/resurrectionofmoses-dev/augment) | 0 | 2026-07-31 | TypeScript | — |
| [pustovitDmytro/eslint-plugin-censor](https://github.com/pustovitDmytro/eslint-plugin-censor) | 0 | 2026-08-10 | JavaScript | MIT |
| [pustovitDmytro/eloi](https://github.com/pustovitDmytro/eloi) | 0 | 2026-08-01 | JavaScript | MIT |
| [provii/provii-agegate](https://github.com/provii/provii-agegate) | 0 | 2026-08-03 | TypeScript | MIT |
| [osama1404/secure](https://github.com/osama1404/secure) | 0 | 2026-06-01 | JavaScript | — |
| [ometman/v-assistant](https://github.com/ometman/v-assistant) | 0 | 2026-07-26 | TypeScript | — |
| [oleksandr-zhynzher/code-sherpa](https://github.com/oleksandr-zhynzher/code-sherpa) | 0 | 2026-05-20 | TypeScript | — |
| [nullvoidundefined/policy-pilot](https://github.com/nullvoidundefined/policy-pilot) | 0 | 2026-06-23 | TypeScript | — |
| [neetozone/neeto-cist](https://github.com/neetozone/neeto-cist) | 0 | 2026-07-29 | JavaScript | — |
| [nawatt-works/nestjs-starter](https://github.com/nawatt-works/nestjs-starter) | 0 | 2026-04-17 | TypeScript | — |
| [mystraldev/finance-tracker](https://github.com/mystraldev/finance-tracker) | 0 | 2026-07-01 | TypeScript | — |
| [mundocanceles/mundocalculador.io](https://github.com/mundocanceles/mundocalculador.io) | 0 | 2026-08-02 | TypeScript | — |
| [midusab/final11](https://github.com/midusab/final11) | 0 | 2026-05-07 | TypeScript | — |
| [metalice/cnv-console-monitor](https://github.com/metalice/cnv-console-monitor) | 0 | 2026-08-03 | TypeScript | — |
| [maximedrn/smart-contract-bitcoin-cash](https://github.com/maximedrn/smart-contract-bitcoin-cash) | 0 | 2026-07-01 | TypeScript | MIT |
| [marciosete/agent-arena](https://github.com/marciosete/agent-arena) | 0 | 2026-08-05 | TypeScript | MIT |
| [lovegold120221-dot/xero](https://github.com/lovegold120221-dot/xero) | 0 | 2026-06-10 | TypeScript | — |
| [leephil1907-lab/axitradescomplete](https://github.com/leephil1907-lab/axitradescomplete) | 0 | 2026-08-11 | TypeScript | — |
| [lapallyra/byjuliaaleixo-catalogo](https://github.com/lapallyra/byjuliaaleixo-catalogo) | 0 | 2026-07-31 | TypeScript | — |
| [kikik27/selasar-galery](https://github.com/kikik27/selasar-galery) | 0 | 2026-05-05 | TypeScript | — |
| [kfolkes/app-mod-iaa](https://github.com/kfolkes/app-mod-iaa) | 0 | 2026-03-11 | JavaScript | — |
| [karthik-1806/EcoSphere](https://github.com/karthik-1806/EcoSphere) | 0 | 2026-06-13 | TypeScript | MIT |
| [junaedislamjim1012/Aeirmist-Web](https://github.com/junaedislamjim1012/Aeirmist-Web) | 0 | 2026-08-02 | TypeScript | — |
| [jflessenkemper/ASAP](https://github.com/jflessenkemper/ASAP) | 0 | 2026-05-08 | TypeScript | — |
| [huaduox3-hue/Engai](https://github.com/huaduox3-hue/Engai) | 0 | 2026-04-20 | TypeScript | — |
| [herculeanfit1/BTAISite](https://github.com/herculeanfit1/BTAISite) | 0 | 2026-08-11 | TypeScript | MIT |
| [h-arnold/AssessmentBot-LLM-Service](https://github.com/h-arnold/AssessmentBot-LLM-Service) | 0 | 2026-07-31 | TypeScript | — |
| [giabaotran-2001/Real-estate-web](https://github.com/giabaotran-2001/Real-estate-web) | 0 | 2026-06-20 | JavaScript | — |
| [geminisaventuras/sos-venezuela](https://github.com/geminisaventuras/sos-venezuela) | 0 | 2026-07-04 | JavaScript | — |
| [droplinked/store-sample](https://github.com/droplinked/store-sample) | 0 | 2026-08-03 | TypeScript | — |
| [cod-x-prince/pg-app](https://github.com/cod-x-prince/pg-app) | 0 | 2026-04-06 | TypeScript | — |
| [cizyypie/inventory-system](https://github.com/cizyypie/inventory-system) | 0 | 2026-04-24 | JavaScript | — |
| [chiragsharma9867-web/chat247-app](https://github.com/chiragsharma9867-web/chat247-app) | 0 | 2026-05-11 | TypeScript | — |
| [chinmaystudio/neuroclass](https://github.com/chinmaystudio/neuroclass) | 0 | 2026-07-29 | TypeScript | — |
| [chetto1983/wpt-iot](https://github.com/chetto1983/wpt-iot) | 0 | 2026-07-02 | TypeScript | — |
| [chenders/debriefer](https://github.com/chenders/debriefer) | 0 | 2026-03-21 | TypeScript | MIT |
| [ceponatia/arcAgentic](https://github.com/ceponatia/arcAgentic) | 0 | 2026-04-03 | TypeScript | — |
| [bymaxone/nest-realtime](https://github.com/bymaxone/nest-realtime) | 0 | 2026-08-11 | TypeScript | MIT |
| [be-wise-be-kind/durable-code-test](https://github.com/be-wise-be-kind/durable-code-test) | 0 | 2026-04-21 | TypeScript | — |
| [bassfredes/Portfolio](https://github.com/bassfredes/Portfolio) | 0 | 2026-02-28 | TypeScript | — |
| [ameergulkhan1/restaurant-website](https://github.com/ameergulkhan1/restaurant-website) | 0 | 2026-05-10 | JavaScript | — |
| [absolutejs/examples](https://github.com/absolutejs/examples) | 0 | 2026-08-02 | TypeScript | — |
| [Xtrike-G/Complete-Version-A-Decision-Making-System-FYP](https://github.com/Xtrike-G/Complete-Version-A-Decision-Making-System-FYP) | 0 | 2026-06-12 | TypeScript | — |
| [WebJamApps/AppersonAuto](https://github.com/WebJamApps/AppersonAuto) | 0 | 2026-08-10 | TypeScript | MIT |
| [SnappyGifts/tracking-service](https://github.com/SnappyGifts/tracking-service) | 0 | 2026-08-06 | TypeScript | — |
| [SnappyGifts/product-variations-service](https://github.com/SnappyGifts/product-variations-service) | 0 | 2026-06-09 | TypeScript | — |
| [Rahat-Fatura/ubl2json](https://github.com/Rahat-Fatura/ubl2json) | 0 | 2026-07-10 | JavaScript | — |
| [Potents1/VibeCoding](https://github.com/Potents1/VibeCoding) | 0 | 2026-08-02 | JavaScript | — |
| [OnLayne/Ldlddl](https://github.com/OnLayne/Ldlddl) | 0 | 2026-05-10 | TypeScript | — |
| [Oddert/PCF-Uptime-Dashboard-Web](https://github.com/Oddert/PCF-Uptime-Dashboard-Web) | 0 | 2026-05-04 | TypeScript | — |
| [NOAHRENDLER/noahrendler.com](https://github.com/NOAHRENDLER/noahrendler.com) | 0 | 2026-05-05 | JavaScript | — |
| [Ludociel-26/API-Back-End-Maintenance-QuickFind](https://github.com/Ludociel-26/API-Back-End-Maintenance-QuickFind) | 0 | 2026-05-27 | JavaScript | — |
| [Landosrgs/LittleWhiteBox](https://github.com/Landosrgs/LittleWhiteBox) | 0 | 2026-03-11 | JavaScript | — |
| [Johnobhoy88/innovate-hub-api](https://github.com/Johnobhoy88/innovate-hub-api) | 0 | 2026-04-06 | JavaScript | MIT |
| [Dav0o/UNAChat---Discord](https://github.com/Dav0o/UNAChat---Discord) | 0 | 2026-02-15 | JavaScript | — |
| [BrunoMullerAraujo/Trilh-o-Beneficente](https://github.com/BrunoMullerAraujo/Trilh-o-Beneficente) | 0 | 2026-07-14 | TypeScript | — |
| [AFixt/a11y-calc](https://github.com/AFixt/a11y-calc) | 0 | 2026-08-11 | TypeScript | MIT |
| [404bidden/main-website](https://github.com/404bidden/main-website) | 0 | 2026-02-15 | TypeScript | MIT |
| [192d-Wing/stig-viewer-web](https://github.com/192d-Wing/stig-viewer-web) | 0 | 2026-08-11 | JavaScript | — |

## Reproduce

```bash
gh api -X GET search/code -f q='"eslint-plugin-security" filename:package.json' \
  -f per_page=100 -f page=1 --jq '.items[].repository.full_name'
```

Scan a target with both plugin sets: `benchmarks/suites/ilb-competitor-parity/`.

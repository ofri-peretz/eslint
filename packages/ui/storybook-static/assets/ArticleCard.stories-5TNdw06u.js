import{j as e}from"./iframe-CaMHNqgm.js";import{c as h}from"./cn-DCADjnpI.js";import{C as M,a as D,b as P,c as U,d as O,e as F}from"./card-B_jhdHlQ.js";import{B as C}from"./badge-B_6FbVk6.js";import{c as v}from"./createLucideIcon-C6bjaNBF.js";import"./preload-helper-PPVm8Dsz.js";import"./index-Qea67HoU.js";import"./useRender-CuZRRLR5.js";import"./useRenderElement-DZBmXc0a.js";const L=v("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);const H=v("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);const V=v("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);const _=v("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);const z=v("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);const W=v("Sparkles",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);function G(t){return t>=1e3?`${(t/1e3).toFixed(1)}k`:String(t)}function I(t){return t===void 0?"":new Date(t).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}function o({title:t,description:n,href:s,imageUrl:r,tags:l,author:c,publishedAt:d,meta:m,sourceLabel:p,external:u=!0,variant:A="stack",className:R}){const B=l?.slice(0,3)??[],N=l&&l.length>3?l.length-3:0,j=A==="overlay";return e.jsx("a",{href:s,target:u?"_blank":void 0,rel:u?"noopener noreferrer":void 0,"data-slot":"article-card","data-variant":A,className:h("group focus-visible:ring-ring block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",R),children:e.jsx(M,{className:h("flex h-full flex-col overflow-hidden gap-0 py-0 transition-all duration-300","hover:border-primary/50 hover:shadow-primary/5 hover:shadow-xl","group-focus-visible:border-primary/50",j?"relative h-[420px] md:h-[380px]":"pb-4"),children:j?e.jsx(K,{title:t,description:n,imageUrl:r,visibleTags:B,overflowTags:N,author:c,publishedAt:d,meta:m,sourceLabel:p}):e.jsx(Z,{title:t,description:n,imageUrl:r,visibleTags:B,overflowTags:N,author:c,publishedAt:d,meta:m,sourceLabel:p})})})}function E({label:t}){return e.jsx("div",{"data-testid":"article-card-source",className:"absolute top-3 right-3 z-10 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm",children:t})}function $(){return e.jsxs("div",{"data-testid":"article-card-featured-chip",className:"absolute top-3 left-3 z-10 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm",children:[e.jsx(W,{className:"h-3 w-3","aria-hidden":!0}),"Featured"]})}function q({imageUrl:t,title:n,className:s,fallbackTextClassName:r}){return t?e.jsx("img",{src:t,alt:"",width:1e3,height:420,loading:"lazy",decoding:"async",className:h("h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105",s)}):e.jsx("div",{className:"flex h-full w-full items-center justify-center bg-linear-to-br from-violet-900 via-slate-800 to-fuchsia-900 p-6",children:e.jsx("span",{className:h("line-clamp-3 text-center leading-snug font-semibold text-white/80",r??"text-base"),children:n})})}function S({meta:t,tone:n}){const s="flex items-center gap-1.5 text-xs tabular-nums",r=n==="overlay"?"text-white/90":"text-muted-foreground";return e.jsxs(e.Fragment,{children:[t.reactions!==void 0?e.jsxs("span",{"data-testid":"article-card-meta-reactions",className:h(s,r,"transition-colors group-hover:text-red-400"),title:"Reactions",children:[e.jsx(_,{className:"h-3.5 w-3.5","aria-hidden":!0}),t.reactions]}):null,t.comments!==void 0?e.jsxs("span",{"data-testid":"article-card-meta-comments",className:h(s,r,"transition-colors group-hover:text-blue-400"),title:"Comments",children:[e.jsx(z,{className:"h-3.5 w-3.5","aria-hidden":!0}),t.comments]}):null,t.readingTimeMinutes!==void 0?e.jsxs("span",{"data-testid":"article-card-meta-reading-time",className:h(s,r,"transition-colors group-hover:text-amber-400"),title:"Reading time",children:[e.jsx(L,{className:"h-3.5 w-3.5","aria-hidden":!0}),t.readingTimeMinutes," min"]}):null,t.views!==void 0?e.jsxs("span",{"data-testid":"article-card-meta-views",className:h(s,"font-medium",n==="overlay"?"text-amber-300":"text-primary"),title:"Views",children:[e.jsx(V,{className:"h-3.5 w-3.5","aria-hidden":!0}),G(t.views)]}):null]})}function Z({title:t,description:n,imageUrl:s,visibleTags:r,overflowTags:l,author:c,publishedAt:d,meta:m,sourceLabel:p}){return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"relative h-44 w-full shrink-0 overflow-hidden",children:[e.jsx(q,{imageUrl:s,title:t}),p?e.jsx(E,{label:p}):null]}),(c||d)&&e.jsx(D,{className:"pt-4 pb-3",children:e.jsxs("div",{className:"flex w-full items-center justify-between gap-2 min-w-0",children:[c?e.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[c.imageUrl?e.jsx("img",{src:c.imageUrl,alt:c.name,width:24,height:24,loading:"lazy",decoding:"async",className:"border-fd-border h-6 w-6 shrink-0 rounded-full border"}):null,e.jsx("span",{className:"text-foreground truncate text-sm font-medium",children:c.name})]}):e.jsx("span",{}),d?e.jsx("span",{className:"text-muted-foreground text-xs whitespace-nowrap shrink-0",children:I(d)}):null]})}),e.jsxs(P,{className:"flex grow flex-col gap-2 pt-0",children:[e.jsx(U,{"data-testid":"article-card-title",className:"group-hover:text-primary line-clamp-2 text-base font-semibold leading-snug transition-colors",children:t}),n?e.jsx(O,{"data-testid":"article-card-description",className:"line-clamp-2 text-sm leading-relaxed",children:n}):null,r.length>0?e.jsxs("div",{"data-testid":"article-card-tags",className:"mt-auto flex flex-wrap gap-1.5 pt-2",children:[r.map(u=>e.jsxs(C,{variant:"secondary",className:"px-2 py-0.5 text-[10px] font-medium tracking-normal whitespace-nowrap",children:["#",u]},u)),l>0?e.jsxs(C,{variant:"outline",className:"px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",children:["+",l]}):null]}):null]}),m?e.jsxs(F,{className:"text-muted-foreground mt-2 gap-4 border-t border-fd-border pt-3",children:[e.jsx(S,{meta:m,tone:"muted"}),e.jsx("span",{className:"ml-auto opacity-0 transition-opacity group-hover:opacity-100",children:e.jsx(H,{className:"text-primary h-4 w-4","aria-hidden":!0})})]}):null]})}function K({title:t,description:n,imageUrl:s,visibleTags:r,overflowTags:l,author:c,publishedAt:d,meta:m,sourceLabel:p}){return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"absolute inset-0 overflow-hidden",children:e.jsx(q,{imageUrl:s,title:t,fallbackTextClassName:"text-2xl"})}),e.jsx("div",{"aria-hidden":!0,className:"absolute inset-0 bg-linear-to-t from-black/85 via-black/55 to-black/15"}),e.jsx($,{}),p?e.jsx(E,{label:p}):null,e.jsxs("div",{className:"absolute inset-x-0 bottom-0 z-10 p-6 md:p-8",children:[r.length>0?e.jsxs("div",{"data-testid":"article-card-tags",className:"mb-4 flex flex-wrap gap-1.5",children:[r.map(u=>e.jsxs(C,{variant:"secondary",className:"bg-white/15 text-white border border-white/30 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium tracking-normal whitespace-nowrap hover:bg-white/25",children:["#",u]},u)),l>0?e.jsxs(C,{variant:"outline",className:"bg-white/10 text-white border-white/30 backdrop-blur-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",children:["+",l]}):null]}):null,e.jsx("h3",{"data-testid":"article-card-title",className:"line-clamp-2 text-2xl md:text-3xl font-bold leading-tight text-white mb-2 drop-shadow",children:t}),n?e.jsx("p",{"data-testid":"article-card-description",className:"line-clamp-2 text-sm md:text-base text-white/90 mb-4 max-w-3xl drop-shadow",children:n}):null,e.jsxs("div",{className:"flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-sm",children:[c?e.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[c.imageUrl?e.jsx("img",{src:c.imageUrl,alt:c.name,width:32,height:32,loading:"lazy",decoding:"async",className:"h-8 w-8 shrink-0 rounded-full border-2 border-white/60"}):null,e.jsx("span",{className:"truncate font-medium text-white",children:c.name})]}):null,d?e.jsxs(e.Fragment,{children:[e.jsx("span",{"aria-hidden":!0,className:"hidden sm:inline text-white/40",children:"•"}),e.jsx("span",{className:"hidden sm:inline whitespace-nowrap text-white/80",children:I(d)})]}):null,m?e.jsxs(e.Fragment,{children:[e.jsx("span",{"aria-hidden":!0,className:"hidden sm:inline text-white/40",children:"•"}),e.jsx("div",{className:"hidden sm:flex items-center gap-3 md:gap-4",children:e.jsx(S,{meta:m,tone:"overlay"})})]}):null]})]}),e.jsx("span",{className:"absolute top-3 right-14 z-10 opacity-0 transition-opacity group-hover:opacity-100",children:e.jsx(H,{className:"h-5 w-5 text-white drop-shadow","aria-hidden":!0})})]})}try{o.displayName="ArticleCard",o.__docgenInfo={description:`Generic article-card block: cover image + author + tags + title + description
+ meta chips (reactions / comments / reading time). Useful for "from the
blog" tiles, external content lists, devto/medium aggregations, etc.

Two layouts, same data shape, same hover, same focus ring, same chip
styling: \`variant='stack'\` (default, image-on-top grid card) and
\`variant='overlay'\` (full-image hero with text on a dark scrim). Both
are covered by Storybook stories with interaction + axe assertions.`,displayName:"ArticleCard",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/blocks/article-card.tsx",methods:[],props:{title:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Card title (article headline).",name:"title",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!0,tags:{},type:{name:"string"}},description:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Optional short description / excerpt.",name:"description",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"string"}},href:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Destination URL. The whole card becomes a link to it.",name:"href",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!0,tags:{},type:{name:"string"}},imageUrl:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Cover image URL. If omitted, a gradient with the title is shown.",name:"imageUrl",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"string"}},tags:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:'Tags / topics — first 3 rendered as filled badges, the rest as a "+N" overflow chip.',name:"tags",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"string[]"}},author:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Author block.",name:"author",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"ArticleCardAuthor"}},publishedAt:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Publication date (any value `Date` constructor accepts). Rendered short-form: `Mar 5, 2026`.",name:"publishedAt",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"string | number | Date"}},meta:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Reactions / comments / reading-time chips on the footer.",name:"meta",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"ArticleCardMeta"}},sourceLabel:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:'Small uppercase label shown over the cover (e.g., source attribution like "Dev.to").',name:"sourceLabel",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"string"}},external:{defaultValue:{value:"true"},declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Open in a new tab. Default: `true`.",name:"external",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"boolean"}},variant:{defaultValue:{value:"stack"},declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Visual layout. See `ArticleCardVariant`. Default: `'stack'`.",name:"variant",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"enum",raw:"ArticleCardVariant",value:[{value:'"stack"'},{value:'"overlay"'}]}},className:{defaultValue:null,declarations:[{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"}],description:"Class on the outer anchor wrapper.",name:"className",parent:{fileName:"ui/src/blocks/article-card.tsx",name:"ArticleCardProps"},required:!1,tags:{},type:{name:"string"}}},tags:{}}}catch{}const{expect:a,within:g}=__STORYBOOK_MODULE_TEST__,ne={title:"Blocks/ArticleCard",component:o,tags:["autodocs"],parameters:{layout:"padded",docs:{description:{component:`\`ArticleCard\` is the single source of truth for article tiles across the
site (article grids, "featured article" heroes, external content lists,
Dev.to / Medium aggregations).

Two layouts, **one component**:
 - \`variant='stack'\` (default) — image on top, content below. Used in grids.
 - \`variant='overlay'\` — image fills the whole card; content sits on a dark
   scrim. Shows a FEATURED chip. Used for hero / featured-article slots.

These stories lock the visual + interactive contract in place so we never
regress the cards again. Every story is scanned by axe-core
(WCAG 2 A/AA/AAA + 2.1 + 2.2 + best-practice + ACT) on every CI run via
Storybook test-runner — see \`packages/ui/.storybook/test-runner.ts\`.`}}},argTypes:{variant:{control:"inline-radio",options:["stack","overlay"],description:"Visual layout. `stack` = image-on-top grid card. `overlay` = full-image hero with content on a scrim.",table:{defaultValue:{summary:"stack"}}}}},i={title:"How we shipped strict accessibility in our docs site",description:"A walkthrough of axe-core, color contrast, reduced motion, and the layered self-test model.",href:"https://example.com/post",imageUrl:"https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80&auto=format&fit=crop",tags:["accessibility","tailwind","fumadocs"],author:{name:"Ofri Peretz",imageUrl:"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&q=80&auto=format&fit=crop"},publishedAt:"2026-05-10",meta:{reactions:42,comments:8,readingTimeMinutes:7,views:1240},sourceLabel:"Dev.to"},x={args:{...i,variant:"stack"},render:t=>e.jsx("div",{style:{width:360},children:e.jsx(o,{...t})}),play:async({canvasElement:t,step:n})=>{const s=g(t);await n("Rendered as a single link wrapping the whole card",async()=>{const r=s.getByRole("link");a(r).toHaveAttribute("href",i.href),a(r).toHaveAttribute("target","_blank"),a(r).toHaveAttribute("rel","noopener noreferrer"),a(r).toHaveAttribute("data-slot","article-card"),a(r).toHaveAttribute("data-variant","stack")}),await n("Shows title, description, and tags",async()=>{a(s.getByTestId("article-card-title")).toHaveTextContent(i.title),a(s.getByTestId("article-card-description")).toHaveTextContent(i.description);const r=s.getByTestId("article-card-tags");for(const l of i.tags)a(r).toHaveTextContent(`#${l}`)}),await n("Renders all four meta chips with stable text",async()=>{a(s.getByTestId("article-card-meta-reactions")).toHaveTextContent("42"),a(s.getByTestId("article-card-meta-comments")).toHaveTextContent("8"),a(s.getByTestId("article-card-meta-reading-time")).toHaveTextContent("7 min"),a(s.getByTestId("article-card-meta-views")).toHaveTextContent("1.2k")}),await n("Shows the source label, no FEATURED chip in stack mode",async()=>{a(s.getByTestId("article-card-source")).toHaveTextContent("Dev.to"),a(s.queryByTestId("article-card-featured-chip")).toBeNull()}),await n("Link is keyboard-focusable",async()=>{const r=s.getByRole("link");r.focus(),a(r).toHaveFocus()})}},y={args:{...i,variant:"stack",imageUrl:void 0},render:t=>e.jsx("div",{style:{width:360},children:e.jsx(o,{...t})}),play:async({canvasElement:t})=>{const s=g(t).getAllByText(i.title);a(s.length).toBeGreaterThanOrEqual(2)}},f={args:{...i,variant:"stack",tags:["accessibility","tailwind","fumadocs","mdx","next","react"]},render:t=>e.jsx("div",{style:{width:360},children:e.jsx(o,{...t})}),play:async({canvasElement:t,step:n})=>{const s=g(t);await n("First 3 tags are shown verbatim",async()=>{const r=s.getByTestId("article-card-tags");a(r).toHaveTextContent("#accessibility"),a(r).toHaveTextContent("#tailwind"),a(r).toHaveTextContent("#fumadocs")}),await n("Remaining tags collapse into +N chip (6 total → +3)",async()=>{const r=s.getByTestId("article-card-tags");a(r).toHaveTextContent("+3"),a(r).not.toHaveTextContent("#mdx"),a(r).not.toHaveTextContent("#next"),a(r).not.toHaveTextContent("#react")})}},k={args:{title:"Minimal card: only title + href",href:"https://example.com",variant:"stack"},render:t=>e.jsx("div",{style:{width:360},children:e.jsx(o,{...t})}),play:async({canvasElement:t})=>{const n=g(t);a(n.getByRole("link")).toBeInTheDocument(),a(n.getByTestId("article-card-title")).toBeInTheDocument(),a(n.queryByTestId("article-card-meta-reactions")).toBeNull(),a(n.queryByTestId("article-card-meta-comments")).toBeNull(),a(n.queryByTestId("article-card-meta-reading-time")).toBeNull(),a(n.queryByTestId("article-card-meta-views")).toBeNull(),a(n.queryByTestId("article-card-featured-chip")).toBeNull()}},b={args:{...i,variant:"overlay"},render:t=>e.jsx("div",{style:{width:760},children:e.jsx(o,{...t})}),play:async({canvasElement:t,step:n})=>{const s=g(t);await n("Rendered as a single link with overlay variant marker",async()=>{const r=s.getByRole("link");a(r).toHaveAttribute("href",i.href),a(r).toHaveAttribute("data-variant","overlay")}),await n("FEATURED chip is shown (top-left)",async()=>{a(s.getByTestId("article-card-featured-chip")).toHaveTextContent(/featured/i)}),await n("Title, description, tags, source label, and meta are all present",async()=>{a(s.getByTestId("article-card-title")).toHaveTextContent(i.title),a(s.getByTestId("article-card-description")).toHaveTextContent(i.description),a(s.getByTestId("article-card-tags")).toHaveTextContent("#accessibility"),a(s.getByTestId("article-card-source")).toHaveTextContent("Dev.to"),a(s.getByTestId("article-card-meta-reactions")).toHaveTextContent("42"),a(s.getByTestId("article-card-meta-views")).toHaveTextContent("1.2k")}),await n("Link is keyboard-focusable",async()=>{const r=s.getByRole("link");r.focus(),a(r).toHaveFocus()})}},w={args:{...i,variant:"overlay",imageUrl:void 0},render:t=>e.jsx("div",{style:{width:760},children:e.jsx(o,{...t})}),play:async({canvasElement:t})=>{const n=g(t);a(n.getByTestId("article-card-featured-chip")).toBeInTheDocument();const s=n.getAllByText(i.title);a(s.length).toBeGreaterThanOrEqual(2)}},T={parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{className:"space-y-6 p-6 bg-fd-background",children:[e.jsx(o,{...i,variant:"overlay"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",children:[e.jsx(o,{...i,variant:"stack"}),e.jsx(o,{...i,variant:"stack",title:"Another grid card with a longer headline that wraps to two lines"}),e.jsx(o,{...i,variant:"stack",imageUrl:void 0,title:"Third tile uses the gradient title fallback"})]})]}),play:async({canvasElement:t,step:n})=>{const s=g(t);await n("Exactly one overlay card + three stack cards render",async()=>{const r=t.querySelectorAll('a[data-slot="article-card"]');a(r.length).toBe(4);const l=t.querySelectorAll('a[data-variant="overlay"]');a(l.length).toBe(1);const c=t.querySelectorAll('a[data-variant="stack"]');a(c.length).toBe(3)}),await n("Only the overlay card carries the FEATURED chip",async()=>{const r=s.queryAllByTestId("article-card-featured-chip");a(r.length).toBe(1)})}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    variant: 'stack'
  },
  render: args => <div style={{
    width: 360
  }}>
      <ArticleCard {...args} />
    </div>,
  /**
   * Interaction contract — these are the invariants that must never regress
   * for grid cards. If any of these fail, the card has drifted from spec.
   */
  play: async ({
    canvasElement,
    step
  }) => {
    const canvas = within(canvasElement);
    await step('Rendered as a single link wrapping the whole card', async () => {
      const link = canvas.getByRole('link');
      expect(link).toHaveAttribute('href', baseArgs.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('data-slot', 'article-card');
      expect(link).toHaveAttribute('data-variant', 'stack');
    });
    await step('Shows title, description, and tags', async () => {
      expect(canvas.getByTestId('article-card-title')).toHaveTextContent(baseArgs.title);
      expect(canvas.getByTestId('article-card-description')).toHaveTextContent(baseArgs.description);
      const tagBlock = canvas.getByTestId('article-card-tags');
      for (const tag of baseArgs.tags) {
        expect(tagBlock).toHaveTextContent(\`#\${tag}\`);
      }
    });
    await step('Renders all four meta chips with stable text', async () => {
      expect(canvas.getByTestId('article-card-meta-reactions')).toHaveTextContent('42');
      expect(canvas.getByTestId('article-card-meta-comments')).toHaveTextContent('8');
      expect(canvas.getByTestId('article-card-meta-reading-time')).toHaveTextContent('7 min');
      // 1240 views renders abbreviated.
      expect(canvas.getByTestId('article-card-meta-views')).toHaveTextContent('1.2k');
    });
    await step('Shows the source label, no FEATURED chip in stack mode', async () => {
      expect(canvas.getByTestId('article-card-source')).toHaveTextContent('Dev.to');
      expect(canvas.queryByTestId('article-card-featured-chip')).toBeNull();
    });
    await step('Link is keyboard-focusable', async () => {
      const link = canvas.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();
    });
  }
}`,...x.parameters?.docs?.source},description:{story:"Canonical grid card with image, author, tags, description, and meta footer.",...x.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    variant: 'stack',
    imageUrl: undefined
  },
  render: args => <div style={{
    width: 360
  }}>
      <ArticleCard {...args} />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // No <img>, but the title appears both in the cover fallback and in the body.
    const titleMatches = canvas.getAllByText(baseArgs.title);
    expect(titleMatches.length).toBeGreaterThanOrEqual(2);
  }
}`,...y.parameters?.docs?.source},description:{story:"No cover image — the gradient title fallback takes over.",...y.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    variant: 'stack',
    tags: ['accessibility', 'tailwind', 'fumadocs', 'mdx', 'next', 'react']
  },
  render: args => <div style={{
    width: 360
  }}>
      <ArticleCard {...args} />
    </div>,
  play: async ({
    canvasElement,
    step
  }) => {
    const canvas = within(canvasElement);
    await step('First 3 tags are shown verbatim', async () => {
      const tags = canvas.getByTestId('article-card-tags');
      expect(tags).toHaveTextContent('#accessibility');
      expect(tags).toHaveTextContent('#tailwind');
      expect(tags).toHaveTextContent('#fumadocs');
    });
    await step('Remaining tags collapse into +N chip (6 total → +3)', async () => {
      const tags = canvas.getByTestId('article-card-tags');
      expect(tags).toHaveTextContent('+3');
      // The 4th+ tags must NOT render as individual badges.
      expect(tags).not.toHaveTextContent('#mdx');
      expect(tags).not.toHaveTextContent('#next');
      expect(tags).not.toHaveTextContent('#react');
    });
  }
}`,...f.parameters?.docs?.source},description:{story:"Many tags — the card renders the first 3 as `#tag` badges and collapses\nthe rest into a `+N` overflow chip. Locks the overflow math.",...f.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Minimal card: only title + href',
    href: 'https://example.com',
    variant: 'stack'
  },
  render: args => <div style={{
    width: 360
  }}>
      <ArticleCard {...args} />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link')).toBeInTheDocument();
    expect(canvas.getByTestId('article-card-title')).toBeInTheDocument();
    // No meta → no meta chips.
    expect(canvas.queryByTestId('article-card-meta-reactions')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-comments')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-reading-time')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-views')).toBeNull();
    // No FEATURED chip on stack.
    expect(canvas.queryByTestId('article-card-featured-chip')).toBeNull();
  }
}`,...k.parameters?.docs?.source},description:{story:"Sparse data — only required fields. The card still renders cleanly.",...k.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    variant: 'overlay'
  },
  render: args => <div style={{
    width: 760
  }}>
      <ArticleCard {...args} />
    </div>,
  play: async ({
    canvasElement,
    step
  }) => {
    const canvas = within(canvasElement);
    await step('Rendered as a single link with overlay variant marker', async () => {
      const link = canvas.getByRole('link');
      expect(link).toHaveAttribute('href', baseArgs.href);
      expect(link).toHaveAttribute('data-variant', 'overlay');
    });
    await step('FEATURED chip is shown (top-left)', async () => {
      expect(canvas.getByTestId('article-card-featured-chip')).toHaveTextContent(/featured/i);
    });
    await step('Title, description, tags, source label, and meta are all present', async () => {
      expect(canvas.getByTestId('article-card-title')).toHaveTextContent(baseArgs.title);
      expect(canvas.getByTestId('article-card-description')).toHaveTextContent(baseArgs.description);
      expect(canvas.getByTestId('article-card-tags')).toHaveTextContent('#accessibility');
      expect(canvas.getByTestId('article-card-source')).toHaveTextContent('Dev.to');
      expect(canvas.getByTestId('article-card-meta-reactions')).toHaveTextContent('42');
      expect(canvas.getByTestId('article-card-meta-views')).toHaveTextContent('1.2k');
    });
    await step('Link is keyboard-focusable', async () => {
      const link = canvas.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();
    });
  }
}`,...b.parameters?.docs?.source},description:{story:"Canonical overlay card — full-image cover with content over a scrim.\nThis is what the `/articles` page renders for the featured slot.",...b.parameters?.docs?.description}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    variant: 'overlay',
    imageUrl: undefined
  },
  render: args => <div style={{
    width: 760
  }}>
      <ArticleCard {...args} />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('article-card-featured-chip')).toBeInTheDocument();
    // Title appears in both the gradient fallback and the body.
    const titleMatches = canvas.getAllByText(baseArgs.title);
    expect(titleMatches.length).toBeGreaterThanOrEqual(2);
  }
}`,...w.parameters?.docs?.source},description:{story:"Overlay variant without a cover image — gradient fallback shows the title.",...w.parameters?.docs?.description}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  parameters: {
    layout: 'fullscreen'
  },
  render: () => <div className="space-y-6 p-6 bg-fd-background">
      <ArticleCard {...baseArgs} variant="overlay" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ArticleCard {...baseArgs} variant="stack" />
        <ArticleCard {...baseArgs} variant="stack" title="Another grid card with a longer headline that wraps to two lines" />
        <ArticleCard {...baseArgs} variant="stack" imageUrl={undefined} title="Third tile uses the gradient title fallback" />
      </div>
    </div>,
  play: async ({
    canvasElement,
    step
  }) => {
    const canvas = within(canvasElement);
    await step('Exactly one overlay card + three stack cards render', async () => {
      // 4 cards total → 4 links with data-slot="article-card".
      const links = canvasElement.querySelectorAll('a[data-slot="article-card"]');
      expect(links.length).toBe(4);
      const overlayLinks = canvasElement.querySelectorAll('a[data-variant="overlay"]');
      expect(overlayLinks.length).toBe(1);
      const stackLinks = canvasElement.querySelectorAll('a[data-variant="stack"]');
      expect(stackLinks.length).toBe(3);
    });
    await step('Only the overlay card carries the FEATURED chip', async () => {
      const featuredChips = canvas.queryAllByTestId('article-card-featured-chip');
      expect(featuredChips.length).toBe(1);
    });
  }
}`,...T.parameters?.docs?.source},description:{story:`Both variants side by side — visual diff guard. If you change either
layout in a way that breaks parity-of-anatomy, this story will look wrong.
Useful as the canonical "are the cards consistent?" reference in Storybook.`,...T.parameters?.docs?.description}}};const ie=["Stack","StackWithoutCover","StackWithTagOverflow","StackMinimal","Overlay","OverlayWithoutCover","Parity"];export{b as Overlay,w as OverlayWithoutCover,T as Parity,x as Stack,k as StackMinimal,f as StackWithTagOverflow,y as StackWithoutCover,ie as __namedExportsOrder,ne as default};

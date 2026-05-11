import{R as O,j as r}from"./iframe-CaMHNqgm.js";import{c}from"./cn-DCADjnpI.js";import"./preload-helper-PPVm8Dsz.js";const s=O.forwardRef(({shimmerColor:e="#ffffff",shimmerSize:t="0.05em",shimmerDuration:n="3s",borderRadius:l="100px",background:i="rgba(0, 0, 0, 1)",shimmer:B=!0,highlight:C=!0,className:N,children:_,as:T="button",...P},H)=>r.jsxs(T,{"data-slot":"shimmer-button","data-shimmer":B?"":void 0,"data-highlight":C?"":void 0,style:{"--spread":"90deg","--shimmer-color":e,"--radius":l,"--speed":n,"--cut":t,"--bg":i},className:c("group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-6 py-3 whitespace-nowrap text-white [background:var(--bg)]","transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",N),ref:H,...P,children:[B&&r.jsx("div",{"data-shimmer-spark":!0,className:c("-z-30 blur-[2px]","[container-type:size] absolute inset-0 overflow-visible"),children:r.jsx("div",{className:"animate-shimmer-slide absolute inset-0 [aspect-ratio:1] h-[100cqh] [border-radius:0] [mask:none]",children:r.jsx("div",{className:"animate-spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]"})})}),_,C&&r.jsx("div",{"data-shimmer-highlight":!0,className:c("absolute inset-0 size-full","rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]","transform-gpu transition-all duration-300 ease-in-out","group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]","group-active:shadow-[inset_0_-10px_10px_#ffffff3f]")}),r.jsx("div",{className:c("absolute [inset:var(--cut)] -z-20 [border-radius:var(--radius)] [background:var(--bg)]")})]}));s.displayName="ShimmerButton";try{s.displayName="ShimmerButton",s.__docgenInfo={description:"",displayName:"ShimmerButton",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/magicui/shimmer-button.tsx",methods:[],props:{shimmerColor:{defaultValue:{value:"#ffffff"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"shimmerColor",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"string"}},shimmerSize:{defaultValue:{value:"0.05em"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"shimmerSize",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"string"}},borderRadius:{defaultValue:{value:"100px"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"borderRadius",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"string"}},shimmerDuration:{defaultValue:{value:"3s"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"shimmerDuration",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"string"}},background:{defaultValue:{value:"rgba(0, 0, 0, 1)"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"background",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"string"}},className:{defaultValue:null,declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"className",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"string"}},shimmer:{defaultValue:{value:"true"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"Render the rotating spark animation (the conic-gradient that sweeps\naround the button). Defaults to `true`. Pass `false` to keep the pill\ngeometry and fill but drop the motion.",name:"shimmer",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"boolean"}},highlight:{defaultValue:{value:"true"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"Render the inset white highlight at the bottom edge (a `box-shadow:\ninset 0 -8px 10px #ffffff1f` glow). Defaults to `true`. Pass `false`\nfor a darker, flatter look that pairs cleanly with non-white fills.\nIndependent of `shimmer` — the two effects can be toggled separately\n(e.g. shimmer on + highlight off = animated dark sibling).",name:"highlight",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"boolean"}},as:{defaultValue:{value:"button"},declarations:[{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"}],description:"",name:"as",parent:{fileName:"ui/src/magicui/shimmer-button.tsx",name:"ShimmerButtonProps"},required:!1,tags:{},type:{name:"ElementType<any, keyof IntrinsicElements>"}}},tags:{}}}catch{}const{expect:a,fn:S,userEvent:o,within:x}=__STORYBOOK_MODULE_TEST__,D={title:"MagicUI/ShimmerButton",component:s,tags:["autodocs"],parameters:{backgrounds:{default:"cosmic",values:[{name:"cosmic",value:"#0b0418"},{name:"light",value:"#ffffff"}]},docs:{description:{component:`ShimmerButton stories

The component ships TWO independent decorative props:
  - \`shimmer\`   → rotating conic-gradient spark animation
  - \`highlight\` → inset white glow at the bottom edge

Each story below either renders a visual permutation of those props OR
runs a \`play\` function that exercises the contract end-to-end (click,
keyboard, prop-driven DOM gating). The stories also serve as the visual
lock — Chromatic / Storybook test-runner snapshots will catch regressions
to layout, color, or animation that the unit tests cannot see.`}}},argTypes:{shimmer:{control:"boolean",description:"Render the rotating spark animation. Independent of `highlight`."},highlight:{control:"boolean",description:"Render the inset white bottom-edge glow. Independent of `shimmer`."},background:{control:"text",description:"CSS background string (color, gradient, etc.)."},shimmerColor:{control:"color"},shimmerSize:{control:"text"},borderRadius:{control:"text"},children:{control:!1}}},m={args:{children:"Get Started",shimmer:!0,highlight:!0}},h={name:"Static pill (shimmer={false} highlight={false})",args:{children:"GitHub",shimmer:!1,highlight:!1,background:"rgba(255, 255, 255, 0.12)"},parameters:{docs:{description:{story:"Hero secondary pattern: same pill geometry as the animated primary, no decoration. Pair with the Default story to verify sibling parity by eye."}}}},d={name:"Spark on, highlight off",args:{children:"Animated, no glow",shimmer:!0,highlight:!1,background:"linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)"}},u={name:"Spark off, highlight on",args:{children:"Glow, no spin",shimmer:!1,highlight:!0}},p={name:"Brand primary (violet gradient)",args:{children:"Get Started",shimmerColor:"#c084fc",shimmerSize:"0.15em",background:"linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)"}},g={name:"Gallery — all four shimmer/highlight combos",parameters:{controls:{hideNoControlsWarning:!0}},render:()=>r.jsxs("div",{className:"flex flex-wrap items-center gap-4",children:[r.jsx(s,{shimmer:!0,highlight:!0,children:"On / On"}),r.jsx(s,{shimmer:!0,highlight:!1,children:"On / Off"}),r.jsx(s,{shimmer:!1,highlight:!0,children:"Off / On"}),r.jsx(s,{shimmer:!1,highlight:!1,background:"rgba(255, 255, 255, 0.12)",children:"Off / Off"})]})},f={name:"Interaction — fires onClick",args:{children:"Click me",onClick:S()},play:async({canvasElement:e,args:t,step:n})=>{const i=x(e).getByRole("button",{name:/click me/i});await n("Button is in the document and enabled",async()=>{await a(i).toBeInTheDocument(),await a(i).toBeEnabled()}),await n("Click triggers the onClick handler",async()=>{await o.click(i),await a(t.onClick).toHaveBeenCalledTimes(1)}),await n("Subsequent click increments the call count",async()=>{await o.click(i),await a(t.onClick).toHaveBeenCalledTimes(2)})}},b={name:"Interaction — keyboard Enter / Space activate",args:{children:"Press me",onClick:S()},play:async({canvasElement:e,args:t,step:n})=>{const i=x(e).getByRole("button",{name:/press me/i});await n("Tab focuses the button",async()=>{await o.tab(),await a(i).toHaveFocus()}),await n("Enter activates the button",async()=>{await o.keyboard("{Enter}"),await a(t.onClick).toHaveBeenCalledTimes(1)}),await n("Space activates the button",async()=>{await o.keyboard(" "),await a(t.onClick).toHaveBeenCalledTimes(2)})}},y={name:"Interaction — `shimmer={false}` removes the spark from the DOM",args:{children:"No spark",shimmer:!1,highlight:!0},play:async({canvasElement:e,step:t})=>{await t("No `.animate-shimmer-slide` (spark) element is mounted",async()=>{await a(e.querySelector(".animate-shimmer-slide")).toBeNull()}),await t("No `.animate-spin-around` (inner conic-gradient) element is mounted",async()=>{await a(e.querySelector(".animate-spin-around")).toBeNull()}),await t("`highlight` is independent — the white inset shadow IS still in the DOM",async()=>{await a(e.innerHTML).toContain("shadow-[inset_0_-8px_10px_#ffffff1f]")})}},w={name:"Interaction — `highlight={false}` removes the white inset glow",args:{children:"No glow",shimmer:!0,highlight:!1},play:async({canvasElement:e,step:t})=>{await t("No inset white shadow class is in the rendered HTML",async()=>{await a(e.innerHTML).not.toContain("shadow-[inset_0_-8px_10px_#ffffff1f]")}),await t("`shimmer` is independent — the spark IS still in the DOM",async()=>{await a(e.querySelector(".animate-shimmer-slide")).not.toBeNull()})}},v={name:"Interaction — both off → clean ShimmerButton-shaped pill, no decoration",args:{children:"Geometry only",shimmer:!1,highlight:!1,background:"rgba(255, 255, 255, 0.12)"},play:async({canvasElement:e,step:t})=>{await t("Neither decorative effect is in the DOM",async()=>{await a(e.querySelector(".animate-shimmer-slide")).toBeNull(),await a(e.querySelector(".animate-spin-around")).toBeNull(),await a(e.innerHTML).not.toContain("shadow-[inset_0_-8px_10px_#ffffff1f]")}),await t("Pill geometry survives — px-6 py-3 + border-radius var",async()=>{await a(e.innerHTML).toContain("px-6"),await a(e.innerHTML).toContain("py-3"),await a(e.innerHTML).toContain("[border-radius:var(--radius)]")}),await t("--bg CSS variable carries the consumer background",async()=>{const n=e.querySelector('[style*="--bg"]');await a(n).not.toBeNull(),await a(n.style.getPropertyValue("--bg")).toBe("rgba(255, 255, 255, 0.12)")})}},k={name:"Interaction — `disabled` blocks click activation",args:{children:"Disabled",disabled:!0,onClick:S()},play:async({canvasElement:e,args:t,step:n})=>{const i=x(e).getByRole("button",{name:/disabled/i});await n("Button reports disabled state",async()=>{await a(i).toBeDisabled()}),await n("Click does NOT fire onClick",async()=>{await o.click(i),await a(t.onClick).not.toHaveBeenCalled()})}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Get Started',
    shimmer: true,
    highlight: true
  }
}`,...m.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: 'Static pill (shimmer={false} highlight={false})',
  args: {
    children: 'GitHub',
    shimmer: false,
    highlight: false,
    background: 'rgba(255, 255, 255, 0.12)'
  },
  parameters: {
    docs: {
      description: {
        story: 'Hero secondary pattern: same pill geometry as the animated primary, no decoration. Pair with the Default story to verify sibling parity by eye.'
      }
    }
  }
}`,...h.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: 'Spark on, highlight off',
  args: {
    children: 'Animated, no glow',
    shimmer: true,
    highlight: false,
    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
  }
}`,...d.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: 'Spark off, highlight on',
  args: {
    children: 'Glow, no spin',
    shimmer: false,
    highlight: true
  }
}`,...u.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: 'Brand primary (violet gradient)',
  args: {
    children: 'Get Started',
    shimmerColor: '#c084fc',
    shimmerSize: '0.15em',
    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
  }
}`,...p.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: 'Gallery — all four shimmer/highlight combos',
  parameters: {
    controls: {
      hideNoControlsWarning: true
    }
  },
  render: () => <div className="flex flex-wrap items-center gap-4">
      <ShimmerButton shimmer highlight>
        On / On
      </ShimmerButton>
      <ShimmerButton shimmer highlight={false}>
        On / Off
      </ShimmerButton>
      <ShimmerButton shimmer={false} highlight>
        Off / On
      </ShimmerButton>
      <ShimmerButton shimmer={false} highlight={false} background="rgba(255, 255, 255, 0.12)">
        Off / Off
      </ShimmerButton>
    </div>
}`,...g.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: 'Interaction — fires onClick',
  args: {
    children: 'Click me',
    onClick: fn()
  },
  play: async ({
    canvasElement,
    args,
    step
  }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', {
      name: /click me/i
    });
    await step('Button is in the document and enabled', async () => {
      await expect(button).toBeInTheDocument();
      await expect(button).toBeEnabled();
    });
    await step('Click triggers the onClick handler', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
    await step('Subsequent click increments the call count', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  }
}`,...f.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: 'Interaction — keyboard Enter / Space activate',
  args: {
    children: 'Press me',
    onClick: fn()
  },
  play: async ({
    canvasElement,
    args,
    step
  }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', {
      name: /press me/i
    });
    await step('Tab focuses the button', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
    });
    await step('Enter activates the button', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
    await step('Space activates the button', async () => {
      await userEvent.keyboard(' ');
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  }
}`,...b.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: 'Interaction — \`shimmer={false}\` removes the spark from the DOM',
  args: {
    children: 'No spark',
    shimmer: false,
    highlight: true
  },
  play: async ({
    canvasElement,
    step
  }) => {
    await step('No \`.animate-shimmer-slide\` (spark) element is mounted', async () => {
      await expect(canvasElement.querySelector('.animate-shimmer-slide')).toBeNull();
    });
    await step('No \`.animate-spin-around\` (inner conic-gradient) element is mounted', async () => {
      await expect(canvasElement.querySelector('.animate-spin-around')).toBeNull();
    });
    await step('\`highlight\` is independent — the white inset shadow IS still in the DOM', async () => {
      // The highlight class uses a Tailwind arbitrary value
      // (\`shadow-[inset_0_-8px_10px_#ffffff1f]\`); checking innerHTML keeps
      // the assertion independent of how Tailwind escapes it in selectors.
      await expect(canvasElement.innerHTML).toContain('shadow-[inset_0_-8px_10px_#ffffff1f]');
    });
  }
}`,...y.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: 'Interaction — \`highlight={false}\` removes the white inset glow',
  args: {
    children: 'No glow',
    shimmer: true,
    highlight: false
  },
  play: async ({
    canvasElement,
    step
  }) => {
    await step('No inset white shadow class is in the rendered HTML', async () => {
      await expect(canvasElement.innerHTML).not.toContain('shadow-[inset_0_-8px_10px_#ffffff1f]');
    });
    await step('\`shimmer\` is independent — the spark IS still in the DOM', async () => {
      await expect(canvasElement.querySelector('.animate-shimmer-slide')).not.toBeNull();
    });
  }
}`,...w.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: 'Interaction — both off → clean ShimmerButton-shaped pill, no decoration',
  args: {
    children: 'Geometry only',
    shimmer: false,
    highlight: false,
    background: 'rgba(255, 255, 255, 0.12)'
  },
  play: async ({
    canvasElement,
    step
  }) => {
    await step('Neither decorative effect is in the DOM', async () => {
      await expect(canvasElement.querySelector('.animate-shimmer-slide')).toBeNull();
      await expect(canvasElement.querySelector('.animate-spin-around')).toBeNull();
      await expect(canvasElement.innerHTML).not.toContain('shadow-[inset_0_-8px_10px_#ffffff1f]');
    });
    await step('Pill geometry survives — px-6 py-3 + border-radius var', async () => {
      // Sibling parity (CTA_PHILOSOPHY.md #3): even with effects off, the
      // button must render at the same geometry as its animated sibling.
      await expect(canvasElement.innerHTML).toContain('px-6');
      await expect(canvasElement.innerHTML).toContain('py-3');
      await expect(canvasElement.innerHTML).toContain('[border-radius:var(--radius)]');
    });
    await step('--bg CSS variable carries the consumer background', async () => {
      const root = canvasElement.querySelector('[style*="--bg"]') as HTMLElement | null;
      await expect(root).not.toBeNull();
      await expect(root!.style.getPropertyValue('--bg')).toBe('rgba(255, 255, 255, 0.12)');
    });
  }
}`,...v.parameters?.docs?.source}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  name: 'Interaction — \`disabled\` blocks click activation',
  args: {
    children: 'Disabled',
    disabled: true,
    onClick: fn()
  },
  play: async ({
    canvasElement,
    args,
    step
  }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', {
      name: /disabled/i
    });
    await step('Button reports disabled state', async () => {
      await expect(button).toBeDisabled();
    });
    await step('Click does NOT fire onClick', async () => {
      await userEvent.click(button);
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  }
}`,...k.parameters?.docs?.source}}};const q=["Default","StaticPill","SparkOnly","HighlightOnly","BrandPrimary","Gallery","ClickInteraction","KeyboardActivation","ShimmerPropGatesSpark","HighlightPropGatesGlow","StaticPillHasNoEffects","DisabledIsNotClickable"];export{p as BrandPrimary,f as ClickInteraction,m as Default,k as DisabledIsNotClickable,g as Gallery,u as HighlightOnly,w as HighlightPropGatesGlow,b as KeyboardActivation,y as ShimmerPropGatesSpark,d as SparkOnly,h as StaticPill,v as StaticPillHasNoEffects,q as __namedExportsOrder,D as default};

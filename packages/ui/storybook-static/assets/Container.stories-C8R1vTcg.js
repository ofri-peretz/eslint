import{j as r}from"./iframe-CaMHNqgm.js";import{C as s}from"./container-Ci8gB_bq.js";import"./preload-helper-PPVm8Dsz.js";import"./index-Qea67HoU.js";import"./cn-DCADjnpI.js";import"./useRender-CuZRRLR5.js";import"./useRenderElement-DZBmXc0a.js";const f={title:"Primitives/Container",component:s,tags:["autodocs"],parameters:{docs:{description:{component:"Width contract from LAYOUT_PHILOSOPHY.md §2. Four sizes only — mixing ad-hoc `max-w-3xl` / `max-w-5xl` is forbidden. Owns the responsive horizontal padding scale `px-4 sm:px-6 lg:px-8`."}}},argTypes:{size:{control:"select",options:["prose","content","wide","full"]}}},a=({label:e})=>r.jsxs("div",{className:"rounded-md border border-dashed border-fd-border bg-fd-card/40 p-6 text-sm text-fd-muted-foreground",children:[e," — children fit inside the configured max-width with responsive horizontal padding."]}),o={args:{size:"prose"},render:e=>r.jsx(s,{...e,children:r.jsx(a,{label:"size=prose (65ch)"})})},n={args:{size:"content"},render:e=>r.jsx(s,{...e,children:r.jsx(a,{label:"size=content (1024px) — default for landing sections"})})},i={args:{size:"wide"},render:e=>r.jsx(s,{...e,children:r.jsx(a,{label:"size=wide (1280px) — card-grid heavy sections"})})},t={args:{size:"full"},render:e=>r.jsx(s,{...e,children:r.jsx(a,{label:"size=full (no max-width) — full-bleed hero, decorative bands"})})},d={render:()=>r.jsx("div",{className:"flex flex-col gap-6",children:["prose","content","wide","full"].map(e=>r.jsx(s,{size:e,children:r.jsx(a,{label:`size=${e}`})},e))})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'prose'
  },
  render: args => <Container {...args}>
      <Sample label="size=prose (65ch)" />
    </Container>
}`,...o.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'content'
  },
  render: args => <Container {...args}>
      <Sample label="size=content (1024px) — default for landing sections" />
    </Container>
}`,...n.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'wide'
  },
  render: args => <Container {...args}>
      <Sample label="size=wide (1280px) — card-grid heavy sections" />
    </Container>
}`,...i.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'full'
  },
  render: args => <Container {...args}>
      <Sample label="size=full (no max-width) — full-bleed hero, decorative bands" />
    </Container>
}`,...t.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-6">
      {(['prose', 'content', 'wide', 'full'] as const).map(size => <Container key={size} size={size}>
          <Sample label={\`size=\${size}\`} />
        </Container>)}
    </div>
}`,...d.parameters?.docs?.source}}};const z=["Prose","Content","Wide","Full","AllSizes"];export{d as AllSizes,n as Content,t as Full,o as Prose,i as Wide,z as __namedExportsOrder,f as default};

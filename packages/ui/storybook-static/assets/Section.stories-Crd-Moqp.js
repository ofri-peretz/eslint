import{j as e}from"./iframe-CaMHNqgm.js";import{c as b}from"./index-Qea67HoU.js";import{c as x}from"./cn-DCADjnpI.js";import{C as h}from"./container-Ci8gB_bq.js";import"./preload-helper-PPVm8Dsz.js";import"./useRender-CuZRRLR5.js";import"./useRenderElement-DZBmXc0a.js";const S=b("relative",{variants:{spacing:{tight:"py-12 md:py-16 lg:py-20",comfortable:"py-16 md:py-20 lg:py-24",spacious:"py-20 md:py-24 lg:py-32",none:""},tone:{default:"",muted:"bg-fd-card/30",inset:"bg-fd-card/50 backdrop-blur-sm"},divider:{none:"",top:"border-t border-fd-border",bottom:"border-b border-fd-border",both:"border-y border-fd-border"}},defaultVariants:{spacing:"comfortable",tone:"default",divider:"none"}});function o({className:t,spacing:c,tone:l,divider:m,container:p="content",as:u="section",children:f,...g}){const v=u;return e.jsx(v,{"data-slot":"section","data-spacing":c??void 0,"data-tone":l??void 0,"data-divider":m??void 0,className:x(S({spacing:c,tone:l,divider:m}),t),...g,children:e.jsx(h,{size:p,children:f})})}try{o.displayName="Section",o.__docgenInfo={description:"",displayName:"Section",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/primitives/section.tsx",methods:[],props:{container:{defaultValue:{value:"content"},declarations:[{fileName:"ui/src/primitives/section.tsx",name:"SectionProps"}],description:"Container size that wraps the section's children. Defaults to `content`.",name:"container",parent:{fileName:"ui/src/primitives/section.tsx",name:"SectionProps"},required:!1,tags:{},type:{name:'"prose" | "content" | "wide" | "full" | null'}},as:{defaultValue:{value:"section"},declarations:[{fileName:"ui/src/primitives/section.tsx",name:"SectionProps"}],description:"Render as a different element (e.g. `header`, `footer`). Default `section`.",name:"as",parent:{fileName:"ui/src/primitives/section.tsx",name:"SectionProps"},required:!1,tags:{},type:{name:"enum",raw:'"div" | "aside" | "footer" | "header" | "section"',value:[{value:'"div"'},{value:'"aside"'},{value:'"footer"'},{value:'"header"'},{value:'"section"'}]}},spacing:{defaultValue:null,declarations:[],description:"",name:"spacing",required:!1,tags:{},type:{name:'"none" | "tight" | "comfortable" | "spacious" | null'}},tone:{defaultValue:null,declarations:[],description:"",name:"tone",required:!1,tags:{},type:{name:'"default" | "muted" | "inset" | null'}},divider:{defaultValue:null,declarations:[],description:"",name:"divider",required:!1,tags:{},type:{name:'"none" | "both" | "top" | "bottom" | null'}}},tags:{}}}catch{}const k={title:"Primitives/Section",component:o,tags:["autodocs"],parameters:{docs:{description:{component:"Vertical rhythm + tone + dividers + container — from LAYOUT_PHILOSOPHY.md §7-8. Pages compose `<Section>` × N; the page file describes what is *in* each section, never what each section wrapper looks like."}}},argTypes:{spacing:{control:"select",options:["tight","comfortable","spacious","none"]},tone:{control:"select",options:["default","muted","inset"]},divider:{control:"select",options:["none","top","bottom","both"]},container:{control:"select",options:["prose","content","wide","full"]}}},r=({label:t})=>e.jsx("div",{className:"rounded-md border border-dashed border-fd-border bg-fd-card/40 p-6 text-sm text-fd-muted-foreground",children:t}),i={args:{spacing:"comfortable",tone:"default",divider:"none",container:"content"},render:t=>e.jsx(o,{...t,children:e.jsx(r,{label:"Default — comfortable spacing, no tone, no divider, content container."})})},a={args:{spacing:"comfortable",tone:"muted",divider:"both",container:"wide"},render:t=>e.jsx(o,{...t,children:e.jsx(r,{label:"tone='muted' + divider='both' + container='wide' — the 'What it catches' geometry on the home."})})},n={args:{spacing:"tight",tone:"inset",divider:"both",container:"content"},render:t=>e.jsx(o,{...t,children:e.jsxs("div",{className:"grid grid-cols-4 gap-6 text-center",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-3xl font-bold",children:"18"}),e.jsx("div",{className:"text-xs uppercase text-fd-muted-foreground",children:"Plugins"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-3xl font-bold",children:"350+"}),e.jsx("div",{className:"text-xs uppercase text-fd-muted-foreground",children:"Rules"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-3xl font-bold",children:"11"}),e.jsx("div",{className:"text-xs uppercase text-fd-muted-foreground",children:"Security"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-3xl font-bold",children:"7"}),e.jsx("div",{className:"text-xs uppercase text-fd-muted-foreground",children:"Quality"})]})]})})},s={render:()=>e.jsx("div",{children:["tight","comfortable","spacious"].map(t=>e.jsx(o,{spacing:t,divider:"bottom",tone:t==="comfortable"?"muted":"default",children:e.jsx(r,{label:`spacing="${t}"`})},t))})},d={render:()=>e.jsxs("div",{children:[e.jsx(o,{spacing:"comfortable",tone:"default",divider:"bottom",children:e.jsx(r,{label:'tone="default" — no background'})}),e.jsx(o,{spacing:"comfortable",tone:"muted",divider:"bottom",children:e.jsx(r,{label:'tone="muted" — bg-fd-card/30'})}),e.jsx(o,{spacing:"comfortable",tone:"inset",divider:"bottom",children:e.jsx(r,{label:'tone="inset" — bg-fd-card/50 with backdrop-blur'})})]})};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    spacing: 'comfortable',
    tone: 'default',
    divider: 'none',
    container: 'content'
  },
  render: args => <Section {...args}>
      <SectionBody label="Default — comfortable spacing, no tone, no divider, content container." />
    </Section>
}`,...i.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    spacing: 'comfortable',
    tone: 'muted',
    divider: 'both',
    container: 'wide'
  },
  render: args => <Section {...args}>
      <SectionBody label="tone='muted' + divider='both' + container='wide' — the 'What it catches' geometry on the home." />
    </Section>
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    spacing: 'tight',
    tone: 'inset',
    divider: 'both',
    container: 'content'
  },
  render: args => <Section {...args}>
      <div className="grid grid-cols-4 gap-6 text-center">
        <div><div className="text-3xl font-bold">18</div><div className="text-xs uppercase text-fd-muted-foreground">Plugins</div></div>
        <div><div className="text-3xl font-bold">350+</div><div className="text-xs uppercase text-fd-muted-foreground">Rules</div></div>
        <div><div className="text-3xl font-bold">11</div><div className="text-xs uppercase text-fd-muted-foreground">Security</div></div>
        <div><div className="text-3xl font-bold">7</div><div className="text-xs uppercase text-fd-muted-foreground">Quality</div></div>
      </div>
    </Section>
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div>
      {(['tight', 'comfortable', 'spacious'] as const).map(spacing => <Section key={spacing} spacing={spacing} divider="bottom" tone={spacing === 'comfortable' ? 'muted' : 'default'}>
          <SectionBody label={\`spacing="\${spacing}"\`} />
        </Section>)}
    </div>
}`,...s.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div>
      <Section spacing="comfortable" tone="default" divider="bottom">
        <SectionBody label='tone="default" — no background' />
      </Section>
      <Section spacing="comfortable" tone="muted" divider="bottom">
        <SectionBody label='tone="muted" — bg-fd-card/30' />
      </Section>
      <Section spacing="comfortable" tone="inset" divider="bottom">
        <SectionBody label='tone="inset" — bg-fd-card/50 with backdrop-blur' />
      </Section>
    </div>
}`,...d.parameters?.docs?.source}}};const D=["Default","MutedWithDivider","InsetStrip","SpacingScale","ToneVariants"];export{i as Default,n as InsetStrip,a as MutedWithDivider,s as SpacingScale,d as ToneVariants,D as __namedExportsOrder,k as default};

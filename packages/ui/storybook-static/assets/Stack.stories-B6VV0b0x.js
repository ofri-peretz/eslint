import{j as e}from"./iframe-CaMHNqgm.js";import{c as x}from"./index-Qea67HoU.js";import{c as f}from"./cn-DCADjnpI.js";import{u as y}from"./useRender-CuZRRLR5.js";import"./preload-helper-PPVm8Dsz.js";import"./useRenderElement-DZBmXc0a.js";const h=x("flex",{variants:{direction:{vertical:"flex-col",horizontal:"flex-row flex-wrap"},gap:{xs:"gap-2",sm:"gap-4",md:"gap-6",lg:"gap-10",xl:"gap-16","2xl":"gap-24"},align:{start:"items-start",center:"items-center",end:"items-end",stretch:"items-stretch",baseline:"items-baseline"},justify:{start:"justify-start",center:"justify-center",end:"justify-end",between:"justify-between",around:"justify-around"}},defaultVariants:{direction:"vertical",gap:"md"}});function r({className:a,direction:s="vertical",gap:c,align:d,justify:m,render:u,...g}){return y({render:u??e.jsx("div",{}),props:{"data-slot":"stack","data-direction":s,className:f(h({direction:s,gap:c,align:d,justify:m}),a),...g}})}function p({className:a,gap:s="sm",align:c="center",...d}){return e.jsx(r,{direction:"horizontal",gap:s,align:c,className:a,"data-slot":"cluster",...d})}try{r.displayName="Stack",r.__docgenInfo={description:"",displayName:"Stack",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/primitives/stack.tsx",methods:[],props:{align:{defaultValue:null,declarations:[],description:"",name:"align",required:!1,tags:{},type:{name:'"center" | "start" | "end" | "stretch" | "baseline" | null'}},gap:{defaultValue:null,declarations:[],description:"",name:"gap",required:!1,tags:{},type:{name:'"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | null'}},justify:{defaultValue:null,declarations:[],description:"",name:"justify",required:!1,tags:{},type:{name:'"center" | "start" | "end" | "between" | "around" | null'}},direction:{defaultValue:{value:"vertical"},declarations:[{fileName:"ui/src/primitives/stack.tsx",name:"TypeLiteral"}],description:"",name:"direction",required:!1,tags:{},type:{name:"enum",raw:'"horizontal" | "vertical"',value:[{value:'"horizontal"'},{value:'"vertical"'}]}},render:{defaultValue:null,declarations:[{fileName:"ui/src/primitives/stack.tsx",name:"TypeLiteral"}],description:"",name:"render",required:!1,tags:{},type:{name:"RenderProp<Record<string, unknown>>"}}},tags:{}}}catch{}try{p.displayName="Cluster",p.__docgenInfo={description:'`<Cluster>` — horizontal Stack with wrap. Sugar for tag rows, chip rows,\nbutton rows. Use Stack with `direction="horizontal"` if you need more\ncontrol.',displayName:"Cluster",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/primitives/stack.tsx",methods:[],props:{render:{defaultValue:null,declarations:[{fileName:"ui/src/primitives/stack.tsx",name:"TypeLiteral"}],description:"",name:"render",required:!1,tags:{},type:{name:"RenderProp<Record<string, unknown>>"}},align:{defaultValue:{value:"center"},declarations:[],description:"",name:"align",required:!1,tags:{},type:{name:'"center" | "start" | "end" | "stretch" | "baseline" | null'}},gap:{defaultValue:{value:"sm"},declarations:[],description:"",name:"gap",required:!1,tags:{},type:{name:'"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | null'}},justify:{defaultValue:null,declarations:[],description:"",name:"justify",required:!1,tags:{},type:{name:'"center" | "start" | "end" | "between" | "around" | null'}}},tags:{}}}catch{}const _={title:"Primitives/Stack",component:r,tags:["autodocs"],parameters:{docs:{description:{component:"Gap rhythm from LAYOUT_PHILOSOPHY.md §3. `Stack` lays children out vertically; `Cluster` lays them out horizontally with wrap. Every gap maps to one of six tokens — never a per-page guess."}}},argTypes:{direction:{control:"select",options:["vertical","horizontal"]},gap:{control:"select",options:["xs","sm","md","lg","xl","2xl"]},align:{control:"select",options:["start","center","end","stretch","baseline"]},justify:{control:"select",options:["start","center","end","between","around"]}}},t=({label:a})=>e.jsx("div",{className:"rounded-md border border-fd-border bg-fd-card/40 px-4 py-2 text-sm",children:a}),l={args:{direction:"vertical",gap:"md"},render:a=>e.jsxs(r,{...a,children:[e.jsx(t,{label:"Item 1"}),e.jsx(t,{label:"Item 2"}),e.jsx(t,{label:"Item 3"})]})},n={args:{direction:"horizontal",gap:"sm"},render:a=>e.jsxs(r,{...a,children:[e.jsx(t,{label:"Item 1"}),e.jsx(t,{label:"Item 2"}),e.jsx(t,{label:"Item 3"}),e.jsx(t,{label:"Item 4"})]})},i={render:()=>e.jsx(r,{gap:"lg",children:["xs","sm","md","lg","xl","2xl"].map(a=>e.jsxs("div",{children:[e.jsxs("div",{className:"mb-2 text-xs font-mono uppercase text-fd-muted-foreground",children:['gap="',a,'"']}),e.jsxs(r,{direction:"horizontal",gap:a,children:[e.jsx(t,{label:"A"}),e.jsx(t,{label:"B"}),e.jsx(t,{label:"C"})]})]},a))})},o={render:()=>e.jsx(p,{gap:"xs",children:["Browser","JWT","Express","Node.js","MongoDB","NestJS","Lambda","Vercel AI"].map(a=>e.jsx("span",{className:"rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-900 dark:text-orange-100",children:a},a))})};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    direction: 'vertical',
    gap: 'md'
  },
  render: args => <Stack {...args}>
      <Pill label="Item 1" />
      <Pill label="Item 2" />
      <Pill label="Item 3" />
    </Stack>
}`,...l.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    direction: 'horizontal',
    gap: 'sm'
  },
  render: args => <Stack {...args}>
      <Pill label="Item 1" />
      <Pill label="Item 2" />
      <Pill label="Item 3" />
      <Pill label="Item 4" />
    </Stack>
}`,...n.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <Stack gap="lg">
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map(gap => <div key={gap}>
          <div className="mb-2 text-xs font-mono uppercase text-fd-muted-foreground">
            gap=&quot;{gap}&quot;
          </div>
          <Stack direction="horizontal" gap={gap}>
            <Pill label="A" />
            <Pill label="B" />
            <Pill label="C" />
          </Stack>
        </div>)}
    </Stack>
}`,...i.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <Cluster gap="xs">
      {['Browser', 'JWT', 'Express', 'Node.js', 'MongoDB', 'NestJS', 'Lambda', 'Vercel AI'].map(tag => <span key={tag} className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-900 dark:text-orange-100">
          {tag}
        </span>)}
    </Cluster>
}`,...o.parameters?.docs?.source}}};const P=["Vertical","Horizontal","GapScale","ClusterChips"];export{o as ClusterChips,i as GapScale,n as Horizontal,l as Vertical,P as __namedExportsOrder,_ as default};

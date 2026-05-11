import{r as l,j as e}from"./iframe-CaMHNqgm.js";import{c as m}from"./cn-DCADjnpI.js";import{u as d}from"./useRenderElement-DZBmXc0a.js";import"./preload-helper-PPVm8Dsz.js";const u=l.forwardRef(function(a,o){const{className:f,render:h,orientation:i="horizontal",...p}=a,c=l.useMemo(()=>({orientation:i}),[i]);return d("div",a,{state:c,ref:o,props:[{role:"separator","aria-orientation":i},p]})});function t({className:n,orientation:a="horizontal",...o}){return e.jsx(u,{"data-slot":"separator",orientation:a,className:m("bg-border shrink-0",a==="horizontal"?"h-px w-full":"h-full w-px",n),...o})}try{t.displayName="Separator",t.__docgenInfo={description:"",displayName:"Separator",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/primitives/separator.tsx",methods:[],props:{className:{defaultValue:null,declarations:[{fileName:"eslint/node_modules/@base-ui-components/react/esm/utils/types.d.ts",name:"TypeLiteral"}],description:`CSS class applied to the element, or a function that
returns a class based on the component’s state.`,name:"className",required:!1,tags:{},type:{name:"string | ((state: SeparatorState) => string)"}},render:{defaultValue:null,declarations:[{fileName:"eslint/node_modules/@base-ui-components/react/esm/utils/types.d.ts",name:"TypeLiteral"}],description:`Allows you to replace the component’s HTML element
with a different tag, or compose it with another component.

Accepts a \`ReactElement\` or a function that returns the element to render.`,name:"render",required:!1,tags:{},type:{name:"ReactElement<Record<string, unknown>, string | JSXElementConstructor<any>> | ComponentRenderFn<HTMLProps<any>, SeparatorState>"}}},tags:{}}}catch{}const y={title:"Primitives/Separator",component:t,tags:["autodocs"],parameters:{layout:"padded"}},r={render:()=>e.jsxs("div",{className:"w-[300px]",children:[e.jsx("p",{className:"mb-3 text-sm",children:"Above"}),e.jsx(t,{}),e.jsx("p",{className:"mt-3 text-sm",children:"Below"})]})},s={render:()=>e.jsxs("div",{className:"flex h-10 items-center gap-3 text-sm",children:[e.jsx("span",{children:"Left"}),e.jsx(t,{orientation:"vertical"}),e.jsx("span",{children:"Center"}),e.jsx(t,{orientation:"vertical"}),e.jsx("span",{children:"Right"})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-[300px]">
      <p className="mb-3 text-sm">Above</p>
      <Separator />
      <p className="mt-3 text-sm">Below</p>
    </div>
}`,...r.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex h-10 items-center gap-3 text-sm">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Center</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
}`,...s.parameters?.docs?.source}}};const j=["Horizontal","Vertical"];export{r as Horizontal,s as Vertical,j as __namedExportsOrder,y as default};

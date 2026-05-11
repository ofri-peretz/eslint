import{j as e}from"./iframe-CaMHNqgm.js";import{c as n}from"./cn-DCADjnpI.js";import{L as l}from"./label-BHBtjoI1.js";import"./preload-helper-PPVm8Dsz.js";function r({className:t,type:d,...o}){return e.jsx("input",{type:d,"data-slot":"input",className:n("file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm","focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]","aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",t),...o})}try{r.displayName="Input",r.__docgenInfo={description:"",displayName:"Input",filePath:"/Users/ofri/repos/ofriperetz.dev/eslint/packages/ui/src/primitives/input.tsx",methods:[],props:{},tags:{}}}catch{}const x={title:"Primitives/Input",component:r,tags:["autodocs"],parameters:{layout:"padded"}},a={render:()=>e.jsxs("div",{className:"grid w-[300px] gap-2",children:[e.jsx(l,{htmlFor:"email",children:"Email"}),e.jsx(r,{id:"email",type:"email",placeholder:"you@example.com"})]})},i={render:()=>e.jsxs("div",{className:"grid w-[300px] gap-2",children:[e.jsx(l,{htmlFor:"email-disabled",children:"Email"}),e.jsx(r,{id:"email-disabled",type:"email",placeholder:"you@example.com",disabled:!0})]})},s={render:()=>e.jsxs("div",{className:"grid w-[300px] gap-2",children:[e.jsx(l,{htmlFor:"email-err",children:"Email"}),e.jsx(r,{id:"email-err",type:"email",placeholder:"you@example.com","aria-invalid":"true","aria-describedby":"email-err-msg"}),e.jsx("p",{id:"email-err-msg",className:"text-destructive text-xs",children:"Enter a valid email address."})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-[300px] gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
}`,...a.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-[300px] gap-2">
      <Label htmlFor="email-disabled">Email</Label>
      <Input id="email-disabled" type="email" placeholder="you@example.com" disabled />
    </div>
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-[300px] gap-2">
      <Label htmlFor="email-err">Email</Label>
      <Input id="email-err" type="email" placeholder="you@example.com" aria-invalid="true" aria-describedby="email-err-msg" />
      <p id="email-err-msg" className="text-destructive text-xs">
        Enter a valid email address.
      </p>
    </div>
}`,...s.parameters?.docs?.source}}};const g=["Default","Disabled","WithError"];export{a as Default,i as Disabled,s as WithError,g as __namedExportsOrder,x as default};

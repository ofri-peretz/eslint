import{j as e}from"./iframe-CaMHNqgm.js";import{B as t}from"./button-fFLV84cE.js";import"./preload-helper-PPVm8Dsz.js";import"./cn-DCADjnpI.js";import"./index-Qea67HoU.js";import"./useRender-CuZRRLR5.js";import"./useRenderElement-DZBmXc0a.js";const p={title:"Primitives/Button",component:t,tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","secondary","outline","ghost","link","destructive"]},size:{control:"select",options:["xs","sm","default","lg","icon","icon-xs","icon-sm","icon-lg"]},disabled:{control:"boolean"}}},r={args:{children:"Click me",variant:"default",size:"default"}},a={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-3",children:[e.jsx(t,{variant:"default",children:"Default"}),e.jsx(t,{variant:"secondary",children:"Secondary"}),e.jsx(t,{variant:"outline",children:"Outline"}),e.jsx(t,{variant:"ghost",children:"Ghost"}),e.jsx(t,{variant:"link",children:"Link"}),e.jsx(t,{variant:"destructive",children:"Destructive"})]})},n={render:()=>e.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[e.jsx(t,{size:"xs",children:"XS"}),e.jsx(t,{size:"sm",children:"SM"}),e.jsx(t,{size:"default",children:"Default"}),e.jsx(t,{size:"lg",children:"LG"})]})},s={args:{children:"Disabled",disabled:!0}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Click me',
    variant: 'default',
    size: 'default'
  }
}`,...r.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">XS</Button>
      <Button size="sm">SM</Button>
      <Button size="default">Default</Button>
      <Button size="lg">LG</Button>
    </div>
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Disabled',
    disabled: true
  }
}`,...s.parameters?.docs?.source}}};const x=["Default","Variants","Sizes","Disabled"];export{r as Default,s as Disabled,n as Sizes,a as Variants,x as __namedExportsOrder,p as default};

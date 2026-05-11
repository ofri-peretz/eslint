import{j as e}from"./iframe-CaMHNqgm.js";import{C as t,a as s,c as d,d as n,b as o,e as i}from"./card-B_jhdHlQ.js";import{B as c}from"./button-fFLV84cE.js";import"./preload-helper-PPVm8Dsz.js";import"./cn-DCADjnpI.js";import"./index-Qea67HoU.js";import"./useRender-CuZRRLR5.js";import"./useRenderElement-DZBmXc0a.js";const f={title:"Primitives/Card",component:t,tags:["autodocs"],parameters:{layout:"padded"}},r={render:()=>e.jsxs(t,{className:"w-[360px]",children:[e.jsxs(s,{children:[e.jsx(d,{children:"Title"}),e.jsx(n,{children:"Card description goes here."})]}),e.jsx(o,{children:e.jsx("p",{className:"text-sm",children:"Body content of the card."})}),e.jsx(i,{children:e.jsx(c,{children:"Action"})})]})},a={render:()=>e.jsxs(t,{className:"w-[360px] border-2",children:[e.jsxs(s,{children:[e.jsx(d,{children:"Outlined card"}),e.jsx(n,{children:"Heavier border for emphasis."})]}),e.jsx(o,{children:e.jsx("p",{className:"text-sm",children:"Body content of the card."})})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Body content of the card.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
}`,...r.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  render: () => <Card className="w-[360px] border-2">
      <CardHeader>
        <CardTitle>Outlined card</CardTitle>
        <CardDescription>Heavier border for emphasis.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Body content of the card.</p>
      </CardContent>
    </Card>
}`,...a.parameters?.docs?.source}}};const B=["Default","Outline"];export{r as Default,a as Outline,B as __namedExportsOrder,f as default};

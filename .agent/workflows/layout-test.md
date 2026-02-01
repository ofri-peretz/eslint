---
description: Test docs layout at all responsive breakpoints with visual verification
---

# Responsive Layout Testing Workflow

This workflow tests the documentation app layout at all standard breakpoints to ensure responsive behavior is working correctly.

## Test Viewport Sizes

The following viewport sizes MUST be tested in order:

| Tier             | Width  | Height | Description      |
| ---------------- | ------ | ------ | ---------------- |
| Mobile Portrait  | 375px  | 667px  | iPhone SE/8      |
| Mobile Landscape | 667px  | 375px  | iPhone landscape |
| Tablet Portrait  | 768px  | 1024px | iPad portrait    |
| Tablet Landscape | 1024px | 768px  | iPad landscape   |
| Desktop          | 1280px | 800px  | Standard desktop |
| Wide Desktop     | 1536px | 900px  | Large monitor    |

## Test Checklist Per Viewport

For EACH viewport size, verify:

### Layout Structure

- [ ] No horizontal scrollbar present
- [ ] Content does not overlap sidebar
- [ ] Content does not overlap TOC
- [ ] Sidebar visibility matches breakpoint (hidden < 768px)
- [ ] TOC visibility matches breakpoint (hidden < 1280px)

### Sidebar Behavior

- [ ] Mobile (< 768px): Sidebar hidden, hamburger menu visible
- [ ] Tablet (768-1279px): Sidebar visible
- [ ] Desktop (≥ 1280px): Sidebar visible

### TOC Behavior

- [ ] Mobile/Tablet (< 1280px): TOC panel hidden, popover trigger visible
- [ ] Desktop (≥ 1280px): TOC panel visible on right side

### Content Area

- [ ] Main content is readable (not cut off)
- [ ] Text does not overflow containers
- [ ] Code blocks have horizontal scroll if needed
- [ ] Tables render correctly
- [ ] Images scale properly

### Interactive Elements

- [ ] Touch targets are at least 44x44px on mobile
- [ ] No overlapping clickable elements
- [ ] Search dialog is accessible

## Execution Instructions

When running this workflow, use the browser subagent to:

1. Navigate to the test page
2. For EACH viewport size in the table above:
   a. Resize the browser window to the exact dimensions
   b. Wait 500ms for layout reflow
   c. Take a screenshot named `layout_{tier}_{width}x{height}.png`
   d. Check for horizontal scrollbar
   e. Verify sidebar/TOC visibility
3. Create a summary report of any issues found

## Screenshot Naming Convention

```
layout_mobile_portrait_375x667.png
layout_mobile_landscape_667x375.png
layout_tablet_portrait_768x1024.png
layout_tablet_landscape_1024x768.png
layout_desktop_1280x800.png
layout_wide_desktop_1536x900.png
```

## Pass/Fail Criteria

**PASS**: All checkboxes verified at all viewports, no overlapping content, proper sidebar/TOC visibility.

**FAIL**: Any overlapping content, horizontal scrollbar, or incorrect sidebar/TOC visibility.

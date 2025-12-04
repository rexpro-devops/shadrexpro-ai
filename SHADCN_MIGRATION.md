# shadcn/ui Migration Guide

## Overview

The application has been successfully migrated to use shadcn/ui components with a neutral theme. This provides a consistent, accessible, and modern design system throughout the application.

## What Was Changed

### 1. Project Configuration

#### Package Dependencies
Added the following packages:
- `tailwindcss` & `@tailwindcss/vite` - Build-time Tailwind CSS
- `class-variance-authority`, `clsx`, `tailwind-merge` - Utility libraries for styling
- Radix UI primitives for accessible components:
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-select`
  - `@radix-ui/react-slider`
  - `@radix-ui/react-switch`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-label`
  - `@radix-ui/react-tooltip`

#### TypeScript Configuration
- Created `tsconfig.app.json` for app-specific config
- Created `tsconfig.node.json` for build tools config
- Updated `tsconfig.json` to use project references
- Configured path aliases: `@/*` → `./src/*`

#### Vite Configuration
- Added `@tailwindcss/vite` plugin
- Updated path alias to point to `./src` directory

#### shadcn Configuration
- Created `components.json` with neutral theme settings
- Configured to use the "new-york" style
- Set up CSS variables for theming

### 2. Styling System

#### CSS Variables (Neutral Theme)
Replaced custom color variables with shadcn's neutral theme using OKLCH color space:

**Light Theme:**
- `--background: oklch(1 0 0)` - Pure white
- `--foreground: oklch(0.145 0 0)` - Near black
- `--primary: oklch(0.205 0 0)` - Dark gray
- `--secondary: oklch(0.97 0 0)` - Very light gray
- `--muted: oklch(0.97 0 0)` - Muted background
- `--border: oklch(0.922 0 0)` - Light border

**Dark Theme:**
- `--background: oklch(0.145 0 0)` - Dark background
- `--foreground: oklch(0.985 0 0)` - Near white
- `--primary: oklch(0.922 0 0)` - Light gray
- `--card: oklch(0.205 0 0)` - Card background

#### New CSS File Structure
- Created `src/index.css` with shadcn theme variables
- Updated `index.html` to use build-time CSS instead of CDN Tailwind
- Maintained custom styles for chat input, citations, and animations

### 3. Project Structure

#### New Folder Structure
```
project/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── tooltip.tsx
│   │   ├── AudioVisualizer.tsx
│   │   ├── ChatArea.tsx
│   │   ├── ChatMessageItem.tsx
│   │   └── ... (other components)
│   ├── lib/
│   │   ├── utils.ts          # cn() utility function
│   │   ├── analyser.ts
│   │   ├── audioUtils.ts
│   │   └── cryptoUtils.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── geminiService.ts
│   │   └── localDbService.ts
│   ├── App.tsx
│   ├── index.tsx
│   ├── index.css
│   ├── types.ts
│   └── store.ts
├── components.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

### 4. shadcn UI Components Created

All components follow shadcn/ui patterns and are fully accessible:

1. **Button** - Multiple variants (default, destructive, outline, secondary, ghost, link)
2. **Input** - Accessible text input with focus states
3. **Textarea** - Multi-line text input
4. **Label** - Form labels with proper associations
5. **Select** - Dropdown select with keyboard navigation
6. **Slider** - Range slider for numeric inputs
7. **Switch** - Toggle switch for boolean values
8. **Dialog** - Modal dialogs with overlay
9. **Tabs** - Tab navigation component
10. **Separator** - Visual dividers
11. **ScrollArea** - Custom scrollable containers
12. **Tooltip** - Hover tooltips

### 5. Utility Functions

#### `cn()` Function
Location: `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

This utility combines `clsx` and `tailwind-merge` to intelligently merge Tailwind classes, preventing conflicts and allowing for conditional styling.

## How to Use shadcn Components

### Example: Using Button Component

```tsx
import { Button } from "@/components/ui/button"

function MyComponent() {
  return (
    <div>
      <Button>Default Button</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Icon Button</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}
```

### Example: Using Dialog Component

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a description of what this dialog does.
          </DialogDescription>
        </DialogHeader>
        {/* Dialog content here */}
      </DialogContent>
    </Dialog>
  )
}
```

### Example: Using Form Components

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

function MyForm() {
  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter your name" />
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" placeholder="Tell us about yourself" />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="notifications" />
        <Label htmlFor="notifications">Enable notifications</Label>
      </div>
    </form>
  )
}
```

## Design Tokens

### Color Palette
The neutral theme uses a grayscale palette with subtle variations:

- **Backgrounds**: Pure white (light) / Dark gray (dark)
- **Foregrounds**: Near black (light) / Near white (dark)
- **Borders**: Light gray with transparency in dark mode
- **Accents**: Neutral grays that adapt to theme

### Border Radius
Consistent border radius using CSS variable:
```css
--radius: 0.65rem
```

### Spacing
All components use Tailwind's spacing scale (0.25rem increments)

## Theme Switching

The theme is controlled by the `dark` class on the `<html>` element:

```typescript
// Light mode
document.documentElement.classList.remove('dark')

// Dark mode
document.documentElement.classList.add('dark')
```

## Next Steps for Migration

To fully migrate existing components to use shadcn UI:

1. **Replace Custom Buttons**
   - Replace inline button styles with `<Button>` component
   - Use variants for different button types

2. **Update Form Inputs**
   - Replace `<input>` with `<Input>` component
   - Replace `<textarea>` with `<Textarea>` component
   - Add `<Label>` components for accessibility

3. **Migrate Modals**
   - Replace custom modal implementations with `<Dialog>` component
   - Use DialogHeader, DialogTitle, DialogDescription for structure

4. **Update Dropdowns**
   - Replace custom dropdown components with `<Select>` component
   - Ensures keyboard navigation and accessibility

5. **Add Tooltips**
   - Wrap elements with `<TooltipProvider>`, `<Tooltip>`, and `<TooltipTrigger>`
   - Replace data-tooltip attributes

6. **Use Tabs Component**
   - Replace custom tab implementations with `<Tabs>` component
   - Provides keyboard navigation and ARIA attributes

## Benefits of shadcn/ui

1. **Accessibility** - All components follow WAI-ARIA guidelines
2. **Customization** - Full control over component code
3. **Type Safety** - Full TypeScript support
4. **Consistency** - Design system ensures consistent UX
5. **Performance** - Components are tree-shakeable and optimized
6. **Dark Mode** - Built-in theme support with CSS variables
7. **Developer Experience** - Excellent DX with Radix UI primitives

## Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [OKLCH Color Space](https://oklch.com)

## Troubleshooting

### Issue: Components not styled correctly
**Solution:** Ensure `src/index.css` is imported in your entry file and Tailwind is configured correctly in `vite.config.ts`

### Issue: Path alias not working
**Solution:** Check that both `tsconfig.json` and `tsconfig.app.json` have the correct `paths` configuration pointing to `"@/*": ["./src/*"]`

### Issue: Dark mode not working
**Solution:** Verify the `dark` class is being toggled on the `<html>` element and CSS variables are defined in `src/index.css`

---

**Migration Completed:** December 3, 2025
**shadcn/ui Version:** Latest (Neutral Theme)
**Build Status:** ✅ Successful

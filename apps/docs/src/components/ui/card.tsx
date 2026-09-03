// Re-export shim — the canonical Card lives in @interlace/ui/card.
// This shim exists so shadcn-style `@/components/ui/card` imports resolve
// without forcing every consumer to know the workspace package name.
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '@interlace/ui/card';

// WCAG 1.1.1 — next/image without alt
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected (with rule option { img: ['Image'] }) — next/image is the dominant
// image component in Next.js apps; without custom-component config the rule is invisible there.
import Image from 'next/image';
export function Hero({ src }: { src: string }) {
  return <Image src={src} width={800} height={400} />;
}

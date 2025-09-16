# Repository Guidelines

## Project Structure & Module Organization
- This parallel route group hosts the marketing/landing experience; cluster hero, pricing, testimonial, and FAQ sections in self-contained files.
- Keep top-level `page.tsx` focused on layout composition and pull in content blocks via named exports from neighboring files.
- Shared marketing copy lives in `docs/` or localized JSON assets; import rather than hardcoding strings when reuse is expected.
- Store SEO metadata objects alongside components and expose helper functions to reuse them in campaign-specific routes.

## Build, Test, and Development Commands
- Iterate with `npm run dev` to verify animations, theme toggles, and responsive breakpoints.
- Before merging, run `npm run build` to ensure no server/client boundary warnings surface from marketing components.
- Execute `npm run lint` to validate accessibility lint rules and Tailwind usage.

## Coding Style & Naming Conventions
- Name sections descriptively (`HeroSection`, `PricingPlans`, `TestimonialsCarousel`) and keep file names aligned with the exported component.
- Use layout → spacing → typography → color → state ordering for Tailwind classes; stash shared palettes or gradients in `@/lib/styles`.
- Centralize hardcoded asset paths in a constants file (e.g., `images.ts`) to simplify CDN or path updates.
- Document animation timing or Framer Motion variants in short comments near the configuration.

## Testing Guidelines
- Add Storybook stories or visual regression tests for key sections when adjusting design tokens.
- Use React Testing Library to assert presence of key CTAs, anchor scroll targets, and accessible labels for interactive components.
- Validate that theme toggles and CTA links remain functional by exercising them in tests or manual QA notes appended to PRs.

## Commit & Pull Request Guidelines
- Scope commits to the landing surface, e.g., `feat(landing): refresh pricing grid`.
- Include desktop and mobile screenshots, plus note any copy or assets requiring marketing approval.
- Flag dependencies on new analytics or third-party embeds so reviewers confirm consent and CSP updates.

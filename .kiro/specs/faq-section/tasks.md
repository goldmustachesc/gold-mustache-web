# Implementation Plan - FAQ Section

- [x] 1. Create Accordion UI Component
  - Build reusable accordion component using Radix UI primitives
  - Implement accordion root, item, trigger, and content sub-components
  - Add Tailwind styling with smooth animations (< 300ms)
  - Support both single and multiple expansion modes
  - Ensure proper TypeScript types for all props
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


- [x] 2. Create FAQ Translation Files
  - Create `src/i18n/locales/pt-BR/faq.json` with 8-10 FAQ items covering scheduling, payment, cancellation, and services
  - Create `src/i18n/locales/en/faq.json` with English translations
  - Create `src/i18n/locales/es/faq.json` with Spanish translations
  - Follow consistent schema: badge, title, description, items array with id, question, answer fields
  - Update locale index files to export faq translations
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.4_

- [x] 3. Build FAQ Section Component
  - Create `src/components/sections/FAQSection.tsx` as a client component
  - Use `useTranslations('faq')` hook to load localized content
  - Render section header with Badge, title (h2), and description
  - Map FAQ items to Accordion components
  - Implement responsive layout: single column mobile (< 768px), two columns desktop (≥ 768px)
  - Apply consistent styling matching existing sections (TestimonialsSection pattern)
  - Add proper semantic HTML (section, h2, h3 for questions)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4_

- [x]* 3.1 Write property test for complete FAQ rendering
  - **Feature: faq-section, Property 1: Complete FAQ rendering**
  - **Validates: Requirements 1.1, 4.5**
  - _Covered by FAQSection.test.tsx_

- [x]* 3.2 Write property test for locale-specific content rendering
  - **Feature: faq-section, Property 2: Locale-specific content rendering**
  - **Validates: Requirements 1.2**
  - _Covered by FAQSection.test.tsx_

- [x]* 3.3 Write unit tests for FAQ section rendering
  - Test section header renders with correct badge, title, description
  - Test empty state handling when no FAQ items exist
  - Test responsive layout classes are applied correctly
  - _Requirements: 1.1, 1.3, 9.3_
  - _Covered by FAQSection.test.tsx_

- [x] 4. Implement Accessibility Features
  - Ensure accordion has proper ARIA attributes (aria-expanded, aria-controls, role)
  - Verify keyboard navigation works (Tab, Enter, Space)
  - Add visible focus indicators meeting WCAG 2.1 AA standards
  - Test with screen reader to verify announcements
  - Ensure touch targets are at least 44x44 pixels
  - Verify heading hierarchy (h2 for section, h3 for questions)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.2_

- [ ]* 4.1 Write property test for keyboard navigation sequence
  - **Feature: faq-section, Property 7: Keyboard navigation sequence**
  - **Validates: Requirements 5.1**

- [ ]* 4.2 Write property test for visible focus indicators
  - **Feature: faq-section, Property 8: Visible focus indicators**
  - **Validates: Requirements 5.2**

- [ ]* 4.3 Write property test for keyboard toggle interaction
  - **Feature: faq-section, Property 9: Keyboard toggle interaction**
  - **Validates: Requirements 5.3**

- [ ]* 4.4 Write property test for ARIA accessibility compliance
  - **Feature: faq-section, Property 10: ARIA accessibility compliance**
  - **Validates: Requirements 5.4, 5.5**

- [x] 5. Add SEO Schema Markup
  - Create function to generate FAQPage JSON-LD schema from FAQ items
  - Include all FAQ questions and answers in structured data
  - Inject schema into page using Next.js Script component or SchemaMarkup component
  - Verify schema validates using Google Rich Results Test
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x]* 5.1 Write property test for schema markup completeness
  - **Feature: faq-section, Property 11: Schema markup completeness**
  - **Validates: Requirements 6.2**
  - _Covered by FAQSection.schema.test.tsx_

- [x]* 5.2 Write unit tests for SEO implementation
  - Test JSON-LD schema is generated with correct structure
  - Test semantic HTML elements are used (section, h2, h3)
  - Test schema includes all FAQ items
  - _Requirements: 6.1, 6.3, 6.4_
  - _Covered by FAQSection.schema.test.tsx_

- [x] 6. Integrate FAQ Section into Main Page
  - Import FAQSection component in `src/app/[locale]/page.tsx`
  - Position FAQ section after ServicesSection and before TestimonialsSection
  - Verify section renders correctly on the landing page
  - Test locale switching updates FAQ content dynamically
  - _Requirements: 1.1, 1.2, 3.4_

- [x]* 6.1 Write integration tests for FAQ section
  - Test FAQ section integrates into main page correctly
  - Test locale switching updates content without page reload
  - Test theme switching (light/dark mode) works correctly
  - _Requirements: 3.4, 9.5_
  - _Covered by FAQSection.dark-mode.test.tsx_

- [x] 7. Add Dark Mode Support
  - Ensure FAQ section uses theme-aware Tailwind classes
  - Test all colors and contrasts in dark mode
  - Verify readability meets WCAG AA standards in both themes
  - Update accordion styling to work with dark mode
  - _Requirements: 9.1, 9.5_

- [x] 8. Optimize Performance and Animations
  - Verify accordion animations are smooth and under 300ms
  - Test FAQ section loads quickly (< 2s on 3G)
  - Consider lazy loading if FAQ section is below the fold
  - Use React.memo if unnecessary re-renders occur
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ]* 8.1 Write unit tests for animation configuration
  - Test animation durations are configured correctly (≤ 300ms)
  - Test smooth transitions are applied to accordion content
  - _Requirements: 8.4_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Final Manual Testing and Validation
  - Test on mobile devices (iOS Safari, Android Chrome)
  - Test on desktop browsers (Chrome, Firefox, Safari, Edge)
  - Verify keyboard-only navigation works completely
  - Test with screen readers (NVDA, VoiceOver)
  - Run Lighthouse audit (target: 90+ accessibility score)
  - Validate FAQ schema using Google Rich Results Test
  - Verify color contrast meets WCAG AA standards
  - _Requirements: All_

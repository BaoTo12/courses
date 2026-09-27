import { createGlobalStyle } from 'styled-components';

/**
 * React-app-only global rules. The reset, typography and themes come from the SCSS design system
 * (base/), so this stays deliberately tiny: no second reset (10.06).
 */
export const GlobalStyle = createGlobalStyle`
  #root {
    isolation: isolate; /* toasts and overlays stack above the app without z-index wars */
  }

  :target {
    scroll-margin-top: ${({ theme }) => theme.space(16)};
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// Module augmentation (06.10): tell styled-components what our theme looks like.
import 'styled-components';
import type { AppTheme } from './theme/theme';

declare module 'styled-components' {
  // DefaultTheme is an empty interface in the library; we merge our theme's shape into it.
  export interface DefaultTheme extends AppTheme {}
}

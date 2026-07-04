import { useDynamicTheme } from '../../contexts/DynamicThemeContext';

/**
 * Bridges the Claude design components' `useTheme` contract onto the app's
 * DynamicThemeContext so both token systems flip together.
 */
export function useTheme(): { theme: 'light' | 'dark'; toggleTheme: () => void } {
  const { themeMode, toggleThemeMode } = useDynamicTheme();
  return { theme: themeMode, toggleTheme: toggleThemeMode };
}

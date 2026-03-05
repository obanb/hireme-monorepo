'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { LocaleProvider } from '../context/LocaleContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { CommandPaletteProvider } from '../context/CommandPaletteContext';
import CommandPalette from './CommandPalette';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <CommandPaletteProvider>
                {children}
                <CommandPalette />
              </CommandPaletteProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

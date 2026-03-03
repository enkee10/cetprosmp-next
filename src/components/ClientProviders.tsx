
'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme/theme'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  )
}

'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import type { AlertColor, AlertProps, SxProps, Theme } from '@mui/material';

interface AutoDismissAlertProps extends Omit<AlertProps, 'severity'> {
  severity?: AlertColor;
  message?: ReactNode;
  autoHideDuration?: number;
  autoHideSuccess?: boolean;
  containerSx?: SxProps<Theme>;
}

export default function AutoDismissAlert({
  severity = 'error',
  message,
  children,
  autoHideDuration = 5000,
  autoHideSuccess = true,
  containerSx,
  ...alertProps
}: AutoDismissAlertProps) {
  const content = message ?? children;
  const [visible, setVisible] = useState(Boolean(content));

  useEffect(() => {
    setVisible(Boolean(content));
    if (!content || !autoHideSuccess || severity !== 'success') return undefined;

    const timeoutId = window.setTimeout(() => setVisible(false), autoHideDuration);
    return () => window.clearTimeout(timeoutId);
  }, [autoHideDuration, autoHideSuccess, content, severity]);

  if (!content || !visible) return null;

  const alert = (
    <Alert severity={severity} {...alertProps}>
      {content}
    </Alert>
  );

  return containerSx ? <Box sx={containerSx}>{alert}</Box> : alert;
}

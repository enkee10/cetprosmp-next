// components/BulletItem.tsx
import { Box, Typography } from '@mui/material';

export default function BulletItem({ text }: { text: string }) {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box
        sx={{
          width: 8,
          height: 8,
          bgcolor: 'black',
          borderRadius: '50%',
          flexShrink: 0,
          mt: '3px',
        }}
      />
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

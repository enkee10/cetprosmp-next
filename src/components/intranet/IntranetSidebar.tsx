'use client';

import React, { useState } from 'react';
import { Box, Divider, Toolbar } from '@mui/material';
import AcordionIntranet from '@/components/Sidebar/AcordionIntranet/AcordionIntranet';

export default function IntranetSidebar() {
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    'intranet-entidades',
  ]);

  const handleAccordionChange = (id: string, ancestors: string[]) => {
    setOpenAccordions((prev) => {
      const isOpen = prev.includes(id);
      return isOpen ? prev.filter((item) => item !== id) : [...ancestors, id];
    });
  };

  return (
    <Box
      sx={{
        bgcolor: 'pink',
        minHeight: '100vh',
        width: 240,
        flexShrink: 0,
      }}
    >
      <Toolbar />
      <Divider />
      <AcordionIntranet
        openAccordions={openAccordions}
        handleAccordionChange={handleAccordionChange}
        showRoot={false}
      />
      <Divider />
    </Box>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import AcordionPrincipal from './AcordionPrincipal/AcordionPrincipal';
import AcordionIntranet from './AcordionIntranet/AcordionIntranet';

export default function AcordionGeneral() {
  const { user } = useAuth();
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setOpenAccordions(['intranet', 'intranet-entidades']);
    } else {
      setOpenAccordions(['principal']);
    }
  }, [user]);

  const handleAccordionChange = (id: string, ancestors: string[]) => {
    setOpenAccordions((prev) => {
      const isOpen = prev.includes(id);
      return isOpen ? prev.filter((item) => item !== id) : [...ancestors, id];
    });
  };

  return (
    <>
      <Box
        mb={2}
        mx={1}
        sx={{
          '& .MuiAccordionSummary-root': {
            backgroundColor: '#a0cde0',
          },
        }}
      >
        <AcordionPrincipal
          openAccordions={openAccordions}
          handleAccordionChange={handleAccordionChange}
        />
      </Box>

      {user && (
        <Box
          mb={2}
          mx={1}
          sx={{
            '& .MuiAccordionSummary-root': {
              backgroundColor: '#a0df9c',
            },
          }}
        >
          <AcordionIntranet
            openAccordions={openAccordions}
            handleAccordionChange={handleAccordionChange}
          />
        </Box>
      )}
    </>
  );
}

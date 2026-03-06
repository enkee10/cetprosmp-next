import { Box, Toolbar } from '@mui/material';
import IntranetSidebar from '@/components/intranet/Sidebar';

export default function IntranetLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
        <Box sx={{ display: 'flex' }}>
            <IntranetSidebar />
            <Box
                component="main"
                sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
  }
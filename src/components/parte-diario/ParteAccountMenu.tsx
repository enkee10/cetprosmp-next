'use client';
import { useEffect, useState } from 'react';
import { Avatar, Box, ButtonBase, Divider, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
type Account = { id: number; nombre: string; email: string; avatar: string | null; aliases?: string[] };
export default function ParteAccountMenu({ onError }: { onError: (error: string) => void }) {
  const { user, loginWithGoogle, logout } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null), [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    let active = true; setAccounts([]);
    if (user) httpsCallable<undefined, { cuentas: Account[] }>(functions, 'getParteDiarioCuentas')()
      .then(result => { if (active) setAccounts(result.data.cuentas); })
      .catch(error => { if (active) onError(error.message || 'No se pudieron cargar las cuentas.'); });
    return () => { active = false; };
  }, [user, onError]);
  if (!user) return null;
  const isCurrent = (account: Account) => [account.email, ...(account.aliases || [])].some(email => email.toLowerCase() === user.email?.toLowerCase());
  const current = accounts.find(isCurrent);
  return <Box sx={{ ml: '25px', display: 'flex', alignItems: 'center' }}>
    <ButtonBase aria-label="Cuenta de usuario del parte diario" aria-haspopup="menu" onClick={event => setAnchor(event.currentTarget)} sx={{ borderRadius: '50%' }}>
      <Avatar src={user.photoURL || current?.avatar || undefined} alt={current?.nombre || user.displayName || 'Coordinador'} sx={{ width: 40, height: 40 }} />
    </ButtonBase>
    <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 280 } } }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, py: 1.5 }}>
        <Avatar src={user.photoURL || current?.avatar || undefined} />
        <Box><Typography variant="body2" fontWeight={700}>{current?.nombre || user.displayName || user.email}</Typography>
          <Typography variant="caption" component="div">{user.email}</Typography><Typography variant="caption">Cuenta actual</Typography></Box>
      </Stack><Divider />
      {accounts.filter(account => !isCurrent(account)).map(account => <MenuItem key={account.id} onClick={() => {
        setAnchor(null); void loginWithGoogle(account.email).catch(error => onError(error.message || 'No se pudo cambiar de cuenta.'));
      }}><Stack direction="row" alignItems="center" gap={1}><Avatar src={account.avatar || undefined} sx={{ width: 32, height: 32 }} />
        <Box><Typography variant="body2">{account.nombre}</Typography><Typography variant="caption">{account.email}</Typography></Box>
      </Stack></MenuItem>)}
      <Divider /><MenuItem onClick={() => { setAnchor(null); void logout().catch(error => onError(error.message)); }}>Cerrar sesión</MenuItem>
    </Menu>
  </Box>;
}

'use client';

import React from 'react';
import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Typography,
    useTheme,
    useMediaQuery,
    Chip,
    Stack,
    Button,
} from '@mui/material';
import Link from 'next/link';
import type { Personal } from '@/types/personal';

const PersonalCard: React.FC<Personal> = ({ id, displayName, memo, user, especialidades }) => {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up('lg'));

    const resumen = memo
        ? memo.replace(/<[^>]*>?/gm, '').slice(0, isMdUp ? 150 : 80)
        : 'Sin reseña disponible.';

    const imagenFinal =
        user?.foto && user.foto.trim() !== ''
            ? user.foto
            : process.env.NEXT_PUBLIC_DEFAULT_IMG_URL;

    return (
        <Card
            component="article"
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                boxSizing: 'border-box',
                alignItems: 'stretch',
                width: 'auto',
                mb: 3,
                mx: { xs: 1, sm: 2 },
                boxShadow: 4,
                borderRadius: 3,
            }}
        >
            <Box
                sx={{
                    width: { xs: '100%', sm: '40%' },
                    maxWidth: '300px',
                    overflow: 'hidden',
                }}
            >
                <CardMedia
                    component="img"
                    image={imagenFinal}
                    alt={`Foto de ${displayName}`}
                    sx={{
                        width: '100%',
                        height: '100%',
                        aspectRatio: '4/3',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
            </Box>

            <CardContent
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                <Box>
                    <Typography
                        variant="h2"
                        component="h3"
                        sx={{
                            fontSize: '1.3rem',
                            color: 'text.secondary',
                            fontWeight: 'bold',
                            mb: 1,
                        }}
                    >
                        {displayName}
                    </Typography>

                    <Typography
                        component="p"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        {resumen}
                        {memo && memo.length > resumen.length && '...'}
                    </Typography>

                    {especialidades?.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                            {especialidades.map((esp) => (
                                <Chip
                                    key={esp.id}
                                    label={esp.tituloComercial}
                                    size="small"
                                    sx={{ mb: 0.5 }}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>

                {/* ✅ Botón Ver más */}
                <Box textAlign="right">
                    <Link href={`/nosotros/personal/${id}`}>
                        <Button variant="outlined" size="small">
                            Ver más
                        </Button>
                    </Link>
                </Box>
            </CardContent>
        </Card>
    );
};

export default PersonalCard;

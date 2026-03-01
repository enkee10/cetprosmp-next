'use client';

import { useState } from 'react';
import { Box, Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Image from 'next/image';

interface VideoGalleryProps {
    videos: string[];
}

export default function VideoGallery({ videos }: VideoGalleryProps) {
    const [open, setOpen] = useState(false);
    const [videoId, setVideoId] = useState<string | null>(null);

    const handleOpen = (url: string) => {
        const id = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
        if (id) {
            setVideoId(id);
            setOpen(true);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setVideoId(null);
    };

    return (
        <>
            {videos.map((url, i) => {
                const id = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
                const thumb = id
                    ? `https://img.youtube.com/vi/${id}/0.jpg`
                    : process.env.NEXT_PUBLIC_DEFAULT_IMG_URL!;

                return (
                    <Box
                        key={`video-thumb-${i}`}
                        sx={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: { xs: '16 / 9', md: '4 / 3' },
                            mb: 2,
                            cursor: 'pointer',
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: 3,
                        }}
                        onClick={() => handleOpen(url)}
                    >
                        <>
                            <Image
                                src={thumb}
                                alt={`Video ${i + 1}`}
                                fill
                                style={{ objectFit: 'cover' }}
                                sizes="100vw"
                                priority={i === 0}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '50%',
                                    width: 64,
                                    height: 64,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 3,
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-block',
                                        width: 0,
                                        height: 0,
                                        borderTop: '18px solid transparent',
                                        borderBottom: '18px solid transparent',
                                        borderLeft: '28px solid black',
                                        ml: '4px',
                                    }}
                                />
                            </Box>

                        </>

                    </Box>
                );
            })}

            <Modal open={open} onClose={handleClose}>
                <Box
                    sx={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '95%',
                        maxWidth: 1000,
                        height: { xs: '60vh', sm: '70vh', md: '75vh', lg: '80vh' },
                        bgcolor: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        p: 0,
                        outline: 'none',
                    }}
                >
                    <IconButton
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                        }}
                    >
                        <CloseIcon sx={{ color: 'black' }} />
                    </IconButton>

                    {videoId && (
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ border: 0, borderRadius: '8px', width: '100%', height: '100%' }}
                        ></iframe>
                    )}
                </Box>
            </Modal>
        </>
    );
}

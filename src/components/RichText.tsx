'use client';

import React from 'react';
import { Typography, Box, Link as MuiLink, SxProps, Theme } from '@mui/material';

type RichTextNode = {
  type?: string;
  text?: string;
  children?: RichTextNode[];
  url?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  format?: 'ordered' | 'unordered' | string; // para listas tipo Strapi blocks
  level?: number; // para heading genérico
  [key: string]: any;
};

interface Props {
  content?: RichTextNode[];
  sx?: SxProps<Theme>;
  className?: string;
}

const RichText: React.FC<Props> = ({ content = [], sx, className }) => {
  const renderNode = (node: RichTextNode, index: number): React.ReactNode => {
    const key = `node-${index}`;

    // NODO DE TEXTO
    if (node.type === 'text' || (!node.type && typeof node.text === 'string')) {
      const text = node.text ?? '';
      if (!text.trim()) return null;

      let styled: React.ReactNode = text;
      if (node.bold) styled = <strong>{styled}</strong>;
      if (node.italic) styled = <em>{styled}</em>;
      if (node.underline) styled = <u>{styled}</u>;
      if (node.code) styled = <code>{styled}</code>;

      return <React.Fragment key={key}>{styled}</React.Fragment>;
    }

    const children = (node.children || []).map((child, i) => renderNode(child, i));

    switch (node.type) {
      // PÁRRAFOS
      case 'paragraph':
        return (
          <Typography key={key} component="p" paragraph>
            {children}
          </Typography>
        );

      // HEADINGS específicos
      case 'heading-one':
        return (
          <Typography key={key} variant="h4" component="h1" gutterBottom>
            {children}
          </Typography>
        );
      case 'heading-two':
        return (
          <Typography key={key} variant="h5" component="h2" gutterBottom>
            {children}
          </Typography>
        );
      case 'heading-three':
        return (
          <Typography key={key} variant="h6" component="h3" gutterBottom>
            {children}
          </Typography>
        );

      // HEADINGS genérico (heading + level)
      case 'heading': {
        const lvl = Math.min(Math.max(Number(node.level) || 1, 1), 6);
        // Mapea a variantes MUI cómodas
        const variantMap: Record<number, 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2'> = {
          1: 'h3',
          2: 'h4',
          3: 'h5',
          4: 'h6',
          5: 'subtitle1',
          6: 'subtitle2',
        };
        // Mapea a elementos HTML válidos para `component` (React.ElementType)
        const componentMap: Record<number, React.ElementType> = {
          1: 'h1',
          2: 'h2',
          3: 'h3',
          4: 'h4',
          5: 'h5',
          6: 'h6',
        };

        return (
          <Typography
            key={key}
            variant={variantMap[lvl]}
            component={componentMap[lvl]}
            gutterBottom
          >
            {children}
          </Typography>
        );
      }

      // LISTAS (Strapi blocks: type='list' + format)
      case 'list': {
        const isOrdered = node.format === 'ordered';
        return (
          <Box key={key} component={isOrdered ? 'ol' : 'ul'} sx={{ pl: 3, m: 0 }}>
            {children}
          </Box>
        );
      }

      // Alias comunes para listas
      case 'bulleted-list':
      case 'ul':
        return (
          <Box key={key} component="ul" sx={{ pl: 3, m: 0 }}>
            {children}
          </Box>
        );
      case 'numbered-list':
      case 'ordered-list':
      case 'ol':
        return (
          <Box key={key} component="ol" sx={{ pl: 3, m: 0 }}>
            {children}
          </Box>
        );

      // ÍTEM DE LISTA (sin hanging indent para que no sobresalga la primera línea)
      case 'list-item':
      case 'listItem':
        return (
          <Box
            key={key}
            component="li"
            sx={{
              listStylePosition: 'outside',
              mb: '0.5rem',
              lineHeight: 1.6,
            }}
          >
            {children}
          </Box>
        );

      // CITA
      case 'quote':
        return (
          <Typography
            key={key}
            component="blockquote"
            sx={{ fontStyle: 'italic', borderLeft: '4px solid #ccc', pl: 2, my: 2 }}
          >
            {children}
          </Typography>
        );

      // ENLACE
      case 'link':
        return (
          <MuiLink key={key} href={node.url} target="_blank" rel="noopener noreferrer">
            {children}
          </MuiLink>
        );

      // CÓDIGO
      case 'code-block':
      case 'code':
        return (
          <Box key={key} component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, my: 2, overflowX: 'auto' }}>
            <code>{children}</code>
          </Box>
        );

      // FALLBACK
      default:
        return <React.Fragment key={key}>{children}</React.Fragment>;
    }
  };

  return (
    <Box sx={sx} className={className}>
      {content.map((node, index) => renderNode(node, index))}
    </Box>
  );
};

export default RichText;

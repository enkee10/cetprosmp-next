// src/app/(aplicacion)/modulos/layout.tsx
import { metadata } from './metadata';

export { metadata };

export default function ModuloesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

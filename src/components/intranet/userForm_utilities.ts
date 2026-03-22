import { UseFormSetValue } from 'react-hook-form';

const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const generateUsername = (
  nombre: string,
  apellido_paterno: string,
  setValue: UseFormSetValue<any>
) => {
  const nombrePart = nombre ? nombre.trim().split(/\s+/)[0] || '' : '';
  const apellidoPart = apellido_paterno ? apellido_paterno.trim() : '';

  const username = capitalizeWords(`${nombrePart} ${apellidoPart}`.trim());
    
  setValue('username', username, { shouldValidate: true });
};

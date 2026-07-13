const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const generateUserNames = (
  nombre: string | undefined,
  apellido_paterno: string | undefined,
  apellido_materno: string | undefined,
  setValue: (name: 'username' | 'nickName', value: string, options?: { shouldValidate?: boolean }) => void
) => {
  const nombrePart = nombre ? nombre.trim().split(/\s+/)[0] || '' : '';
  const apellidoPart = apellido_paterno ? apellido_paterno.trim() : '';
  const apellidoMaternoPart = apellido_materno ? apellido_materno.trim() : '';
  const fullName = capitalizeWords([nombre, apellido_paterno, apellido_materno].filter(Boolean).join(' '));
  const nickName = capitalizeWords(`${nombrePart} ${apellidoPart}`.trim());

  setValue('username', fullName, { shouldValidate: true });
  setValue('nickName', nickName || fullName || apellidoMaternoPart, { shouldValidate: true });
};

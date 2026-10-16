type PartePerson = { id: number; user?: { rol?: { titulo?: string | null } | null } | null };
type ParteSemester = { coordinador1Id?: number | null; coordinador2Id?: number | null };

/** Semester assignments also cover coordinators who use a separate teacher account. */
export function isParteCoordinator(person: PartePerson | null | undefined, semester?: ParteSemester | null) {
  if (!person) return false;
  return person.id === semester?.coordinador1Id || person.id === semester?.coordinador2Id
    || /^coordinador(?:a)?$/i.test(person.user?.rol?.titulo?.trim() ?? '');
}

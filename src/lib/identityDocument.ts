export * from '../../functions/src/shared/identityDocument';
import { validateManualStudent as validateStudent, type IdentityStudentData } from '../../functions/src/shared/identityDocument';
import { dayInAppTimeZone } from './dateOnly';

export const validateManualStudent = (data: IdentityStudentData, required = true) =>
  validateStudent(data, required, dayInAppTimeZone());

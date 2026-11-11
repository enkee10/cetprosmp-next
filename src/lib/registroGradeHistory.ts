import type { GradeChange } from './registroGradeQueue';

type GradeEdit = { before: GradeChange; after: GradeChange };
type GradeOperation<Location> = { edits: GradeEdit[]; location?: Location };

/** Stores changed cells only; consecutive typing in one cell is one operation. */
export class RegistroGradeHistory<Location = undefined> {
  private past: GradeOperation<Location>[] = [];
  private future: GradeOperation<Location>[] = [];
  private editingKey: string | undefined;

  record(edits: GradeEdit[], editingKey?: string, location?: Location) {
    const changes = edits.filter(edit => edit.before.value !== edit.after.value);
    if (!changes.length) {
      if (!editingKey) this.endEdit();
      return;
    }
    this.future = [];
    const previous = this.past.at(-1);
    if (editingKey && this.editingKey === editingKey && previous?.edits.length === 1 && changes.length === 1) {
      const combined = { before: previous.edits[0].before, after: changes[0].after };
      if (combined.before.value === combined.after.value) {
        this.past.pop();
        this.endEdit();
        return;
      }
      previous.edits = [combined];
    } else {
      this.past.push({ edits: changes, location });
      if (this.past.length > 20) this.past.shift();
    }
    this.editingKey = editingKey;
  }

  endEdit() { this.editingKey = undefined; }

  undo(): { changes: GradeChange[]; location?: Location } | null {
    this.endEdit();
    const operation = this.past.pop();
    if (!operation) return null;
    this.future.push(operation);
    return { changes: operation.edits.map(edit => edit.before), location: operation.location };
  }

  redo(): { changes: GradeChange[]; location?: Location } | null {
    this.endEdit();
    const operation = this.future.pop();
    if (!operation) return null;
    this.past.push(operation);
    return { changes: operation.edits.map(edit => edit.after), location: operation.location };
  }

  clear() {
    this.past = [];
    this.future = [];
    this.endEdit();
  }
}

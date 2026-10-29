interface ModulePlan { id: number; planId?: number | null }
interface PlanModule { planId: number; moduloId: number }

/** A saved selection alone does not mean a plan was taught in that semester. */
export function usedSemesterPlanIds(modules: ModulePlan[], relations: PlanModule[], taughtModules: Array<{ moduloId: number }>): Set<number> {
  const usedModules = new Set(taughtModules.map(row => row.moduloId));
  const result = new Set<number>();
  for (const module of modules) {
    if (!usedModules.has(module.id)) continue;
    if (module.planId) result.add(module.planId);
    else for (const relation of relations) if (relation.moduloId === module.id) result.add(relation.planId);
  }
  return result;
}

export function modulesForPlans<T extends ModulePlan>(modules: T[], relations: PlanModule[], plans: Set<number>): T[] {
  const related = new Set(relations.filter(row => plans.has(row.planId)).map(row => row.moduloId));
  return modules.filter(module => (module.planId != null && plans.has(module.planId)) || related.has(module.id));
}

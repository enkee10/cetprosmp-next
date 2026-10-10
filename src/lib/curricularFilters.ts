export interface CurricularPlan {
  id?: number | null;
  planEstudio?: string | null;
  tituloComercial?: string | null;
  anio?: number | null;
  version?: { titulo?: string | null } | null;
  periodoVigencia?: { titulo?: string | null } | null;
  carrera?: {
    id?: number | null;
    nombre?: string | null;
    tituloComercial?: string | null;
    especialidad?: {
      id?: number | null;
      titulo?: string | null;
      tituloComercial?: string | null;
      orden?: number | null;
    } | null;
    actEconomica?: { familia?: { id?: number | null; titulo?: string | null } | null } | null;
  } | null;
}

export interface CurricularModule {
  id: number;
  orden?: number | null;
  planId?: number | null;
  plan?: CurricularPlan | null;
  planIds?: number[];
  planModuloId?: number | null;
  planModulos?: Array<{ id: number; planId: number; orden?: number | null; plan?: CurricularPlan | null }>;
}

export interface CurricularPlanOption {
  key: string;
  label: string;
  year: number;
  planIds: number[];
}

export interface CurricularCareerOption {
  key: string;
  label: string;
  planKey: string;
  planLabel: string;
  semester: string;
  year: number;
  order: number;
  planIds: number[];
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function planLabel(plan: CurricularPlan) {
  return (plan.planEstudio?.trim() || plan.tituloComercial?.trim() || 'Sin plan de estudios').replace(/\s+/g, ' ');
}

function planYear(plan: CurricularPlan) {
  return plan.anio ?? Math.max(0, ...(planLabel(plan).match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number));
}

function semesterName(plan: CurricularPlan) {
  const value = plan.version?.titulo?.trim() || plan.periodoVigencia?.titulo?.trim() || planLabel(plan);
  const match = value.match(/\b((?:19|20)\d{2})\s*[-/]\s*([12])\b/);
  return match ? `${match[1]}-${match[2]}` : value;
}

export function shortCurricularSemester(value: string) {
  return value.replace(/\b(?:19|20)(\d{2})(?=\s*[-/]\s*[12]\b|\b)/g, '$1');
}

function comparePlans(a: CurricularPlan, b: CurricularPlan) {
  return planYear(b) - planYear(a)
    || planLabel(b).localeCompare(planLabel(a), 'es', { numeric: true })
    || (a.carrera?.especialidad?.orden ?? Infinity) - (b.carrera?.especialidad?.orden ?? Infinity)
    || (a.id ?? 0) - (b.id ?? 0);
}

export function curricularTitle(value?: string | null) {
  return (value?.trim() || 'Programación Curricular').replace(/Estructura Acad[eé]mica/gi, 'Programación Curricular');
}

export function curricularPlanCatalog(plans: CurricularPlan[], modules: CurricularModule[]) {
  const catalog = new Map<number, CurricularPlan>();
  for (const item of modules) {
    if (item.planId || item.plan?.id) {
      const id = item.planId ?? item.plan!.id!;
      catalog.set(id, { ...item.plan, id });
    }
    for (const relation of item.planModulos ?? []) {
      catalog.set(relation.planId, { ...relation.plan, id: relation.planId });
    }
  }
  for (const plan of plans) if (plan.id) catalog.set(plan.id, plan);
  return [...catalog.values()].sort(comparePlans);
}

export function curricularPlanOptions(plans: CurricularPlan[]): CurricularPlanOption[] {
  const groups = new Map<string, CurricularPlanOption>();
  for (const plan of plans) {
    if (!plan.id) continue;
    const label = planLabel(plan);
    const key = `plan:${normalized(label)}`;
    const option = groups.get(key) ?? { key, label, year: planYear(plan), planIds: [] };
    option.year = Math.max(option.year, planYear(plan));
    if (!option.planIds.includes(plan.id)) option.planIds.push(plan.id);
    groups.set(key, option);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year || b.label.localeCompare(a.label, 'es', { numeric: true }));
}

export function nextCurricularPlanSelection(previous: string[], next: string[]) {
  if (next.includes('all') && !previous.includes('all')) return ['all'];
  const selected = [...new Set(next.filter(value => value !== 'all'))];
  return selected.length ? selected : ['all'];
}

export function curricularCareerOptions(plans: CurricularPlan[], selectedPlans: string[]): CurricularCareerOption[] {
  const groups = new Map<string, CurricularCareerOption>();
  for (const plan of plans) {
    if (!plan.id || !plan.carrera?.id) continue;
    const label = planLabel(plan);
    const planKey = `plan:${normalized(label)}`;
    if (!selectedPlans.includes('all') && !selectedPlans.includes(planKey)) continue;
    const semester = semesterName(plan);
    const key = `${planKey}:carrera:${plan.carrera.id}:semestre:${normalized(semester)}`;
    const option = groups.get(key) ?? {
      key, label: plan.carrera.tituloComercial || plan.carrera.nombre || `Carrera ${plan.carrera.id}`,
      planKey, planLabel: label, semester: shortCurricularSemester(semester),
      year: planYear(plan), order: plan.carrera.especialidad?.orden ?? Infinity,
      planIds: [],
    };
    option.year = Math.max(option.year, planYear(plan));
    if (!option.planIds.includes(plan.id)) option.planIds.push(plan.id);
    groups.set(key, option);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year
    || b.planLabel.localeCompare(a.planLabel, 'es', { numeric: true })
    || a.order - b.order || a.label.localeCompare(b.label, 'es', { numeric: true }));
}

export function filterCurricularModules<T extends CurricularModule>(
  modules: T[], plans: CurricularPlan[], selectedPlans: string[], selectedCareer: CurricularCareerOption | null,
): T[] {
  const allowed = new Set(selectedCareer ? selectedCareer.planIds
    : curricularPlanOptions(plans).filter(option => selectedPlans.includes('all') || selectedPlans.includes(option.key)).flatMap(option => option.planIds));
  const byId = new Map(plans.map(plan => [plan.id, plan]));
  return modules.flatMap(module => {
    const ids = [...new Set([...(module.planIds ?? []), ...(module.planModulos ?? []).map(item => item.planId),
      module.planId ?? module.plan?.id].filter((id): id is number => Boolean(id)))];
    const matching = ids.filter(id => allowed.has(id)).map(id => byId.get(id)).filter((plan): plan is CurricularPlan => Boolean(plan)).sort(comparePlans);
    if (!matching.length) return selectedPlans.includes('all') && !selectedCareer && !ids.length ? [module] : [];
    const plan = matching[0];
    const relation = module.planModulos?.find(item => item.planId === plan.id);
    return [{ ...module, planId: plan.id, plan,
      planModuloId: relation?.id ?? (module.planId === plan.id ? module.planModuloId : null),
      orden: relation?.orden ?? module.orden } as T];
  }).sort((a, b) => comparePlans(a.plan ?? {}, b.plan ?? {}) || (a.orden ?? Infinity) - (b.orden ?? Infinity) || a.id - b.id);
}

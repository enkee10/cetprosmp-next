'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';
import type { AcademicFieldConfig } from '@/components/intranet/academico/AcademicEntityForm';

const fields: AcademicFieldConfig[] = [
  { name: 'nombre', label: 'Nombre de la competencia', type: 'textarea', required: true },
  { name: 'moduloId', label: 'Modulo', type: 'select', required: true, optionValueType: 'number',
    optionsCallableName: 'listCompetenciaFormularioOpciones', optionsRowsKey: 'modulos', optionLabelField: 'etiqueta' },
  { name: 'tipo', label: 'Tipo de competencia', type: 'select', required: true,
    optionsCallableName: 'listCompetenciaFormularioOpciones', optionsRowsKey: 'tipos', optionValueField: 'valor', optionLabelField: 'etiqueta',
    optionFilters: [{ optionField: 'moduloId', formField: 'moduloId' }] },
  { name: 'unidadIds', label: 'Unidades didacticas', type: 'multi-select',
    optionsCallableName: 'listCompetenciaFormularioOpciones', optionsRowsKey: 'unidades', optionLabelField: 'etiqueta',
    optionFilters: [{ optionField: 'moduloId', formField: 'moduloId' }, { optionField: 'tipo', formField: 'tipo' }] },
];

const columns = [
  { field: 'nombre', headerName: 'Competencia', flex: 2, minWidth: 280 },
  { field: 'tipoNombre', headerName: 'Tipo', flex: 0.7, minWidth: 150 },
  { field: 'moduloNombre', headerName: 'Modulo', flex: 1, minWidth: 220 },
  { field: 'unidadIds', headerName: 'Unidades didacticas', minWidth: 150 },
];

export default function CompetenciasPage() {
  return <AcademicCrudPage rowsKey="competencias" entityKey="competencia" entityLabel="Competencia"
    entityPluralLabel="Competencias" title="Gestion de Competencias" createLabel="Crear Competencia"
    listCallableName="listCompetencias" getCallableName="getCompetencia" saveCallableName="createOrUpdateCompetencia"
    deleteCallableName="deleteCompetencia" fields={fields} columns={columns} labelField="nombre" modalMaxWidth={800} />;
}

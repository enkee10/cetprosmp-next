process.env.DATA_CONNECT_EMULATOR_HOST = '127.0.0.1:9399';
process.env.GCLOUD_PROJECT = 'cetprosmp-2026';
const { initializeApp } = require('firebase-admin/app');
const { getDataConnect } = require('firebase-admin/data-connect');
const config = { connector: 'default', serviceId: 'cetprosmp-2026-service', location: 'us-central1' };
const dc = getDataConnect(config, initializeApp({ projectId: 'cetprosmp-2026' }));

const checks = [
  `query ValidateCurricularTree {
    competenciaContinuaciones(limit:10) { id competenciaId planModuloId competencia { id nombre tipo moduloId orden } planModulo { id planId moduloId orden } }
    competenciaUnidadesDidacticas(limit:10) { id orden unidadDidacticaId competenciaId competenciaContinuacionId competencia { id nombre tipo moduloId } competenciaContinuacion { id planModulo { id planId moduloId orden } } }
  }`,
  `query ValidateModuloContext($id:Int!) {
    competenciaContinuaciones(where:{planModulo:{moduloId:{eq:$id}}},limit:10) { id competencia { id nombre tipo moduloId orden } }
    originals:competenciaUnidadesDidacticas(where:{competencia:{moduloId:{eq:$id}},competenciaContinuacionId:{isNull:true}},limit:10) { id }
    continuations:competenciaUnidadesDidacticas(where:{competenciaContinuacion:{planModulo:{moduloId:{eq:$id}}}},limit:10) { id competenciaContinuacion { planModulo { moduloId } } }
  }`,
  `query ValidateContinuationContext($planModuloId:Int!,$competenciaId:Int!) {
    target:planModulo(id:$planModuloId) { id planId moduloId orden }
    competencia(id:$competenciaId) { id moduloId }
    continuaciones:competenciaContinuaciones(limit:10) { id competenciaId planModuloId competencia { id nombre tipo moduloId orden } planModulo { id planId moduloId orden } }
  }`,
  `query ValidateEffectiveModule($id:Int!) {
    competenciaUnidadesDidacticas(where:{_or:[
      {competencia:{moduloId:{eq:$id}},competenciaContinuacionId:{isNull:true}},
      {competenciaContinuacion:{planModulo:{moduloId:{eq:$id}}}}
    ]},limit:10) {
      id orden competenciaId competenciaContinuacionId unidadDidacticaId
      competencia { id nombre tipo moduloId }
      competenciaContinuacion { planModulo { moduloId } }
    }
  }`,
  `query ValidateEffectiveModules($ids:[Int!]!) {
    competenciaUnidadesDidacticas(where:{_or:[
      {competencia:{moduloId:{in:$ids}},competenciaContinuacionId:{isNull:true}},
      {competenciaContinuacion:{planModulo:{moduloId:{in:$ids}}}}
    ]},limit:10) {
      competencia { moduloId }
      competenciaContinuacion { planModulo { moduloId } }
      unidadDidactica { id nombre }
    }
  }`,
  `mutation ValidateEffectiveOwnerGuard($ids:[Int!]!) @transaction {
    query {
      owners:competenciaUnidadesDidacticas(where:{unidadDidacticaId:{in:$ids}},limit:3)
        @check(expr:"this.all(o, (o.competenciaContinuacion == null ? o.competencia.moduloId : o.competenciaContinuacion.planModulo.moduloId) > 0)",message:"Modulo efectivo invalido.") {
        unidadDidacticaId competencia { moduloId } competenciaContinuacion { planModulo { moduloId } }
      }
    }
  }`,
];

(async () => {
  await dc.executeGraphql(checks[0]);
  await dc.executeGraphql(checks[1], { variables: { id: 1 } });
  await dc.executeGraphql(checks[2], { variables: { planModuloId: 1, competenciaId: 1 } });
  await dc.executeGraphql(checks[3], { variables: { id: 1 } });
  await dc.executeGraphql(checks[4], { variables: { ids: [1] } });
  await dc.executeGraphql(checks[5], { variables: { ids: [-1] } });
  console.log('Consultas de continuaciones validadas en Data Connect.');
})().catch(error => { console.error(error); process.exitCode = 1; });

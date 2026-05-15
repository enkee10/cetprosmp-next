const { queryRef, executeQuery, validateArgsWithOptions, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'cetprosmp-2026-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const listModulosTitulosRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListModulosTitulos');
}
listModulosTitulosRef.operationName = 'ListModulosTitulos';
exports.listModulosTitulosRef = listModulosTitulosRef;

exports.listModulosTitulos = function listModulosTitulos(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listModulosTitulosRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const { validateAdminArgs } = require('firebase-admin/data-connect');

const connectorConfig = {
  connector: 'default',
  serviceId: 'cetprosmp-2026-service',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

function listPermisos(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListPermisos', undefined, inputOpts);
}
exports.listPermisos = listPermisos;

function getPermisoById(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetPermisoById', inputVars, inputOpts);
}
exports.getPermisoById = getPermisoById;

function listUsers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListUsers', undefined, inputOpts);
}
exports.listUsers = listUsers;

function getUserByDocumentId(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetUserByDocumentId', inputVars, inputOpts);
}
exports.getUserByDocumentId = getUserByDocumentId;


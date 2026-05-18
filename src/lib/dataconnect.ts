'use client';

import { FirebaseApp } from 'firebase/app';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

let emulatorConnected = false;

const shouldUseEmulator = () => {
  if (process.env.NEXT_PUBLIC_USE_DATACONNECT_EMULATOR) {
    return process.env.NEXT_PUBLIC_USE_DATACONNECT_EMULATOR === 'true';
  }

  return process.env.NODE_ENV !== 'production';
};

export const getClientDataConnect = (app: FirebaseApp) => {
  const dataConnect = getDataConnect(app, connectorConfig);

  if (shouldUseEmulator() && !emulatorConnected) {
    const host = process.env.NEXT_PUBLIC_DATACONNECT_EMULATOR_HOST || '127.0.0.1';
    const port = Number(process.env.NEXT_PUBLIC_DATACONNECT_EMULATOR_PORT || '9399');
    connectDataConnectEmulator(dataConnect, host, port);
    emulatorConnected = true;
  }

  return dataConnect;
};

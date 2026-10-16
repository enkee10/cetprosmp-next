import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const toolsRoot=process.argv.includes('--tools-root')?process.argv[process.argv.indexOf('--tools-root')+1]:'tmp/cloudsql-tools';
const require=createRequire(path.resolve(toolsRoot,'package.json'));
const {Connector,AuthTypes,IpAddressTypes}=require('@google-cloud/cloud-sql-connector');
const {Pool}=require('pg');
const connector=new Connector();let pool,client;
try{
  const options=await connector.getOptions({instanceConnectionName:'cetprosmp-2026:us-central1:cetprosmp-2026-instance',authType:AuthTypes.IAM,ipType:IpAddressTypes.PUBLIC});
  pool=new Pool({...options,user:'enkee03@cetprosmp.edu.pe',database:'cetprosmp-db',max:1,connectionTimeoutMillis:30000});
  pool.on('error',e=>{if(e.code!=='ERRCLOSED')console.error(e.message);});
  client=await pool.connect();
  const before=(await client.query('SELECT count(*)::int AS registros FROM public.parte_diario_registros')).rows[0].registros;
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='60s'");
  if(process.argv.includes('--apply'))await client.query(fs.readFileSync(new URL('../dataconnect/migrations/20261016_add_parte_compromisos.sql',import.meta.url),'utf8'));
  const column=(await client.query("SELECT data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='parte_diario_registros' AND column_name='compromisos'")).rows[0];
  assert.equal(column?.data_type,'jsonb');assert.equal(column?.is_nullable,'YES');
  await client.query('COMMIT');
  const after=(await client.query('SELECT count(*)::int AS registros FROM public.parte_diario_registros')).rows[0].registros;
  console.log(JSON.stringify({aplicada:process.argv.includes('--apply'),campo:'compromisos',tipo:column.data_type,nullable:true,registrosAntes:before,registrosDespues:after}));
}catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});throw e;}
finally{client?.release();await pool?.end();connector.close();}

'use client';
import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import SignaturePad from './SignaturePad';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
export default function ParteSignatureDialog({initialValue,onClose,onAccept,saving}:{initialValue:string|null;onClose:()=>void;onAccept:(firma:string)=>Promise<void>;saving:boolean}){
 const [firma,setFirma]=useState(initialValue),[error,setError]=useState('');
 const accept=async()=>{try{setError('');await onAccept(firma!);}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el parte.');}};
 return <Dialog open maxWidth="sm" fullWidth onClose={()=>{if(!saving)onClose();}} aria-labelledby="parte-signature-title"><DialogTitle id="parte-signature-title">Firmar parte diario</DialogTitle><DialogContent>{error&&<AutoDismissAlert severity="error">{error}</AutoDismissAlert>}<SignaturePad initialValue={initialValue} onChange={setFirma} disabled={saving}/></DialogContent><DialogActions><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={saving||!firma} onClick={()=>void accept()}>{saving?'Guardando…':'Aceptar'}</Button></DialogActions></Dialog>;
}

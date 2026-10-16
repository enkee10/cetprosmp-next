const key=(recordId:number,commitmentId:string)=>`cetprosmp.parte-diario.comentario.v1:${recordId}:${commitmentId}`;
export function readParteCommentDraft(storage:Storage,recordId:number,commitmentId:string){
  return storage.getItem(key(recordId,commitmentId))??'';
}
export function writeParteCommentDraft(storage:Storage,recordId:number,commitmentId:string,text:string){
  if(text.trim())storage.setItem(key(recordId,commitmentId),text);
  else storage.removeItem(key(recordId,commitmentId));
}
export function clearParteCommentDraft(storage:Storage,recordId:number,commitmentId:string){
  storage.removeItem(key(recordId,commitmentId));
}

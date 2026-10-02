import {getApp} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {getAuth,signInWithCustomToken,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';

const auth=()=>getAuth(getApp());
const call=async(name,data)=>(await httpsCallable(getFunctions(getApp(),'asia-northeast3'),name)(data)).data;
function ready(){
  return new Promise((resolve,reject)=>{let stop=()=>{};stop=onAuthStateChanged(auth(),u=>{stop();resolve(u);},reject);});
}
async function accept(data){
  if(!data?.token||!data.accountUid||!Number.isSafeInteger(data.studentNum)||data.studentNum<1)throw new Error('로그인 응답을 확인하지 못했어요. 다시 시도해주세요.');
  await signInWithCustomToken(auth(),data.token);
  const {token,...session}=data;return session;
}
export async function studentSignIn(roomId,id,pw){return accept(await call('studentLogin',{roomId,id,pw}));}
export async function changePassword(roomId,newPassword){return accept(await call('studentChangePassword',{roomId,newPassword}));}
export async function verifySession(expected){
  const user=await ready();
  const fail=()=>{throw Object.assign(new Error('학생 계정으로 다시 로그인해주세요.'),{code:'functions/unauthenticated'});};
  if(!user)fail();
  const {claims}=await user.getIdTokenResult();
  if(claims.role!=='student'||claims.roomId!==expected.roomId||claims.studentNum!==Number(expected.studentNum)||claims.accountUid!==expected.accountUid||claims.sessionVersion!==Number(expected.sessionVersion))fail();
  const data=await call('studentSession',{roomId:expected.roomId});
  if(data.accountUid!==expected.accountUid||data.sessionVersion!==Number(expected.sessionVersion))fail();
  return data;
}
export async function saveAccounts(roomId,accounts,expectedUpdatedAt){return call('saveStudentAccounts',{roomId,accounts,expectedUpdatedAt});}
export async function migrateWriting(roomId,writingId){return call('migrateStudentWriting',{roomId,writingId});}

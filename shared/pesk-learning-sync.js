/* Bounded contention retries. Each retry rereads server state and retains the same
   question/attack identity. Never race an unfinished write against a UI timeout. */
(function(root){
  'use strict';
  async function run(runTransaction,db,update,{onRetry=()=>{},sleep=ms=>new Promise(r=>setTimeout(r,ms)),random=Math.random}={}){
    for(let attempt=0;attempt<4;attempt++){
      try{return await runTransaction(db,update,{maxAttempts:3});}
      catch(error){
        const code=String(error?.code||'').replace(/^firestore\//,'');
        if(code!=='aborted'||attempt===3)throw error;
        onRetry(attempt+1);
        // Different tablets leave contention at different times, not in lockstep.
        await sleep(Math.round((250+random()*650)*Math.pow(1.6,attempt)));
      }
    }
  }
  const api={run};root.PeskLearningSync=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

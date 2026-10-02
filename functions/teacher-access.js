'use strict';
// Match the Firebase Rules identity allowlist; editable user.role is never master authority.
const MASTER_EMAILS = ['asx0203@gmail.com'];
function isMaster(auth){
  return !!auth?.uid && auth.token?.email_verified === true
    && MASTER_EMAILS.includes(auth.token?.email || '');
}
function canManageRoom(auth, profile, ownerUid){
  return isMaster(auth) || (!!auth?.uid && profile?.role === 'teacher'
    && profile.approved === true && ownerUid === auth.uid);
}
module.exports = {MASTER_EMAILS,isMaster,canManageRoom};

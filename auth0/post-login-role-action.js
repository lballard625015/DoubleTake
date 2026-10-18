// Auth0 post-login Action: copies the user's role (from app_metadata) into the ID and access tokens.
// Paste into Auth0 Dashboard > Actions > Library > Build Custom (trigger: Login / Post Login), deploy, then add to the Login flow.
exports.onExecutePostLogin = async (event, api) => {
  const metadata = event.user.app_metadata || {};
  const role = metadata.role;
  if (role) {
    api.idToken.setCustomClaim('https://safeharbor.app/role', role);
    api.accessToken.setCustomClaim('https://safeharbor.app/role', role);
  }

  const accountId = metadata.accountId;
  if (typeof accountId === 'string' && accountId.trim()) {
    api.idToken.setCustomClaim('https://safeharbor.app/accountId', accountId.trim());
    api.accessToken.setCustomClaim('https://safeharbor.app/accountId', accountId.trim());
  }
};

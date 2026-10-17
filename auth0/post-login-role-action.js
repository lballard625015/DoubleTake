// Auth0 post-login Action: copies the user's role (from app_metadata) into the ID and access tokens.
// Paste into Auth0 Dashboard > Actions > Library > Build Custom (trigger: Login / Post Login), deploy, then add to the Login flow.
exports.onExecutePostLogin = async (event, api) => {
  const role = event.user.app_metadata && event.user.app_metadata.role;
  if (role) {
    api.idToken.setCustomClaim('https://safeharbor.app/role', role);
    api.accessToken.setCustomClaim('https://safeharbor.app/role', role);
  }
};

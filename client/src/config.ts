// Dashboard configuration: the protected person and Nessie account the child monitors (override via client/.env).
export const config = {
  protectedName: import.meta.env.VITE_PROTECTED_NAME || 'Margaret B.',
  protectedFirstName: (import.meta.env.VITE_PROTECTED_NAME || 'Margaret B.').split(' ')[0],
  accountId: import.meta.env.VITE_NESSIE_ACCOUNT_ID || '',
  homeLocation: {
    lat: Number(import.meta.env.VITE_HOME_LAT) || 29.6516,
    lng: Number(import.meta.env.VITE_HOME_LNG) || -82.3248,
  },
}

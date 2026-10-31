// ---------------------------------------------------------------------------
// Backend settings (values from `sam deploy` outputs of the server/ stack).
// None of these are secret: they identify your API and Cognito app client.
//
// OFFLINE MODE: set apiUrl to '' and the game behaves exactly as before the
// backend existed (local-only progress, no accounts, local-only leaderboard).
// ---------------------------------------------------------------------------

export const APP_CONFIG = {
  /**
   * Locations a guest (not signed in) may open. Only used as a fallback while the server's own list
   * hasn't loaded (or can't be reached), so the map never shows account-only locations as open.
   * The server is still the source of truth and enforces this in server/src/content.ts.
   */
  guestLocationIds: ['federal-hill'],

  apiUrl: 'https://hprn6cli18.execute-api.us-east-1.amazonaws.com',
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_MZtZaMj5L',
    clientId: '1c8u44b2ibp5l78binvrhvnli',
  },
};

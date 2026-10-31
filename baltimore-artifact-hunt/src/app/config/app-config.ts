// ---------------------------------------------------------------------------
// Backend settings (values from `sam deploy` outputs of the server/ stack).
// None of these are secret: they identify your API and Cognito app client.
//
// OFFLINE MODE: set apiUrl to '' and the game behaves exactly as before the
// backend existed (local-only progress, no accounts, local-only leaderboard).
// ---------------------------------------------------------------------------

export const APP_CONFIG = {
  apiUrl: 'https://hjkia9et96.execute-api.us-east-1.amazonaws.com',
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_yrIVBpQ4G',
    clientId: '717j94j05fudmv505q5pjkm3dp',
  },
};

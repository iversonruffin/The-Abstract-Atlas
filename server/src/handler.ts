// Lambda entry point: wires the real dependencies (DynamoDB, Cognito, crypto) into the API.

import { randomUUID } from 'node:crypto';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { createApi } from './api.js';
import { DynamoRepo } from './dynamoRepo.js';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const verifier = CognitoJwtVerifier.create({
  userPoolId: env('USER_POOL_ID'),
  clientId: env('USER_POOL_CLIENT_ID'),
  tokenUse: 'id',
});

export const handler = createApi({
  repo: new DynamoRepo(env('TABLE_NAME')),
  now: () => Date.now(),
  rand: Math.random,
  newId: () => randomUUID(),
  guestSecret: env('GUEST_TOKEN_SECRET'),
  verifyUserToken: async (token) => {
    try {
      const claims = await verifier.verify(token);
      return { sub: claims.sub, email: typeof claims['email'] === 'string' ? claims['email'] : undefined };
    } catch {
      return null;
    }
  },
});

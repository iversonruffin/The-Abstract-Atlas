// DynamoDB single-table layout
//
//   PK = PLAYER#<id>   SK = PROFILE                -> Profile
//   PK = PLAYER#<id>   SK = RESULT#<hotspotId>     -> HotspotResult (best result)
//   PK = PLAYER#<id>   SK = ATTEMPT#<hotspotId>    -> Attempt (in progress, expires after 1h)
//   PK = PLAYER#<id>   SK = LOCTOTAL#<locationId>  -> LocationTotal
//                      + GSI1PK = LB#<locationId>, GSI1SK = <padded score>#<id>   (registered players only)
//
// Leaderboard = query GSI1 for LB#<locationId>, newest-highest first. Guest items carry a
// `ttl` so abandoned guest data cleans itself up after 90 days.

import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Repo } from './repo.js';
import { Attempt, HotspotResult, LeaderboardRow, LocationTotal, Profile } from './types.js';

const GUEST_TTL_SECONDS = 90 * 24 * 60 * 60;
const ATTEMPT_TTL_SECONDS = 60 * 60;

const pk = (playerId: string) => `PLAYER#${playerId}`;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export class DynamoRepo implements Repo {
  private readonly db: DynamoDBDocumentClient;

  constructor(private readonly tableName: string, client?: DynamoDBDocumentClient) {
    this.db =
      client ??
      DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
  }

  async getProfile(playerId: string): Promise<Profile | undefined> {
    const out = await this.db.send(new GetCommand({ TableName: this.tableName, Key: { PK: pk(playerId), SK: 'PROFILE' } }));
    return out.Item ? (out.Item as unknown as Profile) : undefined;
  }

  async putProfile(profile: Profile): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { PK: pk(profile.playerId), SK: 'PROFILE', ...profile, ...(profile.isGuest ? { ttl: nowSeconds() + GUEST_TTL_SECONDS } : {}) },
      }),
    );
  }

  async getResults(playerId: string): Promise<HotspotResult[]> {
    const items = await this.queryPlayer(playerId, 'RESULT#');
    return items.map((i) => i as unknown as HotspotResult);
  }

  async putResult(playerId: string, result: HotspotResult, isGuest: boolean): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { PK: pk(playerId), SK: `RESULT#${result.hotspotId}`, ...result, ...(isGuest ? { ttl: nowSeconds() + GUEST_TTL_SECONDS } : {}) },
      }),
    );
  }

  async getAttempt(playerId: string, hotspotId: string): Promise<Attempt | undefined> {
    const out = await this.db.send(
      new GetCommand({ TableName: this.tableName, Key: { PK: pk(playerId), SK: `ATTEMPT#${hotspotId}` } }),
    );
    if (!out.Item) return undefined;
    // DynamoDB TTL deletion is lazy (can lag by hours), so also expire on read.
    if (typeof out.Item['ttl'] === 'number' && out.Item['ttl'] < nowSeconds()) return undefined;
    return out.Item as unknown as Attempt;
  }

  async putAttempt(playerId: string, attempt: Attempt): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { PK: pk(playerId), SK: `ATTEMPT#${attempt.hotspotId}`, ...attempt, ttl: nowSeconds() + ATTEMPT_TTL_SECONDS },
      }),
    );
  }

  async deleteAttempt(playerId: string, hotspotId: string): Promise<void> {
    await this.db.send(new DeleteCommand({ TableName: this.tableName, Key: { PK: pk(playerId), SK: `ATTEMPT#${hotspotId}` } }));
  }

  async getLocationTotals(playerId: string): Promise<LocationTotal[]> {
    const items = await this.queryPlayer(playerId, 'LOCTOTAL#');
    return items.map((i) => ({
      locationId: String(i['locationId']),
      playerName: String(i['playerName']),
      score: Number(i['score']),
    }));
  }

  async putLocationTotal(playerId: string, total: LocationTotal, isGuest: boolean): Promise<void> {
    const leaderboardKeys = isGuest
      ? { ttl: nowSeconds() + GUEST_TTL_SECONDS }
      : { GSI1PK: `LB#${total.locationId}`, GSI1SK: `${String(total.score).padStart(8, '0')}#${playerId}` };
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { PK: pk(playerId), SK: `LOCTOTAL#${total.locationId}`, ...total, ...leaderboardKeys },
      }),
    );
  }

  async getLeaderboard(locationId: string, limit: number): Promise<LeaderboardRow[]> {
    const out = await this.db.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': `LB#${locationId}` },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (out.Items ?? []).map((item, i) => ({
      rank: i + 1,
      playerName: String(item['playerName']),
      score: Number(item['score']),
    }));
  }

  async deletePlayer(playerId: string): Promise<void> {
    const items = await this.queryPlayer(playerId, '');
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      await this.db.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((item) => ({
              DeleteRequest: { Key: { PK: item['PK'], SK: item['SK'] } },
            })),
          },
        }),
      );
    }
  }

  /** All of a player's items whose sort key starts with `prefix` ('' = everything). */
  private async queryPlayer(playerId: string, prefix: string): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const out = await this.db.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: prefix ? 'PK = :pk AND begins_with(SK, :sk)' : 'PK = :pk',
          ExpressionAttributeValues: prefix ? { ':pk': pk(playerId), ':sk': prefix } : { ':pk': pk(playerId) },
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((out.Items ?? []) as Record<string, unknown>[]));
      lastKey = out.LastEvaluatedKey;
    } while (lastKey);
    return items;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BatchWriteCommand, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Minimal in-memory stand-in for the DynamoDB document client: just the commands DynamoRepo uses.
 * Lets tests (and the browser journey) run the REAL DynamoRepo code without AWS.
 */
export class FakeDoc {
  items = new Map<string, Record<string, any>>();
  key = (pk: string, sk: string) => `${pk}\u0000${sk}`;

  async send(cmd: unknown): Promise<any> {
    if (cmd instanceof PutCommand) {
      const item = cmd.input.Item as Record<string, any>;
      this.items.set(this.key(item['PK'], item['SK']), structuredClone(item));
      return {};
    }
    if (cmd instanceof GetCommand) {
      const k = cmd.input.Key as Record<string, any>;
      const item = this.items.get(this.key(k['PK'], k['SK']));
      return { Item: item ? structuredClone(item) : undefined };
    }
    if (cmd instanceof DeleteCommand) {
      const k = cmd.input.Key as Record<string, any>;
      this.items.delete(this.key(k['PK'], k['SK']));
      return {};
    }
    if (cmd instanceof BatchWriteCommand) {
      for (const requests of Object.values(cmd.input.RequestItems ?? {})) {
        for (const r of requests) {
          const k = r.DeleteRequest?.Key as Record<string, any>;
          this.items.delete(this.key(k['PK'], k['SK']));
        }
      }
      return {};
    }
    if (cmd instanceof QueryCommand) {
      const i = cmd.input;
      const vals = i.ExpressionAttributeValues as Record<string, any>;
      let rows = [...this.items.values()];
      if (i.IndexName === 'GSI1') {
        rows = rows.filter((r) => r['GSI1PK'] === vals[':pk']).sort((a, b) => (a['GSI1SK'] < b['GSI1SK'] ? -1 : 1));
        if (i.ScanIndexForward === false) rows.reverse();
        if (i.Limit) rows = rows.slice(0, i.Limit);
      } else {
        rows = rows.filter((r) => r['PK'] === vals[':pk'] && (!vals[':sk'] || String(r['SK']).startsWith(vals[':sk'])));
      }
      return { Items: rows.map((r) => structuredClone(r)) };
    }
    throw new Error(`FakeDoc doesn't support ${(cmd as any)?.constructor?.name}`);
  }
}

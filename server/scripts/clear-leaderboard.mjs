// Clears one location's leaderboard (e.g. Federal Hill, now that it's off the map).
//
// SAFE BY DEFAULT: without --yes it only LISTS what it would delete.
//
//   1. Find your table name (the stack name is the one you gave `sam deploy --guided`):
//        aws cloudformation describe-stack-resource --stack-name <your-stack> --logical-resource-id GameTable \
//          --query StackResourceDetail.PhysicalResourceId --output text
//   2. Look first:
//        npm run clear-board -- --table <TableName> --location federal-hill
//   3. Delete (can't be undone):
//        npm run clear-board -- --table <TableName> --location federal-hill --yes
//
// What it deletes: each player's LOCTOTAL#<location> item, which is what the leaderboard lists.
// It does NOT delete players, other locations, or anyone's badges.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const table = opt('table') ?? process.env.TABLE_NAME;
const location = opt('location');
const really = args.includes('--yes');

if (!table || !location) {
  console.error('Usage: npm run clear-board -- --table <TableName> --location <location-id> [--yes]');
  process.exit(1);
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const items = [];
let startKey;
do {
  const out = await db.send(
    new QueryCommand({
      TableName: table,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `LB#${location}` },
      ExclusiveStartKey: startKey,
    }),
  );
  items.push(...(out.Items ?? []));
  startKey = out.LastEvaluatedKey;
} while (startKey);

console.log(`${items.length} leaderboard entr${items.length === 1 ? 'y' : 'ies'} for "${location}" in ${table}:`);
for (const it of items) console.log(`  ${String(it.playerName).padEnd(24)} ${it.score} pts`);

if (!really) {
  console.log('\nNothing deleted. Run again with --yes to delete these.');
  process.exit(0);
}

for (let i = 0; i < items.length; i += 25) {
  const chunk = items.slice(i, i + 25);
  await db.send(
    new BatchWriteCommand({
      RequestItems: { [table]: chunk.map((it) => ({ DeleteRequest: { Key: { PK: it.PK, SK: it.SK } } })) },
    }),
  );
}
console.log(`\nDeleted ${items.length}. The "${location}" leaderboard is now empty.`);

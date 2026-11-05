# The Abstract Atlas – Server

Serverless backend for accounts, guest play, server-side scoring, and leaderboards.

**AWS pieces:** Cognito (accounts) · API Gateway HTTP API · one Lambda (Node 22, TypeScript) · DynamoDB (one table) · an AWS Budget that emails you if spend passes $5/month.

## Rules it enforces

- **Guests** get a guest token and can play **Federal Hill only**. Other locations return `403 LOCATION_LOCKED`.
- When a guest **completes a location**, the final answer response includes `signUpPrompt` with their badges and the locations signing up unlocks (Inner Harbor, Pigtown). This feeds the "sign up to save your badges" screen.
- **Accounts** can play every location. Locations are not GPS-gated.
- **Scoring is on the server.** Same rules as before (100 per correct answer + 10 per second left), but the server times each question, so scores can't be faked from the browser. Correct answers never leave the server, and answer choices are shuffled per run.
- **Leaderboards** show registered players only (top 10 per location, by the sum of best hotspot scores).
- **Signing up** calls `POST /account/claim` with both the new account token and the guest token. The guest's badges and scores merge into the account (best score wins, badges are unioned) and the guest profile is deleted.
- Abandoned guest data expires after 90 days.

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/guest` | Returns `guestToken`. |
| GET | `/me` | Profile, results, badges, locations. Guests also get `signUpUnlocks`. |
| PATCH | `/me` | `{ playerName }`, 2–20 characters. |
| GET | `/locations` | Locations with `accessible`, `progressPct`, `completed`. |
| POST | `/challenges/:hotspotId/start` | Returns `attemptId` and question 1. |
| POST | `/challenges/:hotspotId/answer` | `{ attemptId, choiceIndex }` (`null` on timeout). Returns feedback, then the next question or the final `result`. |
| GET | `/leaderboard/:locationId` | Public. |
| POST | `/account/claim` | Needs `Authorization` and `X-Guest-Token`. |

Auth headers: `Authorization: Bearer <Cognito ID token>` for accounts, `X-Guest-Token: <token>` for guests.

## Deploy

One-time setup:

1. Create an AWS account and turn on MFA for the root user.
2. Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), then run `aws configure` with an IAM user (not the root user).

Then:

```bash
cd server
npm install
npm test
sam build
sam deploy --guided
```

`sam deploy --guided` asks for:

- `GuestTokenSecret`: run `openssl rand -hex 32` and paste the result. Keep it somewhere safe; changing it logs every guest out.
- `AlertEmail`: where budget warnings go. Confirm the email AWS sends you.
- `AllowedOrigins`: keep the default unless your site URL differs.

The outputs give you `ApiUrl`, `UserPoolId`, and `UserPoolClientId` for the Angular app.

## Known limits (fine for now)

- The guest token secret is passed as a stack parameter, so it appears in the Lambda's environment. Move it to Secrets Manager or SSM later if you want.
- Two answers sent at the same instant could race. Harmless for a trivia game; a conditional write would fix it.
- Trivia content is duplicated in `src/content.ts` and the Angular `game-data.ts`. When you replace the placeholder questions, update both (or move the frontend to read questions only from the API).
- Leaderboard names are not profanity-filtered.

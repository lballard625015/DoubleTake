# DoubleTake

Full-stack app that protects families from scams and fraud.

- **client/**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Auth0 (`@auth0/auth0-react`), axios
- **server/**: Node.js + Express (TypeScript), Auth0 JWT validation, local rule-based alert explanations and chat, axios

## Setup

1. Copy `.env.example` to `.env` and `client/.env.example` to `client/.env`.
2. Fill in the Auth0 settings in both files, using the same audience. Add your Nessie API key to the root `.env`. Alert explanations, chat guidance, and trustee reports use local deterministic rules and do not call an AI provider. The client ID is public; never put API keys or other secrets in `client/.env`.
3. For a local role-picker demo without Auth0, set both `DEV_BYPASS_AUTH` and `VITE_DEV_BYPASS` to `true`. This bypass is development-only and is disabled in production.
4. Run the server: `cd server && npm run dev` (port 4000; loads `../.env`).
5. Run the client: `cd client && npm run dev` (port 5173, proxies `/api` to the server).

To populate demo data, configure `NESSIE_API_KEY` in the root `.env`, then run `cd server && npm run seed`. The seed script writes the generated account IDs to both `.env` files. Never commit `.env` files; only the example templates belong in Git.

### Nessie sandbox connection

In a workspace's **Settings**, enter an existing Nessie sandbox account ID and choose **Verify and link**. The app checks that the account exists before using it for balances, transactions, and alert scans. The selected ID is stored in that browser; the Nessie API key remains on the server. Nessie is a simulated-data API and does not link a real bank account.

For Auth0 deployments, set the user's `app_metadata.accountId` to the Nessie account they are authorized to view, then deploy the `auth0/post-login-role-action.js` Action. The server enforces that a Parent can only access the account ID in this Auth0 claim. The local development bypass is not an account authorization mechanism and must not be enabled in production.

## Demo walkthrough

For a local, three-role demo, set `DEV_BYPASS_AUTH=true` in the root `.env` and `VITE_DEV_BYPASS=true` in `client/.env`. Start the server and client as described above, then run `npm run seed` from `server/` to populate the Nessie demo account and create the held-transfer example.

1. Choose **Child**. The dashboard stays hidden while DoubleTake runs its initial account scan; after it completes, open an alert to review the rule and evidence that triggered it, then send a neutral family check-in. Activity includes a category breakdown of recent purchases. The Community area provides scam warning guides and reports stored only in this browser; reports are unverified and are not shared with other users.
2. Switch roles from the top banner, choose **Parent**, review purchase spending by category, and respond that the activity is recognized or ask for help reviewing it.
3. Switch to **Trustee** to see the case overview, timeline, audit log, and printable report.

The family plan, check-ins, and display preferences use this browser's local storage for the prototype; changes are shared only between roles in the same browser. The account holder can disable check-ins and hide the displayed balance. This data is not securely shared across devices or suitable for production. The local development auth bypass must never be enabled in production.

If the top banner says **Local demo · Authentication bypassed**, the client was started with `VITE_DEV_BYPASS=true`. To use Auth0, set `VITE_DEV_BYPASS=false` in `client/.env` and `DEV_BYPASS_AUTH=false` in the root `.env`, then restart both development servers. Auth0 credentials and audience must also be configured as described above.

The hosted sign-up page is served by Auth0. To remove “SafeHarbor” from its prompt, edit the signup title in **Auth0 Dashboard → Branding → Universal Login → Text Customization** and remove the `{{tenant.name}}` placeholder, for example: `Sign up to continue to {{client.name}}`. You can also update the Auth0 application's **Name** under **Applications → Applications → [your app] → Settings**. This hosted page's wording is separate from the DoubleTake website branding.

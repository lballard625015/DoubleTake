# SafeHarbor

Full-stack app that protects families from scams and fraud.

- **client/**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Auth0 (`@auth0/auth0-react`), axios
- **server/**: Node.js + Express (TypeScript), Auth0 JWT validation, Google Gemini (`@google/generative-ai`), axios

## Setup

1. Fill in the root `.env` (Auth0, Gemini, Nessie). The server loads it via `--env-file`. Copy the `VITE_*` values into `client/.env`.
2. Run the server: `cd server && npm run dev` (port 4000; loads `../.env`)
3. Run the client: `cd client && npm run dev` (port 5173, proxies `/api` to the server)

Most files are placeholders with a comment describing their intended role.

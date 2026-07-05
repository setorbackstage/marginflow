# MarginFlow OS

MarginFlow OS is an all-in-one operating system for restaurants, cafés, bars, delivery businesses, and dark kitchens.

## Prerequisites

- Node.js 20+
- pnpm 11+
- Docker & Docker Compose (for the local PostgreSQL database)

## First Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone <repository_url>
   cd Margin-Flow-OS
   \`\`\`

2. **Configure Environment:**
   Copy the example environment file to `.env` (it comes pre-configured for local dev):
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Note: `.env.local` is ignored and `prisma.config.ts` requires `.env` to operate. Use only `.env` for your local development configuration.

3. **Start the Local Database:**
   \`\`\`bash
   docker-compose up -d
   \`\`\`
   This spins up a local PostgreSQL 17 instance on port 5432 using the credentials defined in `.env`.

4. **Install Dependencies:**
   \`\`\`bash
   pnpm install
   \`\`\`

5. **Initialize Prisma & Database:**
   Generate the Prisma Client and run the migrations:
   \`\`\`bash
   pnpm prisma generate
   pnpm prisma migrate dev
   \`\`\`

6. **Seed the Database:**
   Run the seed script to create the default Organization, Store, and Users:
   \`\`\`bash
   pnpm prisma db seed
   \`\`\`

## Running Locally

Once the setup is complete, start the development server:

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

The seed script creates the following default users:

| Role    | Email                  | Password |
| ------- | ---------------------- | -------- |
| Owner   | owner@marginflow.app   | senha123 |
| Manager | manager@marginflow.app | senha123 |
| Cashier | cashier@marginflow.app | senha123 |

## Useful Commands

- `pnpm dev` - Starts the Next.js development server
- `pnpm prisma studio` - Opens the Prisma Studio GUI to view your local database
- `docker-compose stop` - Stops the local PostgreSQL database

## Troubleshooting

- **Prisma tries to connect to \`helium:5432\`**: This means you still have `.env` pointing to the old Replit host. Make sure `.env` contains \`localhost:5432\` and the correct credentials as seen in \`.env.example\`.
- **"pnpm install" fails on esbuild**: This project uses pnpm 11 which requires build approval. \`esbuild\` has been added to \`pnpm-workspace.yaml\`'s allowBuilds array, but if you run into new scripts needing approval, run \`pnpm approve-builds\`.

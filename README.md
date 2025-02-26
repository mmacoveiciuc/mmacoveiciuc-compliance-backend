# Compliance-Backend

This repo is the backend for the compliance scanner. You will also need to run the corresponding frontend. This repository makes use of a Postgres database for storing compliance logging information.

![Dashboard Image](/docs/images/architecture.png)

### Install dependencies

- Node 20.0.0

```bash
# Install deps with npm
npm run install
```

### Set up .env.local

Create a file in the root directory called .env, fill in the following:

```
DATABASE_URL="..."
```

### Set up the database

After configuring your environment file and starting the database run

```bash
npx primsa migrate dev
```

### Run the project

```bash
# Start project in dev mode
npm run watch
# Build project
npm run build
```

# QueueWise – Digital Queue & Token Management System

A full-stack academic MVP built with React, Tailwind CSS, Node.js and Express.

## Features
- Separate User and Admin views
- Digital token generation for multiple services
- Queue position and estimated waiting time
- Admin actions: Call Next, Complete and Skip
- Queue statistics and recent token history
- Automatic refresh of queue data every 4 seconds
- REST API backend
- Optional MongoDB Atlas connection configuration

## Requirements
- Node.js (LTS recommended)
- npm
- Git (for submission)

## Run locally (Windows / VS Code)

Open a terminal in the project root (`D:\QueueWise`) and run:

```bash
npm install
npm run install:all
npm run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm`, or select **Command Prompt** as the VS Code terminal profile.

Open http://localhost:5173 in Chrome.

The backend runs at http://localhost:5000.

## Demo mode
The application starts with sample services and an in-memory queue. You can demonstrate token generation and admin queue operations immediately. Queue data resets when the backend restarts.

## MongoDB
A MongoDB Atlas connection variable is included in `server/.env.example`, and a Mongoose model is provided as a starting point for persistent storage. The current demo API uses in-memory data so it can run without configuring a database. Do not claim that demo tokens are persisted to MongoDB until the persistence layer is implemented and tested.

## Main API endpoints
- `GET /api/health`
- `GET /api/services`
- `GET /api/queue`
- `POST /api/tokens`
- `PATCH /api/tokens/:id/serve`
- `PATCH /api/tokens/:id/complete`
- `PATCH /api/tokens/:id/skip`

## Suggested demo sequence
1. Open the User view and generate a token for General Enquiry.
2. Generate another token for Fee Payment.
3. Switch to Admin view.
4. Select a service and click **Call next**.
5. Mark the serving token as completed.
6. Return to User view and show the updated queue position.

## Project structure
```text
QueueWise/
├── client/       React + Vite frontend
├── server/       Express REST API
├── README.md
└── .gitignore
```

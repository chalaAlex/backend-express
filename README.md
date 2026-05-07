# backend-express

A comprehensive freight logistics backend built with Express that manages shipping requests, carrier bidding, real-time chat, and shipment lifecycle management. Freight owners post cargo and carriers bid on jobs. The system handles notifications, rating systems, and complete booking workflows.

## Key Techniques

- **[JWT-based authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)** with token verification and role-based access control using Bearer tokens in request headers
- **[Async/await error handling](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await)** using wrapper functions to catch promise rejections and centralize error handling
- **[Socket.IO for real-time communication](https://socket.io/docs/v4/)**, with personal room patterns for targeted updates and read receipts across distributed connections
- **Cascading state management** where accepting one bid automatically rejects competing bids, maintaining data consistency
- **[Mongoose query population](https://mongoosejs.com/docs/populate.html)** to fetch related documents efficiently from the database
- **Email notifications** with template-based messaging using Nodemailer for async event-driven alerts
- **Status-based workflows** tracking freights through OPEN → BIDDING → BOOKED → COMPLETED states with validation at each transition

## Technologies & Libraries

- **[Express](https://expressjs.com/)** v5.1.0 — HTTP server framework
- **[Mongoose](https://mongoosejs.com/)** v8.20.1 — MongoDB ODM with schema validation
- **[Socket.IO](https://socket.io/)** v4.8.3 — Real-time bidirectional communication
- **[jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)** v9.0.3 — JWT token generation and verification
- **[bcryptjs](https://www.npmjs.com/package/bcryptjs)** v3.0.3 — Password hashing and verification
- **[dotenv](https://www.npmjs.com/package/dotenv)** v17.2.3 — Environment variable management
- **[axios](https://axios-http.com/)** v1.13.5 — HTTP client for external APIs
- **[Nodemailer](https://nodemailer.com/)** v7.0.12 — Email delivery service
- **[@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)** v0.24.1 — Google Gemini AI integration capabilities
- **[node-cron](https://www.npmjs.com/package/node-cron)** v4.2.1 — Scheduled task execution and automation
- **[Morgan](https://www.npmjs.com/package/morgan)** v1.10.1 — HTTP request logging middleware
- **[cors](https://www.npmjs.com/package/cors)** — Cross-origin request handling
- **[validator](https://www.npmjs.com/package/validator)** v13.15.26 — Data validation and sanitization utilities

## Project Structure

```
backend-express/
├── controller/          Controllers for all domain entities
├── routes/              Route definitions for API endpoints
├── model/               Mongoose schemas for database entities
├── middleware/          Custom middleware for validation and business logic
├── services/            Business logic services for notifications and automations
├── socket/              WebSocket event handlers
├── utils/               Utility functions and helpers
├── dev-data/            Development seed data
├── tests/               Test suite
├── app.js               Express app configuration
├── server.js            HTTP server startup with Socket.IO initialization
├── package.json         Project dependencies and scripts
└── config.env           Environment variables (not in repo)
```

### Key Directories

**[controller/](controller/)** — 28 controller files implementing CRUD operations and business logic for users, carriers, freight, bidding, chat, reviews, notifications, and administrative functions. Each controller handles request validation, database operations, and response formatting.

**[model/](model/)** — 28 Mongoose schemas defining the database structure including users, carriers, freight, bids, shipment requests, reviews, chat rooms, messages, notifications, wallets, and more. Schemas include validators, relationships, and helper methods.

**[routes/](routes/)** — Route definitions mapping HTTP endpoints to controller functions. Organized by domain (users, carriers, freight, bids, chat, etc.) with separate route files for clarity and maintainability.

**[middleware/](middleware/)** — Custom middleware for review validation and duplicate prevention. Used in route handlers to enforce business rules before controller execution.

**[services/](services/)** — Business logic services that handle complex operations like notification creation and automated payment-related workflows. Services are reusable across multiple controllers.

**[socket/](socket/)** — WebSocket event handlers for real-time chat using Socket.IO. Manages message broadcasting, read receipts, and personal room routing for inbox updates.

**[utils/](utils/)** — Helper functions including custom error classes, email services, API feature utilities, and async wrapper functions that reduce boilerplate across controllers.

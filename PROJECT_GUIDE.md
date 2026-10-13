# YouTube Clone Backend — Project Guide

This project is the backend foundation for a YouTube-style application. It currently focuses on user registration and authentication, with video and subscription data models prepared for future API work. It uses Node.js, Express, MongoDB/Mongoose, JWT, Multer, and Cloudinary.

## 1. How a request moves through the project

```text
Client
  │ HTTP request, JSON/form data, cookies or Bearer token
  ▼
src/app.js ── CORS, JSON/form parsing, static files, cookies
  │
  ▼
src/routes/user.routes.js ── chooses endpoint and middleware
  │
  ├── Multer ── saves uploaded files temporarily to Public/temp
  ├── verifyJWT ── checks the access token on protected routes
  ▼
src/controllers/user.controller.js ── validates and coordinates work
  ├── Mongoose models ── reads/writes MongoDB
  ├── Cloudinary utility ── stores profile images remotely
  └── ApiResponse / ApiError ── standard response and error shapes
  │
  ▼
Client receives JSON and, where applicable, authentication cookies

Startup: src/index.js → dotenv configuration → MongoDB connection → HTTP server
```

## 2. Main files and why they exist

| File | Purpose |
| --- | --- |
| `src/index.js` | Application entry point. Loads environment variables, connects to MongoDB, then starts the Express server on `PORT` (or 8000). |
| `src/app.js` | Builds the Express app, installs CORS/body/cookie/static middleware, and mounts the user router at `/api/v1/users` and `/users`. |
| `src/db/index.js` | Connects Mongoose to `MONGODB_URI` plus the database name from `src/constants.js`. Exits when the database connection fails. |
| `src/constants.js` | Keeps the MongoDB database name (`videotube`) in one place. |
| `src/routes/user.routes.js` | Maps HTTP methods and URL paths to controller handlers; attaches file-upload or authentication middleware where needed. |
| `src/controllers/user.controller.js` | Implements user-facing request logic: input checks, model operations, token creation, image handling, and HTTP responses. |
| `src/middlware/auth.middleware.js` | `verifyJWT` accepts an access token from a cookie or `Authorization: Bearer ...`, verifies it, loads the user, and adds that user to `req.user`. |
| `src/middlware/multer.middleware.js` | Configures Multer to write multipart uploads to `Public/temp`; `upload.fields(...)` makes avatar and cover image files available to registration. |
| `src/models/user.model.js` | Defines user fields and database behavior: password hashing, password comparison, and access/refresh JWT generation. |
| `src/models/video.model.js` | Defines video metadata, its owner relationship, timestamps, and aggregate pagination support. |
| `src/models/subscription.model.js` | Defines a relationship between a subscribing user and a channel. |
| `src/utils/cloudinary.js` | Uploads local media to Cloudinary and removes the temporary local file; also deletes a Cloudinary image using its URL. |
| `src/utils/asyncHandler.js` | Passes rejected async controller promises to Express error handling rather than leaving them unhandled. |
| `src/utils/ApiError.js` | Represents an HTTP error with a status code, message, and optional error details. |
| `src/utils/ApiResponse.js` | Gives successful controller responses a consistent `statusCode`, `message`, `data`, and `success` structure. |
| `package.json` | Defines the ES module project, runtime dependencies, and the `npm run dev` development command. |

## 3. User model and controller methods

The `User` model stores username, email, full name, avatar/cover URLs, password, refresh token, and video watch-history references. Timestamps record creation and update times.

- **Password pre-save hook** hashes a changed password with bcrypt before MongoDB stores it. `isPasswordCorrect` compares a submitted password to that hash.
- **`generateAccessToken`** creates a short-lived JWT containing the user ID and basic identity fields. **`generateRefreshToken`** creates a separate, longer-lived JWT containing the user ID. Their secret keys and expiries come from environment variables.
- **`generateAccessRefreshTokens`** creates both tokens and saves the refresh token on the user, allowing refresh requests to be checked against the currently stored token.
- **`registerUser`** validates required fields, rejects an existing username/email, requires an avatar, uploads provided images, creates the user, and omits password and refresh token from the returned user document.
- **`loginUser`** finds a user by username or email, verifies the password, creates fresh tokens, and returns the user plus tokens. It also sets access and refresh token cookies as HTTP-only cookies.
- **`logoutUser`** clears the stored refresh token and asks the response to clear both token cookies. It depends on `verifyJWT` having populated `req.user`.
- **`refreshAccessToken`** reads the refresh token from a cookie or request body, verifies its signature and stored value, then rotates the token pair and returns the new tokens.
- **`changeCurrentPassword`** checks the existing password and saves a replacement.
- **`getCurrentUser`** returns the authenticated user from `req.user`.
- **`updateAccountHandler`** updates the current user's full name and email.
- **`updateUserAvatar`** uploads a replacement avatar, saves its URL, then deletes the previous Cloudinary image.
- **`updateUserCoverImage`** is intended to upload and save a replacement cover image.

The last four account/profile handlers are defined and exported but are **not currently registered in `user.routes.js`**, so clients cannot call them through the configured router yet.

## 4. APIs currently exposed

Both prefixes are mounted, so each path below is available under `/api/v1/users/...` and `/users/...`.

| Method | Path | Middleware | What it does |
| --- | --- | --- | --- |
| `POST` | `/register` | Multer fields `avatar` (one) and `coverImage` (one) | Creates a user; avatar is required, cover image is optional in the handler. Send multipart form data. |
| `POST` | `/login` | None | Authenticates with `username` or `email` plus `password`; sets token cookies. |
| `POST` | `/logout` | `verifyJWT` | Invalidates the stored refresh token and clears token cookies. |
| `POST` | `/refresh-token` | Token validation in controller | Exchanges a valid refresh token (cookie or request body) for a new token pair. |

`video.model.js` and `subscription.model.js` describe data only; no video or subscription routes/controllers are present in the current project structure.

## 5. Data model relationships

```text
User ──< Video
  │       Video.owner → User
  │
  ├── watchHistory[] → Video
  │
  └──< Subscription
          subscriber → User
          channel    → User
```

`Video` stores the media URL, thumbnail URL, title, description, duration, views, publication state, and owner. `Subscription` represents one user subscribing to another. These references enable later populate/aggregation queries, but those application flows are not implemented yet.

## 6. Configuration and operational notes

The code expects environment variables for `PORT`, `CORS_ORIGIN`, `MONGODB_URI`, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), and JWT secrets/expiries (`ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`). Keep real secrets in the local `.env` file; do not put them in source control.

Current implementation details worth addressing before extending the API:

- `logoutUser` uses `htttpOnly` (an extra `t`) instead of `httpOnly`, so the clear-cookie options do not match the option used when cookies are set.
- `updateUserCoverImage` calls `upload(...)`, which is not imported or defined; the shared helper is named `uploadToCloudinary`.
- `subscription.model.js` has an invalid Mongoose import statement (`from mongoose` is missing quotes), so importing that model will fail.
- The router does not yet expose password change, current-user, account update, avatar update, or cover-image update handlers.
- Multer uses the original uploaded filename in its temporary directory. Unique/safe temporary filenames and file-type/size limits should be considered before accepting untrusted uploads.

These notes describe the repository as it currently stands; the guide does not imply that the unmounted or currently broken flows are working APIs.

# AntStudio API Reference

All API requests should be prefixed with `/api`. Most endpoints require an `Authorization` header with a Bearer token.

---

## 0. Health Checks (`/health` & `/api/health`)

### GET `/health` / GET `/api/health`
Check core backend application health status.
- **Authentication**: Public (no token required)
- **Returns**: `{ "status": "ok", "timestamp": "2026-08-02T08:42:00.000Z" }`

---

## 1. Authentication (`/api/auth`)

### POST `/login`
Authenticate a user and receive a JWT.
- **Body**: `{ "email": "user@example.com", "password": "password" }`
- **Returns**: `{ "success": true, "data": { "user": { ... }, "token": "jwt_string" } }`

### POST `/register`
Create a new user account.
- **Body**: `{ "email": "user@example.com", "password": "password", "name": "John Doe" }`
- **Returns**: User data and token.

### GET `/me`
Get current authenticated user's profile.
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: User object.

---

## 2. Project Management (`/api/projects`)

### GET `/`
List projects belonging to the user's organization.
- **Query Params**: `page`, `limit`, `status`.
- **Returns**: Array of project objects with pagination.

### POST `/`
Create a new project.
- **Body**: `{ "name": "My Vlog", "description": "Trip to Japan", "aspectRatio": "16:9" }`
- **Returns**: Created project object.

### GET `/:id`
Get detailed information about a specific project.
- **Returns**: Project object with segments and settings.

### PUT `/:id`
Update project metadata or structure.
- **Body**: `{ "name": "Updated Title", "segments": [ ... ] }`

---

## 3. Media & Assets (`/api/media`)

### POST `/upload`
Upload a raw media file (video/image/audio) to S3.
- **Body**: `multipart/form-data`
- **Returns**: Metadata and S3 URL of the uploaded asset.

### GET `/`
List all assets available in the current organization.

### DELETE `/:id`
Remove an asset from the library and S3.

---

## 4. Streaming & Live Commerce (`/api/streaming`)

### POST `/start`
Initialize an autonomous live stream session.
- **Body**: `{ "title": "24/7 Sale Studio", "destinations": ["youtube", "tiktok"] }`
- **Returns**: `streamId`, `rtmpUrl`, and `streamKey`.

### POST `/stop`
Terminate an active live stream.
- **Body**: `{ "streamId": "..." }`

---

## Error Handling

The API uses standard HTTP status codes:
- `200 OK`: Success.
- `201 Created`: Resource created.
- `400 Bad Request`: Invalid input.
- `401 Unauthorized`: Missing or invalid token.
- `403 Forbidden`: Insufficient permissions.
- `404 Not Found`: Resource does not exist.
- `500 Internal Server Error`: Backend crash or unhandled error.

**Standard Error Response**:
```json
{
    "success": false,
    "error": "Short error message",
    "details": { ... }
}
```

# Security Policy

## Current State (Development)

- CORS enabled for all origins
- No authentication or authorization
- WebSocket connections are open (no token required)
- No rate limiting or abuse protection
- No persistent storage of chat or signaling data

## Security Recommendations for Production

### 1. Authentication & Authorization

- Require user authentication (JWT, OAuth, or similar)
- Restrict room access to authorized users
- Implement role-based access for room owners/moderators

### 2. CORS & API Security

- Restrict CORS to trusted origins
- Validate all API inputs (room codes, usernames, etc.)
- Sanitize user input to prevent XSS/Injection

### 3. WebSocket Security

- Use secure WebSocket (WSS) in production
- Require authentication for WebSocket connections
- Implement rate limiting and connection quotas
- Monitor and log connection attempts and errors

### 4. Room & Message Security

- Enforce participant limits strictly
- Add room access controls (invite codes, passwords, etc.)
- Do not persist chat or signaling data unless required
- Consider message encryption for sensitive data

### 5. Infrastructure

- Use HTTPS for all endpoints
- Monitor for abuse, DDoS, and unusual activity
- Regularly update dependencies and patch vulnerabilities

## Reporting Vulnerabilities

If you discover a security issue, please open a private issue or contact the maintainers directly.

See the [README.md](./README.md) and backend code for more details.
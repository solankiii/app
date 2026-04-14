# Sales CRM MVP - Product Requirements Document

## Overview
SIM-based Sales CRM for small sales teams. Single Expo app with role-based routing (Admin + Sales). Backend is FastAPI + MongoDB with JWT auth.

## Tech Stack
- **Mobile App**: Expo (React Native) with Expo Router
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT Bearer tokens with bcrypt password hashing
- **Storage**: Base64 audio in MongoDB for recordings

## Roles
1. **Admin** - Full dashboard, all leads, call sessions, recordings, follow-ups, salesperson performance
2. **Sales** - Personal dashboard, assigned leads, call flow, follow-ups, recording sync

## Database Collections
- `users` - Admin and sales user accounts
- `leads` - Lead records with status tracking
- `call_sessions` - Call records with outcomes
- `call_recordings` - Audio files stored as base64
- `follow_ups` - Scheduled follow-ups with status
- `lead_notes` - Notes on leads
- `activity_logs` - Audit trail

## Screens
### Sales
- Login → Sales Dashboard → Leads → Follow-ups (overdue/today/upcoming) → Sync
- Add Lead (modal) → Lead Detail → Post Call Form

### Admin
- Login → Admin Dashboard → Leads → Calls → Recordings → Follow-ups

## API Endpoints
- Auth: POST /api/auth/login, GET /api/auth/me
- Users: GET /api/users, GET /api/users/sales
- Leads: GET/POST /api/leads, GET/PUT /api/leads/{id}, PATCH /api/leads/{id}/status
- Call Sessions: POST/GET /api/call-sessions, PUT /api/call-sessions/{id}
- Follow-ups: GET/POST /api/follow-ups, PUT/PATCH /api/follow-ups/{id}
- Lead Notes: GET /api/lead-notes/{id}, POST /api/lead-notes
- Recordings: GET /api/recordings, POST /api/recordings/upload, GET /api/recordings/{id}/audio
- Dashboard: GET /api/dashboard/sales, GET /api/dashboard/admin

## Seed Data
- Admin: admin@salescrm.com / admin123
- Sales: rahul@salescrm.com / sales123, priya@salescrm.com / sales123
- 5 sample leads across cities

# Graph Report - D:\app  (2026-05-09)

## Corpus Check
- 44 files · ~67,150 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 346 nodes · 375 edges · 99 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]

## God Nodes (most connected - your core abstractions)
1. `get_current_user()` - 26 edges
2. `require_admin()` - 20 edges
3. `send_otp_email()` - 7 edges
4. `hash_password()` - 7 edges
5. `TestAuth` - 7 edges
6. `TestLeads` - 6 edges
7. `showMsg()` - 6 edges
8. `loadLead()` - 6 edges
9. `login()` - 5 edges
10. `change_password()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `login()` --calls--> `handleLogin()`  [INFERRED]
  D:\app\backend\server.py → D:\app\frontend\app\index.tsx
- `api_client()` --calls--> `update()`  [INFERRED]
  D:\app\backend\tests\test_sales_crm_api.py → D:\app\frontend\app\post-call\[id].tsx
- `fmt()` --calls--> `getQuickDates()`  [INFERRED]
  D:\app\frontend\app\admin\index.tsx → D:\app\frontend\app\post-call\[id].tsx
- `playRecording()` --calls--> `showMsg()`  [EXTRACTED]
  D:\app\frontend\app\lead\[id].tsx → D:\app\frontend\app\post-call\[id].tsx
- `pickAndUploadRecording()` --calls--> `showMsg()`  [EXTRACTED]
  D:\app\frontend\app\lead\[id].tsx → D:\app\frontend\app\post-call\[id].tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (63): BaseModel, admin_dashboard(), analytics_range(), bulk_assign_leads(), bulk_delete_leads(), CallSessionCreate, CallSessionUpdate, change_password() (+55 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (22): update(), api_client(), Sales CRM API Backend Tests Tests: Auth, Leads, Call Sessions, Follow-ups, Dash, Shared requests session, Test creating a call session, Test updating call session with outcome, Test listing call sessions, Test creating a follow-up (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (13): ddmmToIso(), getQuickDates(), handleAddNote(), handleChangeStatus(), handleSave(), handleScheduleFollowUp(), load(), loadLead() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (13): handleLogin(), create_access_token(), hash_password(), login(), One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging', Admin resets any user's password., Verify OTP and reset password., register() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (7): Test /auth/me endpoint without token, Authentication endpoint tests, Test admin login with correct credentials, Test sales user login with correct credentials, Test login with invalid credentials, Test /auth/me endpoint with valid token, TestAuth

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (5): Test admin can list all leads, Test sales user can list assigned leads, Test creating a lead and verify persistence, Test getting lead detail with enriched data, TestLeads

### Community 6 - "Community 6"
Cohesion: 0.2
Nodes (10): _build_otp_email(), forgot_password(), Tries Resend first (if configured), then SMTP. Returns (sent, diagnostic)., Admin-only diagnostic: sends a test OTP-style email to the calling     admin so, Send OTP to user's email for password reset., Returns (subject, html_body, text_body)., Returns (sent, message). Falls back gracefully if API rejects., send_otp_email() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (4): generate(), importAll(), showMessage(), testKey()

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (4): currentFilterParams(), loadLeads(), onRefresh(), selectAll()

### Community 9 - "Community 9"
Cohesion: 0.36
Nodes (8): confirmAction(), deleteUser(), loadUsers(), onRefresh(), resetPassword(), showMessage(), submitPasswordReset(), toggleRole()

### Community 10 - "Community 10"
Cohesion: 0.43
Nodes (5): load(), onRefresh(), showMsg(), submitReschedule(), updateStatus()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (2): load(), onRefresh()

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (7): _business_to_lead_row(), _clean_phone_number(), generate_leads_preview(), _nearby_areas(), _places_search_comprehensive(), _places_search_single(), Convert a raw Places result into the CRM lead schema.

### Community 13 - "Community 13"
Cohesion: 0.38
Nodes (3): loadPending(), onRefresh(), stopAndUpload()

### Community 14 - "Community 14"
Cohesion: 0.7
Nodes (4): computeRange(), load(), localDay(), onRefresh()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): load(), onRefresh()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (3): copy_collection(), main(), One-shot script to mirror production MongoDB data into the staging database.  Re

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): load(), onRefresh()

### Community 18 - "Community 18"
Cohesion: 0.83
Nodes (3): pickAndUpload(), readFileAsText(), showMessage()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): loadMetrics(), onRefresh()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): User changes their own password.

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Admin resets any user's password.

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): User changes their own password.

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Send OTP to user's email for password reset.

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Verify OTP and reset password.

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): List leads whose SPOC contact info was captured via the Post-Call form.     Onl

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Range-based analytics. Admin-only — sales reps use their own dashboards.     Re

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Admin-only diagnostic: sends a test OTP-style email to the calling     admin so

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Admin resets any user's password.

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Send OTP to user's email for password reset.

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Verify OTP and reset password.

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): List leads whose SPOC contact info was captured via the Post-Call form.     Onl

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): Range-based analytics. Admin-only — sales reps use their own dashboards.     Re

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Admin resets any user's password.

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): User changes their own password.

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): Verify OTP and reset password.

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): Verify OTP and reset password.

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): List leads whose SPOC contact info was captured via the Post-Call form.     Onl

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Range-based analytics. Admin-only — sales reps use their own dashboards.     Re

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): User changes their own password.

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Send OTP to user's email for password reset.

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): Send OTP to user's email for password reset.

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): Verify OTP and reset password.

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): List leads whose SPOC contact info was captured via the Post-Call form.     Onl

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): Admin resets any user's password.

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): User changes their own password.

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): Send OTP to user's email for password reset.

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): Verify OTP and reset password.

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): Admin resets any user's password.

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Get a field from a CSV row, trying multiple column name variations case-insensit

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): Convert a raw Places result into the CRM lead schema.

## Knowledge Gaps
- **94 isolated node(s):** `Returns (subject, html_body, text_body).`, `Returns (sent, message). Falls back gracefully if API rejects.`, `Tries Resend first (if configured), then SMTP. Returns (sent, diagnostic).`, `Admin-only diagnostic: sends a test OTP-style email to the calling     admin so`, `Admin resets any user's password.` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 22`** (2 nodes): `signup.tsx`, `handleSignup()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `AdminContacts()`, `contacts.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `follow-ups.tsx`, `AdminFollowUps()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `recordings.tsx`, `AdminRecordings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `share.tsx`, `shareLink()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `SalesContacts()`, `contacts.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `follow-ups.tsx`, `SalesFollowUps()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `recordings.tsx`, `SalesRecordings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `reset-project.js`, `moveDirectories()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `EmptyState.tsx`, `EmptyState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `expo-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `metro.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `+html.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `MetricCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `StatusBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `colors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `User changes their own password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Admin resets any user's password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `User changes their own password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Send OTP to user's email for password reset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Verify OTP and reset password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `List leads whose SPOC contact info was captured via the Post-Call form.     Onl`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Range-based analytics. Admin-only — sales reps use their own dashboards.     Re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Admin-only diagnostic: sends a test OTP-style email to the calling     admin so`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Admin resets any user's password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `Send OTP to user's email for password reset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Verify OTP and reset password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `List leads whose SPOC contact info was captured via the Post-Call form.     Onl`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `Range-based analytics. Admin-only — sales reps use their own dashboards.     Re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Admin resets any user's password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `User changes their own password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `Verify OTP and reset password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `Verify OTP and reset password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `List leads whose SPOC contact info was captured via the Post-Call form.     Onl`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Range-based analytics. Admin-only — sales reps use their own dashboards.     Re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `User changes their own password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Send OTP to user's email for password reset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `Send OTP to user's email for password reset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `Verify OTP and reset password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `List leads whose SPOC contact info was captured via the Post-Call form.     Onl`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `Admin resets any user's password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `User changes their own password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `Send OTP to user's email for password reset.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `Verify OTP and reset password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `One-shot demo data populator. Refuses to run unless DB_NAME ends with '_staging'`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `Admin resets any user's password.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Get a field from a CSV row, trying multiple column name variations case-insensit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `Convert a raw Places result into the CRM lead schema.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `update()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `TestAuth` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `Returns (subject, html_body, text_body).`, `Returns (sent, message). Falls back gracefully if API rejects.`, `Tries Resend first (if configured), then SMTP. Returns (sent, diagnostic).` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
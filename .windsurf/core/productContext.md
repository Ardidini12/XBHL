# Product Context: XBHL

## Problem Being Solved
EA Sports' Pro Clubs mode provides no permanent match history. All historical data is deleted after a short period. Custom league organizers lose all competitive records, making it impossible to track career stats, season standings, or long-term player development.

## Solution
XBHL acts as a permanent external record-keeper. It polls the EA Pro Clubs API on a configurable schedule, ingests match data before it's deleted, and stores it permanently in a relational database. This enables career history, analytics, and competitive league management that EA itself does not provide.

## User Roles & Needs

### Admin (League Commissioner)
- Create and manage multiple leagues (3v3, 6v6) and their seasons
- Add clubs and players to seasons
- Configure a per-league scheduler (days, time window, interval)
- Start, stop, resume, delete schedulers independently
- Full CRUD over all entities
- View scheduler status: running/stopped, last run, total matches ingested

### Player (Registered User)
- Register with: full name, gamertag (unique), email, password
- Login with email OR gamertag + password
- View personal career history: leagues, seasons, clubs, matches participated in
- View historical stats even after EA has deleted the original data

## Key User Flows

### Admin Flow
1. Login → Dashboard (shows leagues or "Create League" prompt)
2. Create League → set name, type (3v3/6v6), description
3. Open League → view seasons or create first season
4. Open Season → view clubs, players, scheduler status
5. Add Clubs → fetches clubId from EA API by club name
6. Add Players → link gamertags to players
7. Configure Scheduler → select active days, time window (EST), interval
8. Start Scheduler → begins automated match ingestion
9. Monitor → view last run, match counts, error logs

### Player Flow
1. Register / Login
2. Dashboard → see leagues participated in, career summary
3. Profile → career timeline, match history, stats

## Business Rules
- A match is stored exactly once: unique on (match_id, timestamp)
- Players without accounts still have data stored — linked when they register
- All time windows are enforced in America/New_York (EST/EDT)
- Multiple schedulers can run simultaneously without interference
- Match data is immutable once stored
- Scheduler must respect season date boundaries

## Edge Cases
- Player not registered → store data, link retroactively on registration
- Multiple leagues running simultaneously → scheduler isolation required
- EA API downtime → retry with backoff, no data loss
- Duplicate match payload → deduplicate at DB level
- Timezone drift (DST transitions) → always use pytz/zoneinfo for EST conversion
- Scheduler crash → recovery must not affect other schedulers

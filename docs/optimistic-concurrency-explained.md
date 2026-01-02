# Optimistic Concurrency & Version Conflicts

This document explains **Optimistic Locking**, the mechanism we use to prevent data corruption when multiple users try to modify the same Aggregate at the same time.

## The Problem: The "Lost Update"

Imagine two admins, Alice and Bob, try to cancel the **same reservation** (ID: `123`) at the exact same moment.

1. **Start State**: Reservation `123` is `CONFIRMED`.
2. **Alice** reads state: `CONFIRMED`.
3. **Bob** reads state: `CONFIRMED`.
4. **Alice** decides to change it to `CANCELLED`.
5. **Bob** decides to change it to `MODIFIED` (dates changed).

If we define "state" simply as a mutable row in a database, whoever saves *last* overwrites the other person's work silently. This is bad.

## The Solution: Optimistic Locking with Versions

Instead of locking the database row (Pessimistic Locking), we use a **Version Number**.

> **Rule**: You can only save changes if you are modifying the *version you think you are modifying*.

### How it works in our Event Store

Our `events` table has a **Unique Constraint** on `(stream_id, version)`.

```sql
CONSTRAINT events_stream_version_unique UNIQUE (stream_id, version)
```

This database constraint is the "Guard". It makes it physically impossible for two events to exist with the same version number for the same stream.

### Step-by-Step Scenario (The Race)

Let's see what happens with Alice and Bob now.

| Time | Alice (User A) | Bob (User B) | Database State (Stream 123) |
| :--- | :--- | :--- | :--- |
| T0 | **Reads** History (v1) | **Reads** History (v1) | Current Version: **1** |
| T1 | Computes: `Cancelled` | Computes: `Rescheduled` | |
| T2 | **Attempts Save** <br/> Event: `ReservationCancelled` <br/> Target Version: **2** | | |
| T3 | **Success!** ✅ <br/> DB inserts row `(id: 123, ver: 2)` | | Current Version: **2** |
| T4 | | **Attempts Save** <br/> Event: `ReservationRescheduled` <br/> Target Version: **2** | |
| T5 | | **FAILURE!** ❌ <br/> DB Error: `Unique violation: (123, 2)` | Current Version: **2** |

### Why Bob Failed

Bob tried to insert an event saying "This is Version 2 of Stream 123".

* **The Database checks**: "Do I already have a Version 2 for Stream 123?"
* **Answer**: "Yes, Alice just put one there."
* **Action**: Reject Bob's insert. Throw Exception.

### How to Handle the Error

When the API receives this error, it shouldn't crash. It has two options:

#### Option A: Fail Fast (User Interaction)

Tell Bob: *"Values have changed since you loaded this page. Please refresh and try again."*

* **Use Case**: User forms, complex edits.
* **Why**: Bob needs to see that Alice cancelled it. Maybe he shouldn't reschedule a cancelled reservation!

#### Option B: Automatic Retry (Backend Processes)

If the logic is safe to retry automatically:

1. Catch the error.
2. **Re-read** the history (now including Alice's changes).
3. **Re-apply** Bob's logic to the new state.
4. **Attempt Save** again (this time as Version 3).

* **Use Case**: Incrementing a counter, updating 'last_seen_at', mostly machine-driven non-conflicting updates.

## Summary

* **We don't lock rows** while reading (fast reading).
* **We check versions** while writing.
* **The Database enforces correctness**. We rely on `UNIQUE(stream_id, version)` constraint.

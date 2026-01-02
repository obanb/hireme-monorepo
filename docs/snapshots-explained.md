# Snapshots in Event Sourcing

## The Performance Problem

Event Sourcing requires "replaying" history to calculate the current state.

* **Reservation**: 5 events. Replay time: 0.001ms. (Fast)
* **Bank Account**: 10,000 events. Replay time: 50ms. (Okay)
* **Stock Ticker**: 10,000,000 events. Replay time: 10 seconds. (Unacceptable)

You cannot load 10 million rows every time you want to check a balance.

## The Solution: Snapshots

A **Snapshot** is a serialized copy of an Aggregate's state at a specific version. It acts as a "Save Point" in a video game. Instead of playing the game from Level 1 every time, you load the save from Level 50 and continue.

### How it Works

1. **Write Path**: Every $N$ events (e.g., 100), the system saves the current `Aggregate` object to a `snapshots` table.
2. **Read Path**:
    * Query: `SELECT * FROM snapshots WHERE stream_id = X ORDER BY version DESC LIMIT 1`
    * Result: You get the state at Version 100.
    * Query: `SELECT * FROM events WHERE stream_id = X AND version > 100`
    * Result: You get events 101, 102, 103.
    * **Action**: Apply only those 3 events.
    * **Benefit**: You realized the state by processing 4 items instead of 103.

## Database Schema (Example)

```sql
CREATE TABLE snapshots (
  stream_id UUID NOT NULL,
  version INT NOT NULL,       -- The version this snapshot represents
  data JSONB NOT NULL,        -- The full state (e.g. { balance: 500, status: 'OPEN' })
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (stream_id, version)
);
```

### Code Logic (Repository)

```typescript
async load(id: string) {
  // 1. Try to get latest snapshot
  const snapshot = await db.query(
    'SELECT * FROM snapshots WHERE stream_id = $1 ORDER BY version DESC LIMIT 1',
    [id]
  );

  let aggregate;
  let lastVersion = 0;

  if (snapshot.rows[0]) {
    // Fast Path: Restore from snapshot
    aggregate = new Aggregate(snapshot.rows[0].data);
    lastVersion = snapshot.rows[0].version;
  } else {
    // Slow Path: Start from scratch
    aggregate = new Aggregate(id);
  }

  // 2. Load only NEW events
  const newEvents = await db.query(
    'SELECT * FROM events WHERE stream_id = $1 AND version > $2 ORDER BY version ASC',
    [id, lastVersion]
  );

  // 3. Replay just the delta
  aggregate.loadFromHistory(newEvents);
  
  return aggregate;
}
```

## Best Practices

1. **Async Creation**: Don't slow down the user command to save a snapshot. Have a background worker (like the Relayer) create them.
2. **Versioning**: If you change your Aggregate logic/schema, old snapshots might break. You must handle versioning or discard old snapshots and replay full history.

# Optimistic Locking: PostgreSQL vs MongoDB

This document compares how Optimistic Concurrency Control (OCC) is implemented in Relational (Postgres) vs Document (Mongo) databases for Event Sourcing.

## 1. PostgreSQL Strategy (The "Constraint" Approach)

In Postgres, we rely on **Schema Constraints** to enforce correctness. This is "Strong Consistency" at the database level.

### Mechanism

* **Table**: `events`
* **Columns**: `stream_id`, `version`
* **Constraint**: `UNIQUE(stream_id, version)`

### The Flow

1. App tries: `INSERT INTO events (stream_id=A, version=5)`.
2. **Scenario Success**: No row exists. Postgres inserts.
3. **Scenario Failure**: Row `(A, 5)` already exists.
    * Postgres throws error `23505 (unique_violation)`.
    * App catches error $\to$ Retry.

### Pros/Cons

* ✅ **Rock Solid**: Impossible to corrupt data, even with bugs in app code. The DB protects you.
* ✅ **Transactional**: Can insert event + update read model in one atomic step.
* ❌ **Rigid**: Harder to shard (though easier than 2PC).

---

## 2. MongoDB Strategy (The "Atomic Operator" Approach)

MongoDB does not have multi-row transactions (historically) or schema constraints in the same way. We use **Compare-and-Swap (CAS)** logic on the document.

### Mechanism

Usually, you store the whole stream as a single document (for short streams) OR a commit log counter.

**Approach A: Single Document (Aggregate Root State)**

```json
{ "_id": "A", "version": 4, "state": {...} }
```

### The Flow

1. App tries to update:

    ```javascript
    db.collection.updateOne(
      { _id: "A", version: 4 },           // Condition (WHERE)
      { 
        $set: { version: 5, state: ... }  // Update
      }
    )
    ```

2. **Scenario Success**: Mongo finds the doc where `version=4`. Updates it. Returns `modifiedCount: 1`.
3. **Scenario Failure**: Version is already 5 in DB. Mongo finds **0 documents** that match `{_id: "A", version: 4}`.
    * Returns `modifiedCount: 0`.
    * App checks count. If 0 $\to$ Throw "Concurrency Error" $\to$ Retry.

### Pros/Cons

* ✅ **Fast**: Very high write throughput.
* ❌ **No Schema guarantees**: If you forget the `version` clause in your query, you overwrite data blindly. Use needs extreme discipline.
* ❌ **Document Size Limit**: MongoDB docs have a 16MB limit. If you embed events inside the document, you will crash eventually. You must use a separate `events` collection, which makes transactional consistency harder (requires MongoDB 4.0+ Transactions).

## Summary Comparison

| Feature | PostgreSQL | MongoDB |
| :--- | :--- | :--- |
| **Enforcement** | **Strict** (DB Constraint) | **Manual** (Query Logic) |
| **Consistency** | Strong (ACID) | Strong (if using CAS correctly) |
| **Complexity** | Low (Setup once in SQL) | Medium (Must write correct queries) |
| **Safety** | High (Hard to mess up) | Medium (Easy to forget the WHERE clause) |

**Verdict for this Project**: We chose **Postgres** because the Unique Constraint provides the highest safety guarantee for financial/reservation data.

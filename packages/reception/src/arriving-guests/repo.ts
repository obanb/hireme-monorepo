import type { ArrivingGuest, ArrivingGuestsProcedureParams } from "./schemas";

/**
 * Future MSSQL repository.
 *
 * Will execute the stored procedure that returns arriving guests
 * from HotelTime's reporting database.
 *
 * Procedure signature (expected):
 *   EXEC sp_GetArrivingGuests @dateFrom = '2026-03-10', @dateTo = '2026-03-16'
 *
 * Setup needed:
 *   - npm install mssql
 *   - MSSQL_HOST, MSSQL_PORT, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE env vars
 */

// ─────────────────────────────────────────────────────────────────────────────
// Future implementation — uncomment and wire up when MSSQL is available
// ─────────────────────────────────────────────────────────────────────────────

// import sql from "mssql";
//
// const poolPromise = sql.connect({
//   server:   process.env.MSSQL_HOST!,
//   port:     Number(process.env.MSSQL_PORT ?? 1433),
//   user:     process.env.MSSQL_USER!,
//   password: process.env.MSSQL_PASSWORD!,
//   database: process.env.MSSQL_DATABASE!,
//   options:  { encrypt: true, trustServerCertificate: true },
// });

export const arrivingGuestsRepo = {
  /**
   * Execute the stored procedure and return raw rows.
   * Currently returns an empty array — replace body with MSSQL call.
   */
  async findByDateRange(_params: ArrivingGuestsProcedureParams): Promise<ArrivingGuest[]> {
    // TODO: implement when MSSQL connection is available
    //
    // const pool   = await poolPromise;
    // const result = await pool
    //   .request()
    //   .input("dateFrom", sql.Date, params.dateFrom)
    //   .input("dateTo",   sql.Date, params.dateTo)
    //   .execute("sp_GetArrivingGuests");
    //
    // return result.recordset as ArrivingGuest[];

    return [];
  },
};

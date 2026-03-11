import type { BenefitGuest, BenefitsProcedureParams } from "./schemas";

/**
 * Future MSSQL stored-procedure call.
 * Replace the body once the SQL procedure is available.
 */
export const benefitsRepo = {
  async findByDateRange(_params: BenefitsProcedureParams): Promise<BenefitGuest[]> {
    throw new Error("MSSQL procedure not yet implemented — use mock data");
  },
};

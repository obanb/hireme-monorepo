import express from "express";
import cors from "cors";
import PDFDocument from "pdfkit";
import { guestRepository, getPool } from "../event-sourcing";

export function mountPoliceReportRoute(app: express.Application) {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.get('/api/guests/:id/police-report', cors<cors.CorsRequest>({ origin: corsOrigin, credentials: true }), async (req, res) => {
    try {
      const guest = await guestRepository.getReadModel(req.params.id);
      if (!guest) {
        res.status(404).json({ error: 'Guest not found' });
        return;
      }

      // Fetch guest's reservations
      const pool = getPool();
      const client = await pool.connect();
      let reservations: Array<{ checkInDate: string | null; checkOutDate: string | null; roomNumber: string | null }> = [];
      try {
        const result = await client.query(
          `SELECT r.check_in_date, r.check_out_date, rm.room_number
           FROM reservations r
           LEFT JOIN rooms rm ON r.room_id = rm.id
           WHERE r.guest_email = $1
           ORDER BY r.check_in_date DESC
           LIMIT 5`,
          [guest.email]
        );
        reservations = result.rows.map((r: Record<string, unknown>) => ({
          checkInDate: r.check_in_date ? (r.check_in_date as Date).toISOString().split('T')[0] : null,
          checkOutDate: r.check_out_date ? (r.check_out_date as Date).toISOString().split('T')[0] : null,
          roomNumber: r.room_number as string | null,
        }));
      } finally {
        client.release();
      }

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      const safeName = (guest.lastName || 'guest').replace(/[^\x20-\x7E]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="police-report-${safeName}-${guest.id.slice(0, 8)}.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('Hlaseni ubytovani cizincu', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('(Report on accommodation of foreigners)', { align: 'center' });
      doc.moveDown(2);

      // Accommodation facility
      doc.fontSize(12).font('Helvetica-Bold').text('Ubytovaci zarizeni / Accommodation facility');
      doc.fontSize(10).font('Helvetica');
      doc.text('Hotel Wellness Resort');
      doc.moveDown(1.5);

      // Guest data
      doc.fontSize(12).font('Helvetica-Bold').text('Udaje o hostu / Guest information');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);

      const addField = (label: string, value: string | null) => {
        doc.font('Helvetica-Bold').text(label + ': ', { continued: true });
        doc.font('Helvetica').text(value || '-');
      };

      addField('Jmeno / First name', guest.firstName);
      addField('Prijmeni / Last name', guest.lastName);
      addField('Datum narozeni / Date of birth', guest.dateOfBirth);
      addField('Misto narozeni / Place of birth', guest.birthPlace);
      addField('Statni prislusnost / Citizenship', guest.citizenship);
      addField('Narodnost / Nationality', guest.nationality);
      addField('Cislo cestovniho dokladu / Passport number', guest.passportNumber);
      addField('Cislo viza / Visa number', guest.visaNumber);
      addField('Ucel pobytu / Purpose of stay', guest.purposeOfStay);
      doc.moveDown(0.5);
      addField('Adresa / Home address',
        [guest.homeStreet, guest.homeCity, guest.homePostalCode, guest.homeCountry].filter(Boolean).join(', ') || null
      );
      doc.moveDown(1.5);

      // Stay information
      doc.fontSize(12).font('Helvetica-Bold').text('Udaje o pobytu / Stay information');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);

      if (reservations.length > 0) {
        for (const r of reservations) {
          doc.text(`Prihlaseni / Check-in: ${r.checkInDate || '-'}    Odhlaseni / Check-out: ${r.checkOutDate || '-'}    Pokoj / Room: ${r.roomNumber || '-'}`);
        }
      } else {
        doc.text('Zadne rezervace / No reservations found');
      }

      doc.moveDown(3);

      // Signature lines
      doc.text('Datum / Date: ___________________          Podpis / Signature: ___________________');

      doc.end();
    } catch (err) {
      console.error('[police-report] Error generating PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate report' });
      }
    }
  });
}

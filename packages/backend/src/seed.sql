-- =============================================================
-- HOTEL CMS — DEMO SEED DATA
-- =============================================================

-- ── 1. RATE CODES ────────────────────────────────────────────
INSERT INTO rate_codes (id, code, name, description, is_active, version)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'BAR',    'Best Available Rate', 'Standard flexible rate, bookable on all channels',         true, 0),
  ('c1000000-0000-0000-0000-000000000002', 'CORP',   'Corporate Rate',      'Discounted rate for corporate clients',                    true, 0),
  ('c1000000-0000-0000-0000-000000000003', 'FLEX',   'Flexible Rate',       'Fully refundable, no prepayment required',                 true, 0),
  ('c1000000-0000-0000-0000-000000000004', 'BB',     'Bed & Breakfast',     'Includes breakfast for all guests',                       true, 0),
  ('c1000000-0000-0000-0000-000000000005', 'PACK',   'Romance Package',     'Includes flowers, sparkling wine and late checkout',       true, 0),
  ('c1000000-0000-0000-0000-000000000006', 'EARLYB', 'Early Bird -15%',     '15% discount when booked 30+ days in advance',            true, 0)
ON CONFLICT (code) DO NOTHING;

-- ── 2. ROOM TYPES ────────────────────────────────────────────
INSERT INTO room_types (id, code, name, is_active, version)
VALUES
  ('2898aa1e-7c61-4307-b7f3-dcd16999247f', 'SINGLE',    'Single Room', true, 0),
  ('2a2cc5e3-eac3-4688-b901-ee9cabbe148d', 'DOUBLE',    'Double Room', true, 0),
  ('0402ba36-397e-481d-a83c-eef2bc3400ee', 'SUITE',     'Suite',       true, 0),
  ('0720d0a6-938b-4b10-ad38-563c24e26a40', 'DELUXE',    'Deluxe Room', true, 0),
  ('8c7661da-f354-470e-8a86-be439a009bda', 'PENTHOUSE', 'Penthouse',   true, 0)
ON CONFLICT (id) DO NOTHING;

-- ── 3. ROOMS ─────────────────────────────────────────────────
INSERT INTO rooms (id, name, room_number, type, capacity, status, color, version, room_type_id, rate_code_id)
VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Room 104', '104', 'SINGLE',    1, 'AVAILABLE', '#6b7280', 0, '2898aa1e-7c61-4307-b7f3-dcd16999247f', 'c1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000002', 'Room 106', '106', 'SINGLE',    1, 'AVAILABLE', '#6b7280', 0, '2898aa1e-7c61-4307-b7f3-dcd16999247f', 'c1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000003', 'Room 107', '107', 'DOUBLE',    2, 'AVAILABLE', '#3b82f6', 0, '2a2cc5e3-eac3-4688-b901-ee9cabbe148d', 'c1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000004', 'Room 108', '108', 'DOUBLE',    2, 'AVAILABLE', '#3b82f6', 0, '2a2cc5e3-eac3-4688-b901-ee9cabbe148d', 'c1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000005', 'Room 109', '109', 'DOUBLE',    2, 'AVAILABLE', '#3b82f6', 0, '2a2cc5e3-eac3-4688-b901-ee9cabbe148d', 'c1000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000006', 'Room 201', '201', 'DELUXE',    2, 'AVAILABLE', '#8b5cf6', 0, '0720d0a6-938b-4b10-ad38-563c24e26a40', 'c1000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000007', 'Room 202', '202', 'DELUXE',    2, 'AVAILABLE', '#8b5cf6', 0, '0720d0a6-938b-4b10-ad38-563c24e26a40', 'c1000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000008', 'Room 203', '203', 'DELUXE',    3, 'AVAILABLE', '#8b5cf6', 0, '0720d0a6-938b-4b10-ad38-563c24e26a40', 'c1000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000009', 'Room 205', '205', 'SUITE',     4, 'AVAILABLE', '#f59e0b', 0, '0402ba36-397e-481d-a83c-eef2bc3400ee', 'c1000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000010', 'Room 206', '206', 'SUITE',     4, 'AVAILABLE', '#f59e0b', 0, '0402ba36-397e-481d-a83c-eef2bc3400ee', 'c1000000-0000-0000-0000-000000000005'),
  ('b2000000-0000-0000-0000-000000000011', 'Room 301', '301', 'PENTHOUSE', 4, 'AVAILABLE', '#ef4444', 0, '8c7661da-f354-470e-8a86-be439a009bda', 'c1000000-0000-0000-0000-000000000005'),
  ('b2000000-0000-0000-0000-000000000012', 'Room 302', '302', 'PENTHOUSE', 6, 'AVAILABLE', '#ef4444', 0, '8c7661da-f354-470e-8a86-be439a009bda', 'c1000000-0000-0000-0000-000000000006')
ON CONFLICT (room_number) DO NOTHING;

-- ── 4. GUESTS ────────────────────────────────────────────────
INSERT INTO guests (id, email, first_name, last_name, phone, date_of_birth, nationality, citizenship, passport_number, purpose_of_stay, home_street, home_city, home_postal_code, home_country, is_active, version)
VALUES
  ('aa000000-0000-0000-0000-000000000001', 'martin.novak@email.cz',        'Martin',    'Novák',      '+420 602 111 001', '1985-04-12', 'Czech',      'Czech',      'CZ1234567', 'Tourism',    'Václavské náměstí 1',    'Prague',    '110 00', 'Czech Republic', true, 0),
  ('aa000000-0000-0000-0000-000000000002', 'jana.horakova@seznam.cz',      'Jana',      'Horáková',   '+420 604 222 002', '1990-08-23', 'Czech',      'Czech',      'CZ2345678', 'Tourism',    'Náměstí Míru 5',         'Brno',      '602 00', 'Czech Republic', true, 0),
  ('aa000000-0000-0000-0000-000000000003', 'thomas.mueller@gmail.de',      'Thomas',    'Müller',     '+49 171 333 0033', '1978-11-05', 'German',     'German',     'DE3456789', 'Business',   'Unter den Linden 12',    'Berlin',    '10117',  'Germany',        true, 0),
  ('aa000000-0000-0000-0000-000000000004', 'sophie.leclerc@orange.fr',     'Sophie',    'Leclerc',    '+33 6 44 55 66 77','1992-02-18', 'French',     'French',     'FR4567890', 'Tourism',    '15 Rue de Rivoli',       'Paris',     '75001',  'France',         true, 0),
  ('aa000000-0000-0000-0000-000000000005', 'james.wilson@gmail.com',       'James',     'Wilson',     '+44 7700 900001',  '1975-06-30', 'British',    'British',    'GB5678901', 'Business',   '221B Baker Street',      'London',    'NW1 6XE','United Kingdom',  true, 0),
  ('aa000000-0000-0000-0000-000000000006', 'elena.rossi@libero.it',        'Elena',     'Rossi',      '+39 335 666 7788', '1988-09-14', 'Italian',    'Italian',    'IT6789012', 'Tourism',    'Via Veneto 45',          'Rome',      '00187',  'Italy',          true, 0),
  ('aa000000-0000-0000-0000-000000000007', 'piotr.kowalski@wp.pl',         'Piotr',     'Kowalski',   '+48 504 777 888',  '1983-03-27', 'Polish',     'Polish',     'PL7890123', 'Tourism',    'ul. Nowy Świat 10',      'Warsaw',    '00-400', 'Poland',         true, 0),
  ('aa000000-0000-0000-0000-000000000008', 'anna.szabo@gmail.hu',          'Anna',      'Szabó',      '+36 30 888 9900',  '1995-12-01', 'Hungarian',  'Hungarian',  'HU8901234', 'Tourism',    'Andrássy út 22',         'Budapest',  '1061',   'Hungary',        true, 0),
  ('aa000000-0000-0000-0000-000000000009', 'carlos.garcia@hotmail.es',     'Carlos',    'García',     '+34 612 999 001',  '1971-07-08', 'Spanish',    'Spanish',    'ES9012345', 'Conference', 'Gran Vía 55',            'Madrid',    '28013',  'Spain',          true, 0),
  ('aa000000-0000-0000-0000-000000000010', 'yuki.tanaka@yahoo.co.jp',      'Yuki',      'Tanaka',     '+81 90 1234 5678', '1987-05-19', 'Japanese',   'Japanese',   'JP0123456', 'Tourism',    '1-1 Shinjuku',           'Tokyo',     '160-0022','Japan',          true, 0),
  ('aa000000-0000-0000-0000-000000000011', 'michael.johnson@outlook.com',  'Michael',   'Johnson',    '+1 212 555 0011',  '1969-01-15', 'American',   'American',   'US1234567', 'Business',   '350 Fifth Avenue',       'New York',  '10118',  'United States',  true, 0),
  ('aa000000-0000-0000-0000-000000000012', 'maria.santos@gmail.pt',        'Maria',     'Santos',     '+351 912 222 333', '1993-10-22', 'Portuguese', 'Portuguese', 'PT2345678', 'Tourism',    'Av. da Liberdade 80',    'Lisbon',    '1250-096','Portugal',       true, 0),
  ('aa000000-0000-0000-0000-000000000013', 'lars.eriksson@gmail.se',       'Lars',      'Eriksson',   '+46 70 333 4455',  '1980-04-03', 'Swedish',    'Swedish',    'SE3456789', 'Business',   'Kungsgatan 20',          'Stockholm', '111 35', 'Sweden',         true, 0),
  ('aa000000-0000-0000-0000-000000000014', 'k.wojcik@poczta.onet.pl',      'Katarzyna', 'Wójcik',     '+48 601 444 555',  '1997-08-11', 'Polish',     'Polish',     'PL4567890', 'Tourism',    'ul. Marszałkowska 4',    'Warsaw',    '00-624', 'Poland',         true, 0),
  ('aa000000-0000-0000-0000-000000000015', 'f.dubois@sfr.fr',              'François',  'Dubois',     '+33 6 11 22 33 44','1966-12-25', 'French',     'French',     'FR5678901', 'Conference', '3 Place de Opera',       'Lyon',      '69001',  'France',         true, 0),
  ('aa000000-0000-0000-0000-000000000016', 'ingrid.hansen@gmail.no',       'Ingrid',    'Hansen',     '+47 412 55 666',   '1991-06-17', 'Norwegian',  'Norwegian',  'NO6789012', 'Tourism',    'Karl Johans gate 37',    'Oslo',      '0162',   'Norway',         true, 0),
  ('aa000000-0000-0000-0000-000000000017', 'ahmed.alrashid@gmail.com',     'Ahmed',     'Al-Rashid',  '+971 50 777 8899', '1982-03-09', 'Emirati',    'Emirati',    'AE7890123', 'Business',   'Sheikh Zayed Road',      'Dubai',     '00000',  'UAE',            true, 0),
  ('aa000000-0000-0000-0000-000000000018', 'v.sterling@btinternet.com',    'Victoria',  'Sterling',   '+44 7800 100200',  '1974-09-28', 'British',    'British',    'GB8901234', 'Tourism',    '10 Downing Mews',        'London',    'SW1A 2AA','United Kingdom', true, 0),
  ('aa000000-0000-0000-0000-000000000019', 'r.ferraro@virgilio.it',        'Roberto',   'Ferraro',    '+39 347 999 0011', '1989-02-14', 'Italian',    'Italian',    'IT9012345', 'Tourism',    'Corso Buenos Aires 30',  'Milan',     '20124',  'Italy',          true, 0),
  ('aa000000-0000-0000-0000-000000000020', 'lucie.blanc@gmail.fr',         'Lucie',     'Blanc',      '+33 6 77 88 99 00','1998-07-04', 'French',     'French',     'FR0123456', 'Tourism',    '8 Rue du Faubourg',      'Toulouse',  '31000',  'France',         true, 0)
ON CONFLICT (email) DO NOTHING;

-- ── 5. RESERVATIONS ──────────────────────────────────────────
INSERT INTO reservations (id, guest_name, guest_email, guest_id, status, check_in_date, check_out_date, total_price, payed_price, currency, room_ids, version, created_at)
VALUES

-- Past — completed (Feb 2026)
('bb000000-0000-0000-0000-000000000001', 'Martin Novák',      'martin.novak@email.cz',       'aa000000-0000-0000-0000-000000000001',
 'CONFIRMED', '2026-02-10', '2026-02-14',  4800.00,  4800.00, 'CZK', ARRAY['de0a3d0c-959c-402a-88b7-ec0d72a3e1e4']::uuid[], 2, '2026-02-01 10:00:00+01'),

('bb000000-0000-0000-0000-000000000002', 'Thomas Müller',     'thomas.mueller@gmail.de',     'aa000000-0000-0000-0000-000000000003',
 'CONFIRMED', '2026-02-14', '2026-02-17',   630.00,   630.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000004']::uuid[], 2, '2026-02-05 09:15:00+01'),

('bb000000-0000-0000-0000-000000000003', 'James Wilson',      'james.wilson@gmail.com',      'aa000000-0000-0000-0000-000000000005',
 'CONFIRMED', '2026-02-18', '2026-02-22',   980.00,   980.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000007']::uuid[], 2, '2026-02-08 14:30:00+01'),

('bb000000-0000-0000-0000-000000000004', 'Elena Rossi',       'elena.rossi@libero.it',       'aa000000-0000-0000-0000-000000000006',
 'CANCELLED',  '2026-02-20', '2026-02-23',   720.00,     0.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000003']::uuid[], 1, '2026-02-10 11:00:00+01'),

('bb000000-0000-0000-0000-000000000005', 'Ahmed Al-Rashid',   'ahmed.alrashid@gmail.com',    'aa000000-0000-0000-0000-000000000017',
 'CONFIRMED', '2026-02-22', '2026-03-01',  3200.00,  3200.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000011']::uuid[], 2, '2026-02-12 08:00:00+01'),

-- Currently in-house (checked in, checking out this week)
('bb000000-0000-0000-0000-000000000006', 'Sophie Leclerc',    'sophie.leclerc@orange.fr',    'aa000000-0000-0000-0000-000000000004',
 'CONFIRMED', '2026-03-03', '2026-03-07',   560.00,   560.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000005']::uuid[], 2, '2026-02-20 16:00:00+01'),

('bb000000-0000-0000-0000-000000000007', 'Piotr Kowalski',    'piotr.kowalski@wp.pl',        'aa000000-0000-0000-0000-000000000007',
 'CONFIRMED', '2026-03-04', '2026-03-08', 14800.00, 14800.00, 'CZK', ARRAY['5a8a6b1f-cfe7-4c82-b122-f180099f1edc']::uuid[], 2, '2026-02-21 10:30:00+01'),

('bb000000-0000-0000-0000-000000000008', 'Lars Eriksson',     'lars.eriksson@gmail.se',      'aa000000-0000-0000-0000-000000000013',
 'CONFIRMED', '2026-03-02', '2026-03-09',  1960.00,  1960.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000008']::uuid[], 2, '2026-02-22 09:00:00+01'),

('bb000000-0000-0000-0000-000000000009', 'Victoria Sterling', 'v.sterling@btinternet.com',   'aa000000-0000-0000-0000-000000000018',
 'CONFIRMED', '2026-03-01', '2026-03-06',  7500.00,  5000.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000010']::uuid[], 2, '2026-02-15 13:45:00+01'),

('bb000000-0000-0000-0000-000000000010', 'Michael Johnson',   'michael.johnson@outlook.com', 'aa000000-0000-0000-0000-000000000011',
 'CONFIRMED', '2026-03-04', '2026-03-10',  2400.00,  2400.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000007']::uuid[], 2, '2026-02-25 11:00:00+01'),

-- Arriving today (Mar 5)
('bb000000-0000-0000-0000-000000000011', 'Anna Szabó',        'anna.szabo@gmail.hu',         'aa000000-0000-0000-0000-000000000008',
 'CONFIRMED', '2026-03-05', '2026-03-08',   360.00,   360.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000001']::uuid[], 2, '2026-02-26 10:00:00+01'),

('bb000000-0000-0000-0000-000000000012', 'Katarzyna Wójcik',  'k.wojcik@poczta.onet.pl',     'aa000000-0000-0000-0000-000000000014',
 'CONFIRMED', '2026-03-05', '2026-03-09',   960.00,   480.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000009']::uuid[], 2, '2026-02-27 14:00:00+01'),

-- Arriving tomorrow (Mar 6)
('bb000000-0000-0000-0000-000000000013', 'Yuki Tanaka',       'yuki.tanaka@yahoo.co.jp',     'aa000000-0000-0000-0000-000000000010',
 'CONFIRMED', '2026-03-06', '2026-03-10',  1400.00,  1400.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000012']::uuid[], 2, '2026-02-28 08:30:00+01'),

('bb000000-0000-0000-0000-000000000014', 'Jana Horáková',     'jana.horakova@seznam.cz',     'aa000000-0000-0000-0000-000000000002',
 'PENDING',   '2026-03-06', '2026-03-07',  3200.00,     0.00, 'CZK', ARRAY['75653bf5-1963-406b-8165-64447f0f7130']::uuid[], 1, '2026-03-01 15:00:00+01'),

-- Arriving in 2 days (Mar 7)
('bb000000-0000-0000-0000-000000000015', 'François Dubois',   'f.dubois@sfr.fr',             'aa000000-0000-0000-0000-000000000015',
 'CONFIRMED', '2026-03-07', '2026-03-12',  1750.00,   875.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000002']::uuid[], 2, '2026-03-01 09:00:00+01'),

-- Next week
('bb000000-0000-0000-0000-000000000016', 'Ingrid Hansen',     'ingrid.hansen@gmail.no',      'aa000000-0000-0000-0000-000000000016',
 'CONFIRMED', '2026-03-10', '2026-03-14',   800.00,   800.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000003']::uuid[], 2, '2026-03-02 11:00:00+01'),

('bb000000-0000-0000-0000-000000000017', 'Carlos García',     'carlos.garcia@hotmail.es',    'aa000000-0000-0000-0000-000000000009',
 'CONFIRMED', '2026-03-11', '2026-03-15',  2200.00,  2200.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000010']::uuid[], 2, '2026-03-01 16:30:00+01'),

('bb000000-0000-0000-0000-000000000018', 'Maria Santos',      'maria.santos@gmail.pt',       'aa000000-0000-0000-0000-000000000012',
 'PENDING',   '2026-03-12', '2026-03-15',   540.00,     0.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000001']::uuid[], 1, '2026-03-03 10:00:00+01'),

-- Future — April 2026
('bb000000-0000-0000-0000-000000000019', 'Roberto Ferraro',   'r.ferraro@virgilio.it',       'aa000000-0000-0000-0000-000000000019',
 'PENDING',   '2026-04-02', '2026-04-07',  1250.00,     0.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000005']::uuid[], 1, '2026-03-04 09:00:00+01'),

('bb000000-0000-0000-0000-000000000020', 'Lucie Blanc',       'lucie.blanc@gmail.fr',        'aa000000-0000-0000-0000-000000000020',
 'PENDING',   '2026-04-18', '2026-04-25',  9100.00,  4550.00, 'EUR', ARRAY['b2000000-0000-0000-0000-000000000012']::uuid[], 1, '2026-03-05 08:00:00+01')

ON CONFLICT (id) DO NOTHING;

-- ── 6. ACCOUNTS ──────────────────────────────────────────────
INSERT INTO accounts (stream_id, reservation_id, total_price, payed_price, currency, version)
VALUES
  ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001',  4800.00,  4800.00, 'CZK', 1),
  ('cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000002',   630.00,   630.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000003',   980.00,   980.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005',  3200.00,  3200.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000006',   560.00,   560.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000007', 14800.00, 14800.00, 'CZK', 1),
  ('cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000008',  1960.00,  1960.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000009',  7500.00,  5000.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000010',  2400.00,  2400.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000011',   360.00,   360.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000012',   960.00,   480.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000013', 'bb000000-0000-0000-0000-000000000013',  1400.00,  1400.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000015', 'bb000000-0000-0000-0000-000000000015',  1750.00,   875.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000016', 'bb000000-0000-0000-0000-000000000016',   800.00,   800.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000017', 'bb000000-0000-0000-0000-000000000017',  2200.00,  2200.00, 'EUR', 1),
  ('cc000000-0000-0000-0000-000000000020', 'bb000000-0000-0000-0000-000000000020',  9100.00,  4550.00, 'EUR', 1)
ON CONFLICT (stream_id) DO NOTHING;

-- ── 7. Link account_id back to reservations ──────────────────
UPDATE reservations r
SET account_id = a.id
FROM accounts a
WHERE a.reservation_id = r.id
  AND r.account_id IS NULL;

-- ── 8. TIERS ─────────────────────────────────────────────────
INSERT INTO tiers (id, code, name, description, min_reservations, min_spend, color, sort_order)
VALUES
  (gen_random_uuid(), 'BRONZE',   'Bronze',   'Welcome tier for new guests',                   1,       0,    '#cd7f32', 1),
  (gen_random_uuid(), 'SILVER',   'Silver',   'Regular guests with 3+ stays',                  3,    1000,    '#a0aec0', 2),
  (gen_random_uuid(), 'GOLD',     'Gold',     'Valued guests with 10+ stays or €5k spend',     10,   5000,    '#d69e2e', 3),
  (gen_random_uuid(), 'PLATINUM', 'Platinum', 'VIP guests with 20+ stays or €15k spend',       20,  15000,    '#805ad5', 4)
ON CONFLICT (code) DO NOTHING;

-- ── Summary ──────────────────────────────────────────────────
SELECT table_, rows FROM (
  SELECT 'rate_codes'   AS table_, COUNT(*) AS rows FROM rate_codes   UNION ALL
  SELECT 'rooms',                  COUNT(*)          FROM rooms        UNION ALL
  SELECT 'guests',                 COUNT(*)          FROM guests       UNION ALL
  SELECT 'reservations',           COUNT(*)          FROM reservations UNION ALL
  SELECT 'accounts',               COUNT(*)          FROM accounts     UNION ALL
  SELECT 'tiers',                  COUNT(*)          FROM tiers
) t ORDER BY table_;

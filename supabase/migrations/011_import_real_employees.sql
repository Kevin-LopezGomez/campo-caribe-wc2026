-- ============================================================
-- 011_import_real_employees.sql
-- One-time import of 83 real employees from HR's export.
-- Prerequisite: 010_department_fields.sql must have run first.
--
-- Steps:
--   1. Rename Kevin/Camille/Isai from old CC00X ids to real
--      Associate IDs — in both approved_employees AND profiles —
--      so existing picks/scores (keyed on user uuid, not employee_id)
--      carry forward untouched.
--   2. Insert all 83 real employees. ON CONFLICT … DO UPDATE so
--      if Kevin/Camille/Isai were just renamed above, this pass
--      fills in their new department fields.
-- ============================================================

-- ---- Step 1: rename existing CC00X rows to real Associate IDs ----
-- Safe to run even if the CC00X rows don't exist (UPDATE affects 0 rows).

UPDATE public.approved_employees SET
  employee_id      = '6KYLJ6V2N',
  full_name        = 'Lopez Gomez, Kevin',
  role             = 'dev',
  job_title        = 'Director of Operations',
  reports_to       = 'Fields, Aaron',
  home_department  = 'Management',
  division         = 'Management'
WHERE employee_id = 'CC001';

UPDATE public.profiles SET
  employee_id      = '6KYLJ6V2N',
  full_name        = 'Lopez Gomez, Kevin',
  role             = 'dev',
  job_title        = 'Director of Operations',
  home_department  = 'Management',
  division         = 'Management'
WHERE employee_id = 'CC001';

UPDATE public.approved_employees SET
  employee_id      = 'I2CLV9DSM',
  full_name        = 'Marrero-Vilches, Camille A.',
  role             = 'admin',
  job_title        = 'Human Resources Manager',
  reports_to       = 'Fields, Aaron',
  home_department  = 'Management',
  division         = 'Management'
WHERE employee_id = 'CC002';

UPDATE public.profiles SET
  employee_id      = 'I2CLV9DSM',
  full_name        = 'Marrero-Vilches, Camille A.',
  role             = 'admin',
  job_title        = 'Human Resources Manager',
  home_department  = 'Management',
  division         = 'Management'
WHERE employee_id = 'CC002';

UPDATE public.approved_employees SET
  employee_id      = 'NTQUC4H3A',
  full_name        = 'Rosario Rodriguez, Isai Enrique',
  role             = 'admin',
  job_title        = 'Food Safety & Quality Manager',
  reports_to       = 'Fields, Aaron',
  home_department  = 'Management',
  division         = 'Management'
WHERE employee_id = 'CC003';

UPDATE public.profiles SET
  employee_id      = 'NTQUC4H3A',
  full_name        = 'Rosario Rodriguez, Isai Enrique',
  role             = 'admin',
  job_title        = 'Food Safety & Quality Manager',
  home_department  = 'Management',
  division         = 'Management'
WHERE employee_id = 'CC003';

-- ---- Step 2: upsert all 83 real employees ----
-- DO UPDATE so if a row was just renamed above, this pass updates fields.
-- access_key is NOT overwritten on conflict — preserve any manually-issued keys.

INSERT INTO public.approved_employees
  (employee_id, full_name, access_key, role,
   job_title, reports_to, home_department, division)
VALUES
  ('UYBETNYD8', 'Alvarado Montes, Daliris', '548794', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Seeding'),
  ('6C8KHLOX6', 'Alvarado, Luis A', '545316', 'user', 'Grow Technician', 'Baez Rosado, Andrea', 'Grow', 'Grow'),
  ('IKWZQDQZ4', 'Aponte-Amezquita, Gabriela Nicole', '122936', 'user', 'Food Safety & Quality Technician', 'Rosario Rodriguez, Isai', 'Food Safety', 'Food Safety'),
  ('ZXBKFCC5Y', 'Arroyo Rosa, Fermin', '171469', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('YI008VDFW', 'Aviles Aviles, Angelica', '721754', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('5OTZLQ8CD', 'Aviles Rivera, Brendaliz', '575989', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('67AWAYYUZ', 'Baez Rosado, Andrea Yashira', '325585', 'user', 'Production Manager', 'Fields, Aaron', 'Management', 'Production'),
  ('GR2RTE4PR', 'Bernardi Zollweg, Jessica Marie', '824701', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('U8QT4B4M8', 'Berrios Feliciano, Jose William', '519041', 'user', 'TL - Spec Asgmt', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('IX6H4NKIE', 'Berrios Morales, Jessenia', '091713', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('CQTQ25RRJ', 'Berrios-Guzman, Diego', '647056', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('0O6DHYHTP', 'Caraballo Vega, Arturo', '724210', 'user', 'Maintenance Manager', 'Fields, Aaron', 'Management', 'Facilities'),
  ('NA9QYVE5G', 'Carbo Torres, Eddie Omar', '912661', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('F7BM8YEWO', 'Catala Cruz, Carmen Iris', '288763', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Seeding'),
  ('S6CX9QTZO', 'Centeno, Carel Maria', '737022', 'user', 'Merchandiser', 'Mendoza, Zuleyka', 'Sales & Marketing', 'Sales'),
  ('0LMWAR2NJ', 'Collazo Cruz, Carlos Enrique', '994156', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('VQ04RNI9N', 'Collazo-Matos, Luis Daniel', '621878', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('9AYKRISAL', 'Colon Aponte, Cristian Giovanny', '311406', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('CB2PU6I8Q', 'Colon Rivera, Limaris', '943311', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('JT1VTZ28C', 'Colon Rodriguez, Maria V.', '310504', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('3KWO577BM', 'Cordero, Manuel', '045277', 'user', 'Grower', 'Helmer, Jonah', 'Grow', 'Grow'),
  ('ROFKIIUYX', 'Cruz Alicea, Brian Jose', '062045', 'user', 'Post-Harvest Manager', 'Fields, Aaron', 'Operations', 'Post-Harvest'),
  ('EXILJFAUV', 'Cruz Sanchez, Jose E.', '819216', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('4UG1P8UN4', 'Cruz, Legnaliz', '040710', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('R4INQ1IVO', 'Cuevas Reyes, Jose David', '602834', 'user', 'TL - Spec Asgmt', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('RRNOICIKO', 'Diaz Vazquez, Johnerick', '827295', 'user', 'Team Leader', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('1AF7NX593', 'Diaz, Eduardo', '108621', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('1LFJ8YE6S', 'Diaz-Ortiz, Javier Narciso', '105812', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('YFSBCKOQC', 'Espada Alicea, Michael', '860444', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('TRRP4ZE4F', 'Febus, Joel', '237187', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Shipping & Receiving'),
  ('JN9XKKJPT', 'Fields, Aaron', '528272', 'user', 'Chief Executive Officer', NULL, 'Management', 'Management'),
  ('Z0D79WA9E', 'Figueroa Rosado, Gilberto L.', '387424', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('U8TAWVFQQ', 'Fuentes Rivera, Edgardo', '872766', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('MQ5N94P2W', 'Garcia Cumba, Vanessa', '964006', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('6H2KH926H', 'Gonzalez Lopez, Yazmin', '579456', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('QAPZSP9FZ', 'Helmer, Jonah', '172368', 'user', 'Growing Director', 'Fields, Aaron', 'Management', 'Management'),
  ('CC00021', 'Hernandez Colon, Edwin O.', '261063', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Maintenance'),
  ('TU6224WGF', 'Hernandez Vazquez, Krystal', '568071', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('9G7PY5V3N', 'Hernandez, Brenlianys', '997815', 'user', 'Team Leader', 'Baez Rosado, Andrea', 'Operations', 'Seeding'),
  ('6KYLJ6V2N', 'Lopez Gomez, Kevin', '790434', 'dev', 'Director of Operations', 'Fields, Aaron', 'Management', 'Management'),
  ('CAN7O2NW7', 'Lopez Green, Jose Manuel', '281885', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('49SRZZA8Q', 'Lopez Rios, Rafael O.', '288521', 'user', 'Security Officer', 'Lopez Gomez, Kevin', 'Operations', 'Facilities'),
  ('V6U3CHTHP', 'Lopez-Cumba, Adriel Javier', '880347', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('A3NHRORMP', 'Maldonado Velez, Carlos A.', '769792', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('WANOPH5H3', 'Marrero Rivera, Adin Rafael', '401262', 'user', 'TL - Spec Asgmt', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('I2CLV9DSM', 'Marrero-Vilches, Camille A.', '560668', 'admin', 'Human Resources Manager', 'Fields, Aaron', 'Management', 'Management'),
  ('8FQM2N8Y5', 'Massas, Brian M', '792539', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('6S0J0Z8QW', 'Matos, Dayse C', '609522', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('MUC31TOFI', 'Mejias Maldonado, Giovani Yosue', '283530', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('VQHNNV7L9', 'Melendez Rivera, Yaritza', '277944', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('GVOZLRWN8', 'Meléndez Ortiz, Luis', '266315', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('U3LC54TPD', 'Mendoza, Zuleyka', '788431', 'user', 'Sales & Marketing Director', 'Fields, Aaron', 'Management', 'Management'),
  ('W6VBJNFPC', 'Molina Maldonado, Angel Y.', '620261', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('I8RX1RQEM', 'Morales Nieves, Nahomis', '151489', 'user', 'Team Leader', 'Cruz Alicea, Brian', 'Operations', 'Shipping & Receiving'),
  ('O0EY5H58N', 'Morales Pacheco, Genesis Marie', '662246', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('73L745WHN', 'Morales-Rodriguez, Ruben Joel', '696581', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('CQKJ1REV9', 'Ortiz Ortiz, Luis Joel', '886727', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('TR2OHCU7F', 'Padilla Espada, Leslian', '661605', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('R7MXS37UT', 'Padilla Rodriguez, Christian Abel', '566625', 'user', 'Assistant Grower', 'Helmer, Jonah', 'Grow', 'Grow'),
  ('EB117I9X6', 'Perez Pagan, Edison', '139048', 'user', 'Security Officer', 'Lopez Gomez, Kevin', 'Operations', 'Facilities'),
  ('CNEPIAXH5', 'Portalatin Rivera, Alleisha N.', '610133', 'user', 'Data Entry Specialist', 'Lopez Gomez, Kevin', 'Operations', 'Data'),
  ('7ZUY9X2E5', 'Quiles, Cristian E.', '772428', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('00DGJSZ36', 'Ramos Narvaez, Fernando', '287501', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Shipping & Receiving'),
  ('D9KUGWHKN', 'Rios Velez, Carlos Alexis', '462548', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('M7XAPQ7J1', 'Rivera Benitez, Ana Cristina', '466863', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('FWIJU54CI', 'Rivera Espada, Mariceli', '548229', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing'),
  ('06PH448XZ', 'Rivera Fernandez, Kevin', '829285', 'user', 'Assistant Grower', 'Helmer, Jonah', 'Grow', 'Grow'),
  ('6UR07VFBO', 'Rivera Lopez, Roberto Carlos', '969027', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('EIOHILX20', 'Rivera Lugo, Jose', '209981', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Seeding'),
  ('YK5GIPWNK', 'Rivera Negron, Victoria', '478717', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('8A6QT0JKV', 'Rivera, Luis A', '845561', 'user', 'Maintenance Technician', 'Lopez Gomez, Kevin', 'Operations', 'Maintenance'),
  ('CC00022', 'Rodriguez Lopez, Jackelyn', '313990', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('WPUZCRQQK', 'Rodriguez Vazquez, Carlos G.', '403027', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('T7OK5H00T', 'Rodriguez, Ilianery', '767471', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('R8EUYDI2W', 'Rodriguez, Marcus G.', '904544', 'user', 'Team Leader', 'Cruz Alicea, Brian', 'Operations', 'Sanitation'),
  ('1XGI5DPUJ', 'Rosario Cruz, Isaac', '546410', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Harvest'),
  ('NTQUC4H3A', 'Rosario Rodriguez, Isai Enrique', '800687', 'admin', 'Food Safety & Quality Manager', 'Fields, Aaron', 'Management', 'Management'),
  ('CEXI1W53H', 'Ruiz Guzman, Marilyn', '112734', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('AJHP51FPL', 'Santiago Feliciano, Jorge', '577994', 'user', 'Industrial Maintenance Technician', 'Caraballo Vega, Arturo', 'Operations', 'Maintenance'),
  ('HRT8NYR9D', 'Santiago-Cruz, Kelvin', '129217', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('DHZCXCRUO', 'Soler Maldonado, Angelo', '721151', 'user', 'Procurement - Buyer', 'Fields, Aaron', 'Operations', 'Purchasing'),
  ('14BMVMFNS', 'Vallellanes Fontanez, Joseph', '656459', 'user', 'Greenhouse Worker', 'Baez Rosado, Andrea', 'Operations', 'Transplant'),
  ('XL5L6QT8F', 'Vazquez, Evangelio', '151152', 'user', 'Greenhouse Worker', 'Cruz Alicea, Brian', 'Operations', 'Packing')
ON CONFLICT (employee_id) DO UPDATE SET
  full_name        = EXCLUDED.full_name,
  role             = EXCLUDED.role,
  job_title        = EXCLUDED.job_title,
  reports_to       = EXCLUDED.reports_to,
  home_department  = EXCLUDED.home_department,
  division         = EXCLUDED.division;
-- (access_key intentionally excluded from DO UPDATE — see note above)

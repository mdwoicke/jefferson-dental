-- Add children to PAT-003 (Mike)
-- Run with backend sqlite3 or import via database tool

-- Insert two children for PAT-003
INSERT INTO children (patient_id, name, age, medicaid_id, date_of_birth, special_needs) VALUES
('PAT-003', 'Tony', 8, 'MCD-003-A', '2017-03-15', NULL),
('PAT-003', 'Paula', 6, 'MCD-003-B', '2019-07-22', NULL);

-- Verify insertion
SELECT 'Children added successfully!' as status;
SELECT * FROM children WHERE patient_id = 'PAT-003' ORDER BY age DESC;

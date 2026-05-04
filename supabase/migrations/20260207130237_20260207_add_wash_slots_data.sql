/*
  # Add Car Wash Available Slots

  Seed data with available time slots for the next 30 days
  Each day has slots from 9 AM to 5 PM, every 30 minutes
*/

WITH date_range AS (
  SELECT CURRENT_DATE + INTERVAL '1 day' * (n - 1) AS slot_date
  FROM generate_series(1, 30) AS t(n)
)
, times AS (
  SELECT 
    CURRENT_TIME::time + INTERVAL '30 minutes' * (n - 1) AS slot_time
  FROM generate_series(1, 16) AS t(n)
  WHERE (CURRENT_TIME::time + INTERVAL '30 minutes' * (n - 1)) >= '09:00:00'
    AND (CURRENT_TIME::time + INTERVAL '30 minutes' * (n - 1)) <= '17:00:00'
)
INSERT INTO wash_center_slots (slot_date, slot_time, max_capacity, is_available)
SELECT 
  d.slot_date,
  t.slot_time,
  2,
  true
FROM date_range d
CROSS JOIN times t
ON CONFLICT DO NOTHING;

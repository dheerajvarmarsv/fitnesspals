-- Race Challenge Test Scenarios - SQL Simulation Scripts

-- ====================================================================
-- Setup: Create test race challenge
-- ====================================================================

-- Standard race challenge (7 days, 100 checkpoints)
INSERT INTO challenges (
  id, 
  creator_id, 
  title, 
  description, 
  challenge_type, 
  start_date, 
  end_date, 
  rules,
  status
) VALUES (
  'test-race-challenge', 
  'test-user-id', 
  'Test Race Challenge', 
  'A 7-day race challenge for testing with 100 checkpoints', 
  'race', 
  CURRENT_DATE - INTERVAL '1 day', 
  CURRENT_DATE + INTERVAL '6 days',
  jsonb_build_object(
    'allowed_activities', ARRAY['Workout', 'Steps'],
    'points_per_activity', jsonb_build_object('Workout', 10, 'Steps', 5),
    'metrics', jsonb_build_object('Workout', 'time', 'Steps', 'steps'),
    'totalCheckpoints', 100,
    'pointsPerCheckpoint', 10
  ),
  'active'
);

-- ====================================================================
-- Setup: Create test users and add them to challenge
-- ====================================================================

-- Add test users to the race challenge
INSERT INTO challenge_participants (
  challenge_id,
  user_id,
  status,
  total_points,
  map_position
) VALUES 
-- Steady participant (consistent daily progress)
('test-race-challenge', 'test-user-1', 'active', 0, 0),
-- Fast starter participant (lots of activity early, less later)
('test-race-challenge', 'test-user-2', 'active', 0, 0),
-- Comeback participant (slow start, strong finish)
('test-race-challenge', 'test-user-3', 'active', 0, 0);

-- ====================================================================
-- Scenario 1: Steady Progress Simulation
-- ====================================================================

-- Create activities for steady participant (test-user-1) for past days
-- Day 1 (yesterday)
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'race-activity-day1-user1',
  'test-user-1',
  'Workout',
  45, -- 45 minutes
  'time',
  CURRENT_DATE - INTERVAL '1 day'
);

-- Process yesterday's activity
SELECT updateChallengesWithActivity('race-activity-day1-user1', 'test-user-1');

-- Check user's status after day 1
SELECT 
  cp.user_id,
  cp.map_position,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-race-challenge' AND
  cp.user_id = 'test-user-1';

-- Today's activity (consistent with yesterday)
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'race-activity-today-user1',
  'test-user-1',
  'Workout',
  45, -- 45 minutes
  'time',
  CURRENT_DATE
);

-- Process today's activity
SELECT updateChallengesWithActivity('race-activity-today-user1', 'test-user-1');

-- Check user's status after today
SELECT 
  cp.user_id,
  cp.map_position,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-race-challenge' AND
  cp.user_id = 'test-user-1';

-- ====================================================================
-- Scenario 2: Fast Starter Simulation
-- ====================================================================

-- Create activity for user 2 for yesterday - significant effort
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'race-activity-day1-user2',
  'test-user-2',
  'Workout',
  90, -- 90 minutes (double the steady user)
  'time',
  CURRENT_DATE - INTERVAL '1 day'
);

-- Process yesterday's activity
SELECT updateChallengesWithActivity('race-activity-day1-user2', 'test-user-2');

-- Today's activity for user 2 - still active but less intense
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'race-activity-today-user2',
  'test-user-2',
  'Workout',
  30, -- 30 minutes (reduced effort)
  'time',
  CURRENT_DATE
);

-- Process today's activity
SELECT updateChallengesWithActivity('race-activity-today-user2', 'test-user-2');

-- Check user's status after today
SELECT 
  cp.user_id,
  cp.map_position,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-race-challenge' AND
  cp.user_id = 'test-user-2';

-- ====================================================================
-- Scenario 3: Comeback Participant Simulation
-- ====================================================================

-- Create activity for user 3 for yesterday - minimal effort
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'race-activity-day1-user3',
  'test-user-3',
  'Workout',
  15, -- 15 minutes (minimal effort)
  'time',
  CURRENT_DATE - INTERVAL '1 day'
);

-- Process yesterday's activity
SELECT updateChallengesWithActivity('race-activity-day1-user3', 'test-user-3');

-- Today's activity for user 3 - significant increase in effort
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'race-activity-today-user3',
  'test-user-3',
  'Workout',
  60, -- 60 minutes (increased effort)
  'time',
  CURRENT_DATE
);

-- Also add Steps activity for user 3 today
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  steps,
  metric,
  created_at
) VALUES (
  'race-activity-today-steps-user3',
  'test-user-3',
  'Steps',
  10000, -- 10,000 steps
  'steps',
  CURRENT_DATE
);

-- Process today's activities
SELECT updateChallengesWithActivity('race-activity-today-user3', 'test-user-3');
SELECT updateChallengesWithActivity('race-activity-today-steps-user3', 'test-user-3');

-- Check user's status after today
SELECT 
  cp.user_id,
  cp.map_position,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-race-challenge' AND
  cp.user_id = 'test-user-3';

-- ====================================================================
-- Compare all participants current standings
-- ====================================================================

SELECT 
  cp.user_id,
  cp.map_position,
  cp.total_points,
  c.rules->>'totalCheckpoints' AS total_checkpoints,
  CAST(cp.map_position AS FLOAT) / CAST(c.rules->>'totalCheckpoints' AS FLOAT) * 100 AS completion_percentage
FROM 
  challenge_participants cp
JOIN
  challenges c ON cp.challenge_id = c.id
WHERE 
  cp.challenge_id = 'test-race-challenge'
ORDER BY
  cp.map_position DESC;

-- ====================================================================
-- Full Race Simulation (Remaining 5 days)
-- ====================================================================

-- Day 3: User 1 maintains consistent pace
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'race-activity-day3-user1', 'test-user-1', 'Workout', 45, 'time', 
  CURRENT_DATE + INTERVAL '1 day'
);
SELECT updateChallengesWithActivity('race-activity-day3-user1', 'test-user-1');

-- Day 3: User 2 decreases activity further
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'race-activity-day3-user2', 'test-user-2', 'Workout', 20, 'time', 
  CURRENT_DATE + INTERVAL '1 day'
);
SELECT updateChallengesWithActivity('race-activity-day3-user2', 'test-user-2');

-- Day 3: User 3 continues high effort
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'race-activity-day3-user3', 'test-user-3', 'Workout', 75, 'time', 
  CURRENT_DATE + INTERVAL '1 day'
);
SELECT updateChallengesWithActivity('race-activity-day3-user3', 'test-user-3');

-- Day 4: User 1 maintains consistent pace
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'race-activity-day4-user1', 'test-user-1', 'Workout', 45, 'time', 
  CURRENT_DATE + INTERVAL '2 days'
);
SELECT updateChallengesWithActivity('race-activity-day4-user1', 'test-user-1');

-- Day 4: User 2 skips activity
-- (no activity log for user 2)

-- Day 4: User 3 continues high effort
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'race-activity-day4-user3', 'test-user-3', 'Workout', 90, 'time', 
  CURRENT_DATE + INTERVAL '2 days'
);
SELECT updateChallengesWithActivity('race-activity-day4-user3', 'test-user-3');

-- Day 5-7: Continue pattern and complete race
-- Similar inserts for days 5-7

-- ====================================================================
-- Final race standings
-- ====================================================================

SELECT 
  cp.user_id,
  cp.map_position,
  cp.total_points,
  c.rules->>'totalCheckpoints' AS total_checkpoints,
  CASE 
    WHEN cp.map_position >= (c.rules->>'totalCheckpoints')::int THEN 'Completed'
    ELSE 'In Progress'
  END AS race_status,
  CAST(cp.map_position AS FLOAT) / CAST(c.rules->>'totalCheckpoints' AS FLOAT) * 100 AS completion_percentage
FROM 
  challenge_participants cp
JOIN
  challenges c ON cp.challenge_id = c.id
WHERE 
  cp.challenge_id = 'test-race-challenge'
ORDER BY
  cp.map_position DESC;

-- ====================================================================
-- Cleanup (when testing is complete)
-- ====================================================================

-- DELETE FROM activities WHERE id LIKE 'race-activity-%';
-- DELETE FROM challenge_participants WHERE challenge_id = 'test-race-challenge';
-- DELETE FROM challenges WHERE id = 'test-race-challenge';
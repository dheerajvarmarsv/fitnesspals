-- Survival Challenge Test Scenarios - SQL Simulation Scripts

-- ====================================================================
-- Setup: Create test challenges for different durations
-- ====================================================================

-- Short challenge (5 days)
INSERT INTO challenges (
  id, 
  creator_id, 
  title, 
  description, 
  challenge_type, 
  start_date, 
  end_date, 
  rules,
  survival_settings,
  status
) VALUES (
  'test-short-challenge', 
  'test-user-id', 
  'Test Short Survival Challenge', 
  'A 5-day survival challenge for testing', 
  'survival', 
  CURRENT_DATE - INTERVAL '1 day', 
  CURRENT_DATE + INTERVAL '4 days',
  jsonb_build_object(
    'allowed_activities', ARRAY['Workout'],
    'points_per_activity', jsonb_build_object('Workout', 10),
    'metrics', jsonb_build_object('Workout', 'time'),
    'survival_settings', jsonb_build_object(
      'initial_safe_radius', 1.0,
      'final_safe_radius', 0.1,
      'max_points_per_period', 10,
      'max_movement_per_period', 0.05,
      'timeframe', 'daily',
      'elimination_threshold', 1,
      'start_lives', 3
    )
  ),
  jsonb_build_object(
    'initial_safe_radius', 1.0,
    'final_safe_radius', 0.1,
    'max_points_per_period', 10,
    'max_movement_per_period', 0.05,
    'timeframe', 'daily',
    'elimination_threshold', 1,
    'start_lives', 3
  ),
  'active'
);

-- Medium challenge (10 days)
INSERT INTO challenges (
  id, 
  creator_id, 
  title, 
  description, 
  challenge_type, 
  start_date, 
  end_date, 
  rules,
  survival_settings,
  status
) VALUES (
  'test-medium-challenge', 
  'test-user-id', 
  'Test Medium Survival Challenge', 
  'A 10-day survival challenge for testing', 
  'survival', 
  CURRENT_DATE - INTERVAL '2 day', 
  CURRENT_DATE + INTERVAL '8 days',
  jsonb_build_object(
    'allowed_activities', ARRAY['Workout', 'Steps'],
    'points_per_activity', jsonb_build_object('Workout', 10, 'Steps', 5),
    'metrics', jsonb_build_object('Workout', 'time', 'Steps', 'steps'),
    'survival_settings', jsonb_build_object(
      'initial_safe_radius', 1.0,
      'final_safe_radius', 0.1,
      'max_points_per_period', 10,
      'max_movement_per_period', 0.05,
      'timeframe', 'daily',
      'elimination_threshold', 2,
      'start_lives', 3
    )
  ),
  jsonb_build_object(
    'initial_safe_radius', 1.0,
    'final_safe_radius', 0.1,
    'max_points_per_period', 10,
    'max_movement_per_period', 0.05,
    'timeframe', 'daily',
    'elimination_threshold', 2,
    'start_lives', 3
  ),
  'active'
);

-- Long challenge (14 days)
INSERT INTO challenges (
  id, 
  creator_id, 
  title, 
  description, 
  challenge_type, 
  start_date, 
  end_date, 
  rules,
  survival_settings,
  status
) VALUES (
  'test-long-challenge', 
  'test-user-id', 
  'Test Long Survival Challenge', 
  'A 14-day survival challenge for testing', 
  'survival', 
  CURRENT_DATE - INTERVAL '3 day', 
  CURRENT_DATE + INTERVAL '11 days',
  jsonb_build_object(
    'allowed_activities', ARRAY['Workout', 'Steps', 'Yoga'],
    'points_per_activity', jsonb_build_object('Workout', 10, 'Steps', 5, 'Yoga', 8),
    'metrics', jsonb_build_object('Workout', 'time', 'Steps', 'steps', 'Yoga', 'time'),
    'survival_settings', jsonb_build_object(
      'initial_safe_radius', 1.0,
      'final_safe_radius', 0.1,
      'max_points_per_period', 10,
      'max_movement_per_period', 0.05,
      'timeframe', 'daily',
      'elimination_threshold', 3,
      'start_lives', 3
    )
  ),
  jsonb_build_object(
    'initial_safe_radius', 1.0,
    'final_safe_radius', 0.1,
    'max_points_per_period', 10,
    'max_movement_per_period', 0.05,
    'timeframe', 'daily',
    'elimination_threshold', 3,
    'start_lives', 3
  ),
  'active'
);

-- ====================================================================
-- Setup: Create test users and add them to challenges
-- ====================================================================

-- Add test users to the short challenge
INSERT INTO challenge_participants (
  challenge_id,
  user_id,
  status,
  total_points,
  distance_from_center,
  angle,
  lives,
  days_in_danger,
  is_eliminated
) VALUES 
-- Perfect participant (always logs activities)
('test-short-challenge', 'test-user-1', 'active', 0, 1.0, 0, 3, 0, false),
-- Partial participant (logs some activities)
('test-short-challenge', 'test-user-2', 'active', 0, 1.0, 120, 3, 0, false),
-- Poor participant (rarely logs activities)
('test-short-challenge', 'test-user-3', 'active', 0, 1.0, 240, 3, 0, false);

-- Add test users to the medium challenge
INSERT INTO challenge_participants (
  challenge_id,
  user_id,
  status,
  total_points,
  distance_from_center,
  angle,
  lives,
  days_in_danger,
  is_eliminated
) VALUES 
('test-medium-challenge', 'test-user-1', 'active', 0, 1.0, 0, 3, 0, false),
('test-medium-challenge', 'test-user-2', 'active', 0, 1.0, 120, 3, 0, false),
('test-medium-challenge', 'test-user-3', 'active', 0, 1.0, 240, 3, 0, false);

-- Add test users to the long challenge
INSERT INTO challenge_participants (
  challenge_id,
  user_id,
  status,
  total_points,
  distance_from_center,
  angle,
  lives,
  days_in_danger,
  is_eliminated
) VALUES 
('test-long-challenge', 'test-user-1', 'active', 0, 1.0, 0, 3, 0, false),
('test-long-challenge', 'test-user-2', 'active', 0, 1.0, 120, 3, 0, false),
('test-long-challenge', 'test-user-3', 'active', 0, 1.0, 240, 3, 0, false);

-- ====================================================================
-- Scenario 1: Perfect Participation Simulation
-- ====================================================================

-- Create activities for perfect participant (test-user-1) for past days
-- Day 1 (yesterday)
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'activity-day1-user1',
  'test-user-1',
  'Workout',
  45, -- 45 minutes
  'time',
  CURRENT_DATE - INTERVAL '1 day'
);

-- Process yesterday's activity
SELECT updateChallengesWithActivity('activity-day1-user1', 'test-user-1');

-- Check user's status after day 1
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge' AND
  cp.user_id = 'test-user-1';

-- Simulate today's activity
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'activity-today-user1',
  'test-user-1',
  'Workout',
  45, -- 45 minutes
  'time',
  CURRENT_DATE
);

-- Process today's activity
SELECT updateChallengesWithActivity('activity-today-user1', 'test-user-1');

-- Check user's status after today
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge' AND
  cp.user_id = 'test-user-1';

-- ====================================================================
-- Scenario 2: Partial Participation Simulation
-- ====================================================================

-- Create activity for user 2 for yesterday only (skipping today)
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'activity-day1-user2',
  'test-user-2',
  'Workout',
  45, -- 45 minutes
  'time',
  CURRENT_DATE - INTERVAL '1 day'
);

-- Process yesterday's activity
SELECT updateChallengesWithActivity('activity-day1-user2', 'test-user-2');

-- Check user's status after day 1
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge' AND
  cp.user_id = 'test-user-2';

-- Simulate time progression - process daily survival updates
-- This would be done by a cron job normally
SELECT processDailySurvivalUpdates();

-- Check user status after a day of no activity
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge' AND
  cp.user_id = 'test-user-2';

-- ====================================================================
-- Scenario 3: Elimination Scenario (User 3 - logs no activities)
-- ====================================================================

-- User 3 logs no activities
-- Simulate time progression for 2 days (elimination threshold for short challenge is 1)
SELECT processDailySurvivalUpdates();
SELECT processDailySurvivalUpdates();

-- Check user 3 status - should have lost at least one life or be eliminated
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge' AND
  cp.user_id = 'test-user-3';

-- ====================================================================
-- Scenario 4: Recovery Scenario
-- ====================================================================

-- First, let's get user 2 into danger zone (should be there already from scenario 2)
-- Then log an activity for them to recover
INSERT INTO activities (
  id,
  user_id,
  activity_type,
  duration,
  metric,
  created_at
) VALUES (
  'activity-recovery-user2',
  'test-user-2',
  'Workout',
  60, -- 60 minutes - extra effort to recover
  'time',
  CURRENT_DATE + INTERVAL '1 day'
);

-- Process the recovery activity
SELECT updateChallengesWithActivity('activity-recovery-user2', 'test-user-2');

-- Check if user has moved back toward safe zone
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge' AND
  cp.user_id = 'test-user-2';

-- ====================================================================
-- Complete Challenge Simulation
-- ====================================================================

-- To simulate complete 5-day challenge for user 1 (perfect participant)
-- Day 3
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'activity-day3-user1', 'test-user-1', 'Workout', 45, 'time', 
  CURRENT_DATE + INTERVAL '1 day'
);
SELECT updateChallengesWithActivity('activity-day3-user1', 'test-user-1');
SELECT processDailySurvivalUpdates();

-- Day 4
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'activity-day4-user1', 'test-user-1', 'Workout', 45, 'time', 
  CURRENT_DATE + INTERVAL '2 days'
);
SELECT updateChallengesWithActivity('activity-day4-user1', 'test-user-1');
SELECT processDailySurvivalUpdates();

-- Day 5
INSERT INTO activities (
  id, user_id, activity_type, duration, metric, created_at
) VALUES (
  'activity-day5-user1', 'test-user-1', 'Workout', 45, 'time', 
  CURRENT_DATE + INTERVAL '3 days'
);
SELECT updateChallengesWithActivity('activity-day5-user1', 'test-user-1');
SELECT processDailySurvivalUpdates();

-- Final challenge status for all users
SELECT 
  cp.user_id,
  cp.distance_from_center,
  cp.lives,
  cp.days_in_danger,
  cp.is_eliminated,
  cp.total_points
FROM 
  challenge_participants cp
WHERE 
  cp.challenge_id = 'test-short-challenge'
ORDER BY
  cp.total_points DESC;

-- ====================================================================
-- Cleanup (when testing is complete)
-- ====================================================================

-- DELETE FROM activities WHERE user_id IN ('test-user-1', 'test-user-2', 'test-user-3');
-- DELETE FROM challenge_participants WHERE challenge_id IN ('test-short-challenge', 'test-medium-challenge', 'test-long-challenge');
-- DELETE FROM challenges WHERE id IN ('test-short-challenge', 'test-medium-challenge', 'test-long-challenge');
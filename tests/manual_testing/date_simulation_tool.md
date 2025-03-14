# Challenge Date Simulation Tool

This document provides instructions for simulating date changes to test challenges without waiting for actual days to pass.

## SQL Queries for Date Manipulation

### 1. Modify Challenge Dates

```sql
-- Advance a challenge by X days (moves start/end dates backward)
UPDATE challenges
SET start_date = start_date - INTERVAL 'X days',
    end_date = end_date - INTERVAL 'X days'
WHERE id = 'challenge_id';

-- Set specific dates for a challenge
UPDATE challenges
SET start_date = '2025-03-01',
    end_date = '2025-03-15'
WHERE id = 'challenge_id';
```

### 2. Simulate Activity Logs for Past Dates

```sql
-- Insert activity for a past date
INSERT INTO activities (
    user_id, 
    activity_type, 
    duration, 
    distance, 
    calories, 
    metric, 
    created_at
)
VALUES (
    'user_id', 
    'Workout', 
    30, -- duration in minutes 
    0, -- distance 
    0, -- calories
    'time', -- metric
    '2025-03-05 10:00:00' -- specific past date
);
```

### 3. Adjust Participant Status

```sql
-- Modify a participant's position in the arena
UPDATE challenge_participants
SET distance_from_center = 0.8,
    lives = 2,
    days_in_danger = 1
WHERE user_id = 'user_id' AND challenge_id = 'challenge_id';
```

## Testing a Complete Challenge Lifecycle

### Step 1: Create the Challenge

Create a challenge with a start date in the past and an end date in the future:

```sql
-- Set challenge to have started 5 days ago with 5 days remaining
UPDATE challenges
SET start_date = CURRENT_DATE - INTERVAL '5 days',
    end_date = CURRENT_DATE + INTERVAL '5 days'
WHERE id = 'challenge_id';
```

### Step 2: Simulate Daily Activities

For each past day, create activities:

```sql
-- Day 1 activity (4 days ago)
INSERT INTO activities (user_id, activity_type, duration, metric, created_at)
VALUES ('user_id', 'Workout', 45, 'time', CURRENT_DATE - INTERVAL '4 days');

-- Day 2 activity (3 days ago)
INSERT INTO activities (user_id, activity_type, duration, metric, created_at)
VALUES ('user_id', 'Workout', 30, 'time', CURRENT_DATE - INTERVAL '3 days');

-- Day 3 - missed activity (no insert)

-- Day 4 activity (1 day ago)
INSERT INTO activities (user_id, activity_type, duration, metric, created_at)
VALUES ('user_id', 'Workout', 60, 'time', CURRENT_DATE - INTERVAL '1 day');
```

### Step 3: Process Daily Updates

```sql
-- Execute the processDailySurvivalUpdates function manually
SELECT process_daily_survival_updates();
```

### Step 4: Verify Participant Status

```sql
-- Check participant status after simulated days
SELECT 
    cp.user_id,
    cp.distance_from_center,
    cp.lives,
    cp.days_in_danger,
    cp.is_eliminated,
    c.start_date,
    c.end_date,
    CURRENT_DATE AS today,
    CURRENT_DATE - c.start_date + 1 AS current_day,
    c.end_date - c.start_date + 1 AS total_days
FROM 
    challenge_participants cp
JOIN 
    challenges c ON cp.challenge_id = c.id
WHERE 
    cp.challenge_id = 'challenge_id';
```

## Testing Multiple Scenarios with a Test Script

You can create a script that:

1. Creates a challenge
2. Creates multiple participants 
3. Simulates different activity patterns for each
4. Advances time by executing database updates
5. Verifies results at each step

### Example Script Flow

```
1. Create challenge with 10-day duration
2. Add 3 participants
3. For each day (1-10):
   - Log activities for some/all participants based on scenario
   - Advance time by 1 day
   - Process daily survival updates
   - Verify participant positions and statuses
   - Take screenshots of arena for visual verification
4. Analyze final results
```

## Visual Testing Approach

For each scenario and day:

1. Log in as each test user
2. Navigate to the arena view
3. Take a screenshot
4. Document:
   - User position
   - Safe zone size
   - Lives remaining
   - Days in danger
   - Current day of challenge

## Testing Different Failure Patterns

Create specific activity log patterns for testing different failure scenarios:

1. **Gradual Decline**: Log activities every day but with decreasing completeness
2. **Early Failure**: Skip the first few days entirely
3. **Late Failure**: Start strong but miss the last days
4. **Intermittent Failure**: Alternate between logging and not logging
5. **Recovery**: Enter danger zone, then recover with strong activity logging

## Automating Tests

You can automate these scenarios with:

1. A database script that runs the SQL commands
2. A test suite that verifies expected values
3. Screenshots comparisons for visual verification

This approach allows you to test weeks of challenge progress in minutes.
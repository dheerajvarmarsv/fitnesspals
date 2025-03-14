# Race Challenge Test Plan

This document outlines various test scenarios to verify the correct functioning of race challenges from start to end.

## Test Environment Setup

1. **User Accounts**: Create at least 3 test user accounts (user1, user2, user3)
2. **Challenge Creation**: Create multiple race challenges with different durations:
   - Short race (3-5 days)
   - Medium race (7-10 days)
   - Long race (14+ days)
3. **Time Simulation**: For testing, you'll need to simulate date changes (similar to survival challenges)

## Test Scenarios

### Scenario 1: Perfect Progress

**Description**: User logs all required activities every day and makes steady progress on the race track

**Steps**:
1. Create a race challenge with 100 checkpoints
2. Calculate daily points needed to complete race by end date
3. For each day:
   - Log the required activity meeting/exceeding the target
   - Verify user's position advances on the race track
4. Complete all days of the challenge
5. Verify user reaches the finish line

**Expected Results**:
- User starts at position 0
- Position advances by expected number of checkpoints with each activity
- Progress visualization shows accurate position on map
- User completes the race by reaching the final checkpoint

### Scenario 2: Inconsistent Progress

**Description**: User logs activities irregularly, making uneven progress

**Steps**:
1. Create a 7-day race challenge
2. Log more than required activities on days 1-3
3. Skip logging activities for days 4-5
4. Log required activities for days 6-7
5. Verify race track position throughout

**Expected Results**:
- User advances quickly in first 3 days
- Position remains unchanged during days with no activity
- User makes progress again in final days
- Final position depends on total points accumulated

### Scenario 3: Multiple Participants Competition

**Description**: Test race challenge with multiple participants competing

**Steps**:
1. Create a race challenge with 3 participants
2. For each participant, follow a different activity pattern:
   - User1: Consistent daily activities
   - User2: Intense activities early, then trailing off
   - User3: Slow start, then increasing intensity
3. Track positions of all participants throughout the race
4. Verify leaderboard functionality

**Expected Results**:
- All users start at position 0
- User positions update according to their individual point accumulation
- Leaderboard shows correct ordering of participants
- Race visualization shows multiple users at their respective positions
- Winner is correctly determined based on first to reach finish or highest position at end date

### Scenario 4: Challenge Completion Logic

**Description**: Test how race completion is determined

**Steps**:
1. Create a race with specific end date and checkpoint count
2. Test two scenarios:
   - User reaches final checkpoint before end date
   - End date arrives before user reaches final checkpoint
3. Verify completion status and messaging

**Expected Results**:
- Race is marked complete when user reaches final checkpoint
- Race ends at end date even if final checkpoint not reached
- Final position and completion status are correctly stored and displayed

### Scenario 5: Timeframe Effects (Daily vs. Weekly)

**Description**: Test how timeframe setting affects race mechanics

**Steps**:
1. Create two identical race challenges
   - One with daily timeframe
   - One with weekly timeframe
2. Log identical activities
3. Compare checkpoint advancement

**Expected Results**:
- Weekly challenges require accumulated weekly points to advance
- Daily challenges allow advancement each day
- Overall race completion should be achievable in both formats, but with different progression patterns

## Visual Verification

For each test scenario, verify these visual elements:

1. **Race Track View**:
   - User appears at correct position on the track
   - Checkpoints are properly visualized
   - Progress toward next checkpoint is clear
   - Finish line is visible and distinct

2. **Progress Indicators**:
   - Challenge completion percentage
   - Current position / total checkpoints
   - Days remaining indicator

3. **Leaderboard**:
   - Proper ordering of participants based on position
   - Accurate position information for each participant
   - Highlighting of user's own position

## Database Verification

For comprehensive testing, verify these database values:

1. **challenge_participants table**:
   - map_position updates correctly with each activity
   - total_points accumulate as expected
   - last_awarded_day and last_awarded_week are properly set

2. **challenges table**:
   - pointsPerCheckpoint is correctly calculated based on duration and activities
   - totalCheckpoints matches expected race length

## Testing Tools

1. **Date Manipulation**:
   - SQL script to modify challenge dates
   - Admin tool to advance challenge days

2. **Activity Simulation**:
   - Script to bulk-create activities on specific dates
   - Script to simulate different activity patterns

3. **Progress Metrics**:
   - Tool to calculate expected position based on points
   - Comparison of expected vs. actual position
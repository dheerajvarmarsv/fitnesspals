# Survival Challenge Test Plan

This document outlines various test scenarios to verify the correct functioning of survival challenges from start to end.

## Test Environment Setup

1. **User Accounts**: Create at least 3 test user accounts (user1, user2, user3)
2. **Challenge Creation**: Create multiple survival challenges with different durations:
   - Short challenge (3-5 days)
   - Medium challenge (7-10 days)
   - Long challenge (14+ days)
3. **Time Simulation**: For testing, you'll need to be able to simulate date changes:
   - Option 1: Manually modify database dates for a challenge
   - Option 2: Create a test environment with date simulation capabilities

## Test Scenarios

### Scenario 1: Perfect Participation

**Description**: User logs all required activities every day of the challenge

**Steps**:
1. Create a 7-day survival challenge with specific activity requirements
2. For each day:
   - Log the required activity meeting/exceeding the target
   - Verify user's position in the arena (should continuously move toward center)
   - Verify user remains in the safe zone
   - Verify lives remain at maximum
3. Complete all 7 days
4. Verify user completes the challenge without losing lives
5. Verify final position is near/at center

**Expected Results**:
- User starts at distance_from_center = 1.0 (edge)
- User moves inward with each successful activity log
- User maintains full lives throughout
- User completes challenge successfully
- User's final position should be nearly at center

### Scenario 2: Partial Participation

**Description**: User only logs activities on some days, missing others

**Steps**:
1. Create a 7-day survival challenge
2. Log activities for days 1, 3, 5, 7 (meeting targets)
3. Skip logging activities for days 2, 4, 6
4. Verify position changes on active days
5. Verify danger status on missed days
6. Verify life reduction when enough days in danger accumulate

**Expected Results**:
- User starts at distance_from_center = 1.0
- User moves inward on days with successful logs (1, 3, 5, 7)
- User's position remains unchanged on missed days (2, 4, 6)
- User enters danger zone as safe zone shrinks
- User loses lives after being in danger zone for consecutive days (based on elimination_threshold)
- User should be able to complete challenge but with reduced lives

### Scenario 3: Elimination Scenario

**Description**: User fails to log enough activities and gets eliminated

**Steps**:
1. Create a 10-day survival challenge 
2. Log activities for first 3 days
3. Skip logging activities for next 4-5 days (enough to trigger elimination)
4. Verify user moves to danger zone
5. Verify user loses lives after elimination_threshold days in danger
6. Verify user gets eliminated after losing all lives

**Expected Results**:
- User starts at distance_from_center = 1.0
- User moves inward for first 3 days
- User enters danger zone when safe zone shrinks past their position
- Days in danger counter increases
- User loses a life after elimination_threshold days in danger
- After losing all lives, user is eliminated from challenge
- Eliminated user should be marked and visualized differently in arena

### Scenario 4: Recovery Scenario

**Description**: User recovers from danger zone by logging activities

**Steps**:
1. Create a 10-day survival challenge
2. Log activities for first 2 days
3. Skip logging for next 2 days (enter danger zone)
4. Resume logging for 2 days (recover from danger zone)
5. Verify user's status throughout the challenge

**Expected Results**:
- User starts at distance_from_center = 1.0
- User moves inward for first 2 days
- User enters danger zone after missing days as safe zone shrinks
- User moves toward center when resuming activities
- If user logs enough activity to move back into safe zone, danger counter resets
- User should be able to complete challenge if they move back into safe zone before losing all lives

### Scenario 5: Multiple Participants

**Description**: Test behavior with multiple participants in the same challenge

**Steps**:
1. Create a survival challenge with 3 participants
2. For each participant, follow a different activity pattern:
   - User1: Perfect participation
   - User2: Partial participation
   - User3: Minimal participation
3. Verify how each user's position changes in the arena
4. Verify danger zone and elimination logic works properly for all users

**Expected Results**:
- All users start at distance_from_center = 1.0
- User positions update correctly based on individual activity patterns
- Users are distributed properly around the arena according to their angle values
- Danger zone shrinks uniformly for all users
- Each user's lives are tracked independently
- Users can be eliminated independently based on their own performance

### Scenario 6: Challenge Duration Effects

**Description**: Test how different challenge durations affect the mechanics

**Steps**:
1. Run parallel tests with:
   - Short challenge (3-5 days) with elimination_threshold = 1
   - Medium challenge (7-10 days) with elimination_threshold = 2
   - Long challenge (14+ days) with elimination_threshold = 3
2. Log identical activity patterns for a user in each challenge
3. Verify how the different durations affect:
   - Safe zone shrinking rate
   - Elimination threshold
   - Overall difficulty

**Expected Results**:
- Safe zone shrinks faster in shorter challenges
- Shorter challenges have lower elimination thresholds (fewer days in danger before life loss)
- Movement toward center should be proportionally larger in shorter challenges

## Visual Verification

For each test scenario, verify these visual elements:

1. **Arena View**:
   - Users appear at correct positions based on distance_from_center
   - Safe zone visualized correctly and shrinks over time
   - Danger zone clearly marked
   - Eliminated users have appropriate visual indication

2. **User Status Indicators**:
   - Lives counter shows correct number
   - Days in danger counter is accurate
   - Warning appears when user is in danger zone
   - Final warning appears when user is about to lose a life

3. **Progress Visualization**:
   - Day/progress counter accurately shows challenge progress
   - Challenge completion state is correctly visualized

## Database Verification

For comprehensive testing, verify these database values:

1. **challenge_participants table**:
   - distance_from_center updates correctly
   - lives count decreases appropriately
   - days_in_danger increments/resets according to rules
   - is_eliminated flag set correctly

2. **activities/challenge_activities tables**:
   - Activities are logged correctly
   - Points are calculated and awarded properly

## Automated Testing (Optional)

Consider creating automated tests for:

1. **Unit Tests**:
   - calculateNewDistance function
   - processDangerStatus function
   - Safe zone calculations

2. **Integration Tests**:
   - End-to-end flow of a survival challenge
   - Database updates when activities are logged

## Testing Tools

1. **Date Manipulation**:
   - SQL script to modify challenge dates
   - Admin tool to advance challenge days

2. **Activity Simulation**:
   - Script to bulk-create activities for testing
   - Admin tool to create activities on specific dates

3. **Visual Verification**:
   - Screenshots at each step to document behavior
   - Comparison with expected visualizations
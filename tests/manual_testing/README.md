# Challenge Testing Guide

This directory contains comprehensive test plans and tools for thoroughly testing both Survival and Race challenge types.

## Contents

- `survival_challenge_test_plan.md` - Detailed test scenarios for survival challenges
- `race_challenge_test_plan.md` - Detailed test scenarios for race challenges
- `date_simulation_tool.md` - Methods for simulating date changes to test full challenge lifecycles
- `survival_challenge_simulation.sql` - SQL scripts to test survival challenge mechanics
- `race_challenge_simulation.sql` - SQL scripts to test race challenge mechanics

## Quick Start Guide

1. **Review Test Plans**  
   Start by reviewing the test plans to understand the different scenarios you need to test.

2. **Setup Test Environment**  
   Create test users and challenges using the provided SQL scripts.

3. **Simulate Activities**  
   Run the activity simulation SQL commands to test different participation patterns.

4. **Check Results**  
   Use the SQL queries to verify challenge mechanics are working correctly.

5. **Visual Verification**  
   Log in to the app with test users to verify the UI displays correct information.

## How to Run Tests

### Database Simulation

1. Connect to your Supabase database:
   ```
   psql -h [host] -d [database] -U [user]
   ```

2. Run the simulation scripts:
   ```sql
   \i survival_challenge_simulation.sql
   \i race_challenge_simulation.sql
   ```

### Manual Testing in App

1. Create test users in your app
2. Create challenges with specific parameters from the test plans
3. Use the date simulation techniques to "advance" the challenge timeline
4. Log activities based on the test scenarios
5. Verify the results match expectations

## Key Aspects to Test

### Survival Challenges

- Safe zone shrinking over time
- Movement toward center based on activity completion
- Lives reduction when in danger zone
- Elimination mechanics
- Recovery from danger zone

### Race Challenges

- Progress along race track
- Checkpoint advancement
- Competition between participants
- Completion logic
- Finish line detection

## Reporting Issues

If you find any discrepancies between expected and actual behavior, document:

1. Test scenario used
2. Expected outcome
3. Actual outcome
4. Database state (relevant query results)
5. Screenshots of UI

## Best Practices

- Run tests on a test environment, not production
- Create dedicated test users
- Use descriptive IDs for test entities to make queries easier
- Take screenshots at key points for comparison
- Test both happy paths and edge cases
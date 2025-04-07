Database Schema - Complete Tables and Columns
1. subscription_history
* id: UUID (primary key)
* user_id: UUID (foreign key)
* transaction_id: TEXT
* product_id: TEXT
* subscription_tier: TEXT
* payment_provider: TEXT
* amount: NUMERIC
* currency: TEXT
* start_date: TIMESTAMP
* end_date: TIMESTAMP
* status: TEXT
* created_at: TIMESTAMP
2. friends
* id: UUID (primary key)
* user_id: UUID (foreign key)
* friend_id: UUID (foreign key)
* status_id: TEXT
* created_at: TIMESTAMP
3. friend_requests
* id: UUID (primary key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
4. profile_settings
* id: UUID (primary key)
* timezone: TEXT
* display_mode: TEXT
* use_kilometers: BOOLEAN
* notification_settings: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
5. profiles
* id: UUID (primary key)
* email: TEXT
* nickname: TEXT
* avatar_url: TEXT
* settings: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* trial_stage: TEXT
* subscription_tier: TEXT
* subscription_expiry: TIMESTAMP
* subscription_status: TEXT
* trial_end_date: TIMESTAMP
* plan: TEXT
* description: TEXT
6. challenge
* id: UUID (primary key)
* description: TEXT
* challenge_type: TEXT
* status: TEXT
* start_date: TIMESTAMP
* end_date: TIMESTAMP
* is_private: BOOLEAN
* rules: JSONB
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* survival_settings: JSONB
7. challenge_activities
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* user_id: UUID (foreign key)
* activity_type: TEXT
* points: INTEGER
* target_value: NUMERIC
* metric: TEXT
* timeframe: TEXT
8. activities
* id: UUID (primary key)
* user_id: UUID (foreign key)
* activity_type: TEXT
* duration: NUMERIC
* distance: NUMERIC
* calories: NUMERIC
* steps: INTEGER
* count: INTEGER
* notes: TEXT
* metric: TEXT
* source: TEXT
* created_at: TIMESTAMP
9. challenge_invites
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
10. challenge_participants
* id: UUID (primary key)
* challenge_id: UUID (foreign key)
* user_id: UUID (foreign key)
* status: TEXT
* joined_at: TIMESTAMP
* current_streak: INTEGER
* longest_streak: INTEGER
* total_points: INTEGER
* map_position: INTEGER
* last_awarded_day: DATE
* last_awarded_week: DATE
* last_activity_date: TIMESTAMP
* distance_from_center: NUMERIC
* angle: NUMERIC
* is_eliminated: BOOLEAN
* lives: INTEGER
* days_in_danger: INTEGER
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* processed_activity_ids: TEXT[]
11. challenge_rules
* challenge_id: UUID (foreign key, primary key)
* sender_id: UUID (foreign key)
* receiver_id: UUID (foreign key)
* status: TEXT
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
12. health_data
* id: UUID (primary key)
* user_id: UUID (foreign key)
* date: DATE
* activity_id: UUID
* steps: INTEGER
* distance: NUMERIC
* calories: NUMERIC
* heart_rate: NUMERIC
* sleep_minutes: INTEGER
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
13. user_fitness_connections
* id: UUID (primary key)
* user_id: UUID (foreign key)
* type: TEXT
* connected: BOOLEAN
* last_synced: TIMESTAMP
* permissions: TEXT[]
* created_at: TIMESTAMP
* updated_at: TIMESTAMP
* source_id: TEXT
* expire_at: TIMESTAMP
* status: TEXT
* device_info: JSONB
* last_sync_status: TEXT
* last_sync_error: TEXT
* last_sync_count: INTEGER
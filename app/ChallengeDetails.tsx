import { calculateSafeZoneRadius } from '../lib/survivalUtils';

export default function ChallengeDetails() {
  // ... existing state and hooks ...

  // Check survival status when challenge details are loaded
  useEffect(() => {
    if (challenge?.challenge_type === 'survival' && participant && !loading) {
      const checkSurvivalStatus = async () => {
        try {
          const settings = challenge.survival_settings || 
                          challenge.rules?.survival_settings || 
                          DEFAULT_SURVIVAL_SETTINGS;
          
          // Calculate current safe zone
          const startDate = new Date(challenge.start_date);
          const today = new Date();
          const currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const totalDays = challenge.end_date ? 
            Math.ceil((new Date(challenge.end_date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 
            30;

          const safeZoneRadius = calculateSafeZoneRadius(currentDay, totalDays, settings);
          
          // Check if user is in danger
          const distanceFromCenter = participant.distance_from_center || 1.0;
          const isInDanger = distanceFromCenter > safeZoneRadius;

          if (isInDanger) {
            const daysInDanger = (participant.days_in_danger || 0) + 1;
            const eliminationThreshold = settings.elimination_threshold || 3;

            if (daysInDanger >= eliminationThreshold) {
              // Update participant status
              await supabase
                .from('challenge_participants')
                .update({
                  lives: Math.max(0, (participant.lives || settings.start_lives) - 1),
                  days_in_danger: 0,
                  is_eliminated: participant.lives <= 1
                })
                .eq('id', participant.id);
            } else {
              // Just update days in danger
              await supabase
                .from('challenge_participants')
                .update({
                  days_in_danger: daysInDanger
                })
                .eq('id', participant.id);
            }
          } else {
            // Reset danger days if user is safe
            if (participant.days_in_danger > 0) {
              await supabase
                .from('challenge_participants')
                .update({ days_in_danger: 0 })
                .eq('id', participant.id);
            }
          }
        } catch (error) {
          console.error('Error checking survival status:', error);
        }
      };

      checkSurvivalStatus();
    }
  }, [challenge, participant, loading]);

  // ... rest of the component code ...
} 
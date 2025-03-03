import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Platform, TouchableOpacity, Text } from 'react-native';
import { Arena } from '../../components/Arena';
import { ArenaControls } from '../../components/ArenaControls';
import { ArenaHeader } from '../../components/ArenaHeader';
import { StatusBar } from 'expo-status-bar';
import { useArenaStore } from '../../lib/arenaStore';
import { Info } from 'lucide-react-native';

export default function ArenaScreen() {
  const { currentDay, totalDays } = useArenaStore();
  
  // Show tutorial on first render
  const [showTutorial, setShowTutorial] = React.useState(false);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Info button */}
      <TouchableOpacity 
        style={styles.infoButton}
        onPress={() => setShowTutorial(true)}
      >
        <Info size={24} color="#ffffff" />
      </TouchableOpacity>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ArenaHeader />
        <View style={styles.arenaContainer}>
          <Arena />
        </View>
        <ArenaControls />
        
        {/* Day progress indicator */}
        <View style={styles.dayProgressContainer}>
          <Text style={styles.dayProgressText}>
            Challenge Progress: {Math.round((currentDay / totalDays) * 100)}%
          </Text>
          <View style={styles.dayProgressBarContainer}>
            <View 
              style={[
                styles.dayProgressBar, 
                { width: `${(currentDay / totalDays) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </ScrollView>
      
      {/* Tutorial overlay */}
      {showTutorial && (
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialTitle}>How It Works</Text>
            
            <View style={styles.tutorialItem}>
              <View style={[styles.tutorialDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.tutorialText}>
                Green Zone: Safe area. Stay here to survive!
              </Text>
            </View>
            
            <View style={styles.tutorialItem}>
              <View style={[styles.tutorialDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.tutorialText}>
                Red Zone: Danger area. You'll lose lives here!
              </Text>
            </View>
            
            <View style={styles.tutorialItem}>
              <View style={[styles.tutorialDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.tutorialText}>
                Complete workouts to move toward the safe zone
              </Text>
            </View>
            
            <View style={styles.tutorialItem}>
              <Text style={styles.tutorialText}>
                ❤️ You have 3 lives. Lose all lives and you're eliminated!
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.tutorialButton}
              onPress={() => setShowTutorial(false)}
            >
              <Text style={styles.tutorialButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 100,
  },
  arenaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  infoButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayProgressContainer: {
    width: '90%',
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  dayProgressText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  dayProgressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayProgressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  tutorialCard: {
    width: '80%',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
    }),
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  tutorialDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tutorialText: {
    color: '#d1d5db',
    fontSize: 14,
    flex: 1,
  },
  tutorialButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  tutorialButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
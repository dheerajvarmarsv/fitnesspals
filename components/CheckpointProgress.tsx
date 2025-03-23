import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CheckpointProgressProps {
  currentPoints: number;
  nextCheckpointThreshold: number;
  previousCheckpointThreshold: number;
  totalPointsAccumulated: number;
  checkpointLevel: number;
}

const CheckpointProgress: React.FC<CheckpointProgressProps> = ({
  currentPoints,
  nextCheckpointThreshold,
  previousCheckpointThreshold,
  totalPointsAccumulated,
  checkpointLevel,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [progressWidth, setProgressWidth] = useState(0);
  
  // Calculate points needed for next checkpoint
  const pointsNeededForNext = nextCheckpointThreshold - previousCheckpointThreshold;
  
  // Calculate current progress as percentage
  const currentProgress = Math.min(
    ((currentPoints - previousCheckpointThreshold) / pointsNeededForNext) * 100,
    100
  );
  
  // Calculate surplus points that will carry over
  const surplusPoints = Math.max(0, currentPoints - nextCheckpointThreshold);

  useEffect(() => {
    // Update progress bar width based on current progress
    setProgressWidth(currentProgress);
  }, [currentPoints, nextCheckpointThreshold, previousCheckpointThreshold]);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, isDark && styles.textDark]}>Checkpoint Progress</Text>
        <Text style={[styles.totalPoints, isDark && styles.textDark]}>
          {totalPointsAccumulated} Total Points
        </Text>
      </View>

      <View style={styles.checkpointInfoContainer}>
        <Text style={[styles.checkpointLevel, isDark && styles.textDark]}>
          Level {checkpointLevel}
        </Text>
        <Text style={[styles.pointsInfo, isDark && styles.textDark]}>
          {currentPoints - previousCheckpointThreshold} / {pointsNeededForNext} points
        </Text>
      </View>

      <View style={[styles.progressBarContainer, isDark && styles.progressBarContainerDark]}>
        <LinearGradient
          colors={['#5d77b0', '#4c669f', '#3b5998']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBar, { width: `${progressWidth}%` }]}
        />
      </View>

      <View style={styles.checkpointsContainer}>
        <View style={styles.checkpoint}>
          <View style={[styles.checkpointMarker, styles.checkpointPassed, isDark && styles.checkpointPassedDark]} />
          <Text style={[styles.checkpointText, isDark && styles.textDark]}>
            {previousCheckpointThreshold}
          </Text>
        </View>
        <View style={styles.checkpoint}>
          <View style={[
            styles.checkpointMarker, 
            currentProgress >= 100 ? (isDark ? styles.checkpointPassedDark : styles.checkpointPassed) : (isDark ? styles.checkpointDark : {})
          ]} />
          <Text style={[styles.checkpointText, isDark && styles.textDark]}>
            {nextCheckpointThreshold}
          </Text>
        </View>
      </View>

      {surplusPoints > 0 && (
        <View style={styles.surplusContainer}>
          <Text style={[styles.surplusText, isDark && styles.textDark]}>
            +{surplusPoints} points will carry over to the next checkpoint
          </Text>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalPoints: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  checkpointInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checkpointLevel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  pointsInfo: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#c0c0c0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarContainerDark: {
    backgroundColor: '#444',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  checkpointsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
  },
  checkpoint: {
    alignItems: 'center',
  },
  checkpointMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c0c0c0',
    borderWidth: 2,
    borderColor: '#888',
    marginBottom: 4,
  },
  checkpointPassed: {
    backgroundColor: '#5d77b0',
    borderColor: '#4c669f',
  },
  checkpointPassedDark: {
    backgroundColor: '#5d77b0',
    borderColor: '#4c66a9',
  },
  checkpointDark: {
    backgroundColor: '#555',
    borderColor: '#777',
  },
  checkpointText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  surplusContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#b0b0b0',
  },
  surplusText: {
    fontSize: 14,
    color: '#3b5998',
    fontWeight: '600',
    textAlign: 'center',
  },
  textDark: {
    color: '#f0f0f0',
  },
});

export default CheckpointProgress;
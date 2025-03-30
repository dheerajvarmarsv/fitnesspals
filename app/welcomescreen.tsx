import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, useWindowDimensions, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient'; // <-- 1. Import LinearGradient

const WELCOME_SCREENS = [
  {
    title: 'Track your active life in one place.',
    image: require('../assets/images/1.png'),
  },
  {
    title: 'Set goals and crush them.',
    image: require('../assets/images/2.png'),
  },
  {
    title: 'Connect with fellow athletes.',
    image: require('../assets/images/3.png'),
  },
  {
    title: 'Fuel your fitness with epic gamified challenges.',
    image: require('../assets/images/4.png'),
  },
];

// Example color for pagination dot and login text
const NEW_COLOR = '#FD3A69';

export default function Welcome() {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const handleDotPress = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentPage(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.logoContainer, isLandscape && styles.logoContainerLandscape]}>
        <Image
          source={require('../assets/images/logo.png')}
          style={[styles.logo, isLandscape && styles.logoLandscape]}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {WELCOME_SCREENS.map((screen, index) => (
          <View key={index} style={[styles.page, { width }]}>
            <View style={[styles.contentContainer, isLandscape && styles.contentContainerLandscape]}>
              <Image
                source={screen.image}
                style={[styles.image, isLandscape && styles.imageLandscape]}
                resizeMode="contain"
              />
              <Text style={[styles.title, isLandscape && styles.titleLandscape]}>{screen.title}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomContainer, isLandscape && styles.bottomContainerLandscape]}>
        <View style={styles.pagination}>
          {WELCOME_SCREENS.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              style={[
                styles.paginationDot,
                currentPage === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <View style={[styles.buttonContainer, isLandscape && styles.buttonContainerLandscape]}>
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            style={[styles.joinButton, isLandscape && styles.joinButtonLandscape]}
            activeOpacity={0.9}
          >
            {/* 2. Wrap the text in a gradient */}
            <LinearGradient
              colors={['#F58529', '#DD2A7B']}
              style={styles.gradientBackground}
            >
              <Text style={styles.joinButtonText}>Join for free</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLandscape && styles.loginButtonLandscape]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoContainerLandscape: {
    paddingVertical: 8,
  },
  logo: {
    width: '80%',
    height: 180,
  },
  logoLandscape: {
    height: 100,
  },
  scrollView: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  contentContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: '5%',
  },
  image: {
    width: '90%',
    height: '60%',
    borderRadius: 20,
  },
  imageLandscape: {
    width: '45%',
    height: '80%',
  },
  title: {
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: 'normal',
    color: '#000',
    textAlign: 'center',
    marginTop: 20,
  },
  titleLandscape: {
    width: '45%',
    marginTop: 0,
    fontSize: 22,
  },
  bottomContainer: {
    width: '100%',
  },
  bottomContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: NEW_COLOR,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
  },
  buttonContainerLandscape: {
    width: '40%',
    paddingHorizontal: 0,
  },
  joinButton: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden', // ensures gradient corners are rounded
  },
  joinButtonLandscape: {
    marginBottom: 8,
  },
  gradientBackground: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
    color: '#fff',
  },
  loginButton: {
    padding: 16,
    alignItems: 'center',
  },
  loginButtonLandscape: {
    padding: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
    color: NEW_COLOR,
  },
});
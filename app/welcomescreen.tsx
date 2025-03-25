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
  const { width } = useWindowDimensions();

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
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
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
            <Image
              source={screen.image}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.title}>{screen.title}</Text>
          </View>
        ))}
      </ScrollView>

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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => router.push('/signup')}
          style={styles.joinButton}
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
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>
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
  // 3. Make the logo 2-3 times bigger than before
  logo: {
    width: '80%',
    height: 180,
  },
  scrollView: {
    flex: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: '90%',
    height: '60%',
    borderRadius: 20,
  },
  // 4. Use normal weight for the title
  title: {
    fontSize: 24,
    fontFamily: 'System', // iOS typically uses SF, Android uses Roboto
    fontWeight: 'normal',
    color: '#000',
    textAlign: 'center',
    marginTop: 20,
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
  },
  // 5. Remove backgroundColor; gradient is used instead
  joinButton: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden', // ensures gradient corners are rounded
  },
  // 6. Style for the gradient wrapper
  gradientBackground: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  // 7. Normal weight for the button text
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
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
    color: NEW_COLOR,
  },
});
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  Animated
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home as HomeIcon, FileText, Search, ShieldAlert, LifeBuoy } from 'lucide-react-native';

// Import screens
import Home from './pages/Home';
import SubmitTicket from './pages/SubmitTicket';
import TrackTicket from './pages/TrackTicket';
import StaffDashboard from './pages/StaffDashboard';

// 1. Premium Fade & Slide Up Page Transition Wrapper
function FadeInView({ children }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(15);
    
    // Play transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      })
    ]).start();
  }, []); // Triggers only when component mounts (on page changes due to key prop)

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// 2. Tactile Bounce Press Navigation Tab Button
function AnimatedTabButton({ active, onPress, children }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.90,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function App() {
  const [currentView, setView] = useState('home');
  const [trackCredentials, setTrackCredentials] = useState(null);

  // Render the active screen with the FadeInView wrapper
  const renderScreen = () => {
    let screen;
    switch (currentView) {
      case 'home':
        screen = <Home setView={setView} />;
        break;
      case 'submit-ticket':
        screen = (
          <SubmitTicket 
            setView={setView} 
            setTrackCredentials={setTrackCredentials} 
          />
        );
        break;
      case 'track-ticket':
        screen = (
          <TrackTicket 
            setView={setView} 
            trackCredentials={trackCredentials}
            setTrackCredentials={setTrackCredentials}
          />
        );
        break;
      case 'staff-dashboard':
        screen = <StaffDashboard setView={setView} />;
        break;
      default:
        screen = <Home setView={setView} />;
    }

    return (
      <FadeInView key={currentView}>
        {screen}
      </FadeInView>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Brand Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.brandContainer} onPress={() => setView('home')}>
            <View style={styles.logoBox}>
              <LifeBuoy size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>SUPPORT CENTER</Text>
              <Text style={styles.brandSubtitle}>Support Ticket System</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>
              {currentView === 'staff-dashboard' ? 'Staff Operator' : 'Client Guest'}
            </Text>
          </View>
        </View>

        {/* Main Screen Viewport */}
        <View style={styles.mainContainer}>
          {renderScreen()}
        </View>

        {/* Bottom Navigation Tab Bar */}
        <View style={styles.tabBar}>
          <AnimatedTabButton 
            active={currentView === 'home'} 
            onPress={() => setView('home')}
          >
            <HomeIcon 
              size={20} 
              color={currentView === 'home' ? '#2563EB' : '#64748B'} 
            />
            <Text style={[styles.tabLabel, currentView === 'home' && styles.tabLabelActive]}>
              Home
            </Text>
          </AnimatedTabButton>

          <AnimatedTabButton 
            active={currentView === 'submit-ticket'} 
            onPress={() => setView('submit-ticket')}
          >
            <FileText 
              size={20} 
              color={currentView === 'submit-ticket' ? '#2563EB' : '#64748B'} 
            />
            <Text style={[styles.tabLabel, currentView === 'submit-ticket' && styles.tabLabelActive]}>
              New Ticket
            </Text>
          </AnimatedTabButton>

          <AnimatedTabButton 
            active={currentView === 'track-ticket'} 
            onPress={() => setView('track-ticket')}
          >
            <Search 
              size={20} 
              color={currentView === 'track-ticket' ? '#2563EB' : '#64748B'} 
            />
            <Text style={[styles.tabLabel, currentView === 'track-ticket' && styles.tabLabelActive]}>
              Track
            </Text>
          </AnimatedTabButton>

          <AnimatedTabButton 
            active={currentView === 'staff-dashboard'} 
            onPress={() => setView('staff-dashboard')}
          >
            <ShieldAlert 
              size={20} 
              color={currentView === 'staff-dashboard' ? '#2563EB' : '#64748B'} 
            />
            <Text style={[styles.tabLabel, currentView === 'staff-dashboard' && styles.tabLabelActive]}>
              Staff Desk
            </Text>
          </AnimatedTabButton>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  roleContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mainContainer: {
    flex: 1,
  },
  tabBar: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    width: 80,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});

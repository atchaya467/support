import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  Animated,
  ScrollView
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home as HomeIcon, FileText, Search, ShieldAlert, LifeBuoy } from 'lucide-react-native';

// Import screens
import Home from './pages/Home';
import SubmitTicket from './pages/SubmitTicket';
import TrackTicket from './pages/TrackTicket';
import StaffDashboard from './pages/StaffDashboard';

// Premium Fade & Slide Up Page Transition Wrapper
function FadeInView({ children }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

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

export default function App() {
  const [currentView, setView] = useState('home');
  const [trackCredentials, setTrackCredentials] = useState(null);
  
  // Shared Staff Authentication state
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);

  const handleStaffSignOut = () => {
    setIsStaffAuthenticated(false);
    setView('home');
  };

  // Render the active screen
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
        screen = (
          <StaffDashboard 
            setView={setView} 
            isAuthenticated={isStaffAuthenticated}
            setIsAuthenticated={setIsStaffAuthenticated}
          />
        );
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

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Web-Style Header Container */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.brandContainer} onPress={() => setView('home')}>
              <Text style={styles.brandTitle}>SUPPORT CENTER</Text>
              <Text style={styles.brandSubtitle}>Support Ticket System</Text>
            </TouchableOpacity>

            {/* Top Right: User Sign In/Sign Out Link */}
            <View style={styles.topRight}>
              {isStaffAuthenticated ? (
                <View style={styles.topRightRow}>
                  <Text style={styles.userNameText}>Staff Operator</Text>
                  <Text style={styles.divider}>|</Text>
                  <TouchableOpacity onPress={handleStaffSignOut}>
                    <Text style={styles.signInLink}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.topRightRow}>
                  <Text style={styles.userNameText}>Guest User</Text>
                  <Text style={styles.divider}>|</Text>
                  <TouchableOpacity onPress={() => setView('staff-dashboard')}>
                    <Text style={styles.signInLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Web-Style Horizontal Navigation Bar */}
          <View style={styles.navigationBar}>
            <TouchableOpacity 
              style={[styles.navTab, currentView === 'home' && styles.navTabActive]} 
              onPress={() => setView('home')}
            >
              <HomeIcon size={14} color={currentView === 'home' ? '#2563EB' : '#475569'} style={styles.navIcon} />
              <Text style={[styles.navLabel, currentView === 'home' && styles.navLabelActive]}>
                Support Center Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navTab, currentView === 'submit-ticket' && styles.navTabActive]} 
              onPress={() => setView('submit-ticket')}
            >
              <FileText size={14} color={currentView === 'submit-ticket' ? '#2563EB' : '#475569'} style={styles.navIcon} />
              <Text style={[styles.navLabel, currentView === 'submit-ticket' && styles.navLabelActive]}>
                Open a New Ticket
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navTab, currentView === 'track-ticket' && styles.navTabActive]} 
              onPress={() => setView('track-ticket')}
            >
              <Search size={14} color={currentView === 'track-ticket' ? '#2563EB' : '#475569'} style={styles.navIcon} />
              <Text style={[styles.navLabel, currentView === 'track-ticket' && styles.navLabelActive]}>
                Check Ticket Status
              </Text>
            </TouchableOpacity>

            {isStaffAuthenticated && (
              <TouchableOpacity 
                style={[styles.navTab, currentView === 'staff-dashboard' && styles.navTabActive]} 
                onPress={() => setView('staff-dashboard')}
              >
                <ShieldAlert size={14} color={currentView === 'staff-dashboard' ? '#2563EB' : '#475569'} style={styles.navIcon} />
                <Text style={[styles.navLabel, currentView === 'staff-dashboard' && styles.navLabelActive]}>
                  Ticket List (Staff Panel)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Main Viewport */}
          <View style={styles.mainContainer}>
            {renderScreen()}
          </View>

          {/* Web-Style Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Copyright &copy; 2026 osTicket :: Support Ticket System - All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Platform.OS === 'web' ? '10%' : 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  brandContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: -2,
  },
  topRight: {
    paddingBottom: 4,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userNameText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  divider: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 8,
  },
  signInLink: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  navigationBar: {
    height: 40,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  navTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navIcon: {
    marginRight: 6,
  },
  navLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  mainContainer: {
    flex: 1,
    minHeight: 450,
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

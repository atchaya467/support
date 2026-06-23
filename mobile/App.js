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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FileText, Plus } from 'lucide-react-native';

// Import screens
import SubmitTicket from './pages/SubmitTicket';
import TrackTicket from './pages/TrackTicket';
import UserDashboard from './pages/UserDashboard';
import UserLogin from './pages/UserLogin';

// Smooth Fade + Slide-Up page transition
function FadeInView({ children, viewKey }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [viewKey]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [currentView, setView] = useState('user-login');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [trackCredentials, setTrackCredentials] = useState(null);

  const handleUserLoginSuccess = (email, name = '', phone = '') => {
    setIsUserAuthenticated(true);
    setUserEmail(email);
    setUserName(name);
    setUserPhone(phone);
    setView('user-dashboard');
  };

  const handleUserSignOut = () => {
    setIsUserAuthenticated(false);
    setUserEmail('');
    setUserName('');
    setUserPhone('');
    setTrackCredentials(null);
    setView('user-login');
  };

  const renderScreen = () => {
    let screen;
    switch (currentView) {
      case 'user-login':
        screen = <UserLogin onLoginSuccess={handleUserLoginSuccess} />;
        break;
      case 'submit-ticket':
        screen = (
          <SubmitTicket
            setView={setView}
            setTrackCredentials={setTrackCredentials}
            userEmail={userEmail}
            userName={userName}
            userPhone={userPhone}
          />
        );
        break;
      case 'track-ticket':
        screen = (
          <TrackTicket
            setView={setView}
            trackCredentials={trackCredentials}
            setTrackCredentials={setTrackCredentials}
            userEmail={userEmail}
          />
        );
        break;
      case 'user-dashboard':
        screen = <UserDashboard setView={setView} userEmail={userEmail} />;
        break;
      default:
        screen = isUserAuthenticated
          ? <UserDashboard setView={setView} userEmail={userEmail} />
          : <UserLogin onLoginSuccess={handleUserLoginSuccess} />;
    }

    return (
      <FadeInView key={currentView} viewKey={currentView}>
        {screen}
      </FadeInView>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ── Fixed Header ── */}
        <View style={[styles.header, isWide && styles.headerWide]}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              style={styles.brandContainer}
              onPress={() => isUserAuthenticated && setView('user-dashboard')}
              activeOpacity={isUserAuthenticated ? 0.7 : 1}
            >
              <Text style={[styles.brandTitle, isWide && styles.brandTitleWide]}>
                SUPPORT CENTER
              </Text>
              <Text style={styles.brandSubtitle}>Support Ticket System</Text>
            </TouchableOpacity>

            {isUserAuthenticated && (
              <View style={styles.userInfoBox}>
                <Text style={styles.userEmailText} numberOfLines={1}>
                  {userEmail}
                </Text>
                <Text style={styles.divider}>|</Text>
                <TouchableOpacity onPress={handleUserSignOut}>
                  <Text style={styles.signOutLink}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── Fixed Nav Bar (only when authenticated) ── */}
        {isUserAuthenticated && (
          <View style={[styles.navBarOuter, isWide && styles.navBarWide]}>
            <View style={styles.navigationBar}>
              <TouchableOpacity
                style={[styles.navTab, currentView === 'user-dashboard' && styles.navTabActive]}
                onPress={() => setView('user-dashboard')}
              >
                <FileText
                  size={14}
                  color={currentView === 'user-dashboard' ? '#2563EB' : '#475569'}
                  style={styles.navIcon}
                />
                <Text style={[styles.navLabel, currentView === 'user-dashboard' && styles.navLabelActive]}>
                  My Tickets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navTab, currentView === 'submit-ticket' && styles.navTabActive]}
                onPress={() => setView('submit-ticket')}
              >
                <Plus
                  size={14}
                  color={currentView === 'submit-ticket' ? '#2563EB' : '#475569'}
                  style={styles.navIcon}
                />
                <Text style={[styles.navLabel, currentView === 'submit-ticket' && styles.navLabelActive]}>
                  New Ticket
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Main Content Area (flex: 1 → fills remaining space) ── */}
        <View style={[styles.mainContainer, isWide && styles.mainContainerWide]}>
          {renderScreen()}
        </View>

        {/* ── Fixed Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Support Center · All rights reserved.
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Header ──
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  headerWide: {
    paddingHorizontal: '10%',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandTitleWide: {
    fontSize: 24,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: -2,
  },
  userInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '55%',
  },
  userEmailText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flexShrink: 1,
  },
  divider: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  signOutLink: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Nav Bar ──
  navBarOuter: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBarWide: {
    paddingHorizontal: '10%',
  },
  navigationBar: {
    height: 38,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginRight: 4,
  },
  navTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
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

  // ── Main Content ── (THIS IS THE KEY FIX: flex: 1 in a View, not ScrollView)
  mainContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  mainContainerWide: {
    // On wide screens, constrain content width but keep full height
  },

  // ── Footer ──
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

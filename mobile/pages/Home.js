import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ticket, Search, ShieldCheck, ChevronRight } from 'lucide-react-native';

export default function Home({ setView }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Hero Gradient Banner */}
      <LinearGradient
        colors={['#1E3A8A', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <Text style={styles.heroTitle}>Support Center</Text>
        <Text style={styles.heroDesc}>
          Welcome to our modern commercial vehicle Help Desk. Open a new service request or monitor the real-time status of your active tickets.
        </Text>
      </LinearGradient>

      {/* 2. Operations Grid */}
      <View style={styles.gridContainer}>
        
        {/* Open Ticket Card */}
        <View style={styles.actionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
              <Ticket size={24} color="#1E40AF" />
            </View>
            <Text style={styles.cardTitle}>Open New Ticket</Text>
          </View>
          <Text style={styles.cardDesc}>
            Need roadside repairs or spare parts inspection? Log details about your vehicle and issue here.
          </Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#1E40AF' }]}
            onPress={() => setView('submit-ticket')}
          >
            <Text style={styles.actionButtonText}>Create Support Ticket</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Check Status Card */}
        <View style={styles.actionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FEF3C7' }]}>
              <Search size={24} color="#D97706" />
            </View>
            <Text style={styles.cardTitle}>Track Status</Text>
          </View>
          <Text style={styles.cardDesc}>
            View status phases, technician comments, and chat directly with mechanics regarding active repairs.
          </Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#0F172A' }]}
            onPress={() => setView('track-ticket')}
          >
            <Text style={styles.actionButtonText}>Check Ticket Status</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

      </View>

      {/* 3. Trust Panel */}
      <View style={styles.trustCard}>
        <Text style={styles.trustHeader}>Engineering Trust & Reliability</Text>
        
        <View style={styles.trustItem}>
          <ShieldCheck size={20} color="#10B981" />
          <View style={styles.trustTextCol}>
            <Text style={styles.trustTitle}>Certified Service Technicians</Text>
            <Text style={styles.trustSub}>Professional diagnostics and repair execution</Text>
          </View>
        </View>

        <View style={styles.trustItem}>
          <ShieldCheck size={20} color="#10B981" />
          <View style={styles.trustTextCol}>
            <Text style={styles.trustTitle}>Priority Roadside Support</Text>
            <Text style={styles.trustSub}>Urgent vehicle breakdowns receive immediate triage</Text>
          </View>
        </View>

        <View style={styles.trustItem}>
          <ShieldCheck size={20} color="#10B981" />
          <View style={styles.trustTextCol}>
            <Text style={styles.trustTitle}>Transparent Timeline logs</Text>
            <Text style={styles.trustSub}>Complete conversation history between staff & clients</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  heroBanner: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    opacity: 0.9,
  },
  gridContainer: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trustCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  trustTextCol: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  trustSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});

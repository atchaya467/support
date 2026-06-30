import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Send,
  Printer,
  Edit3,
  Mail,
  Phone,
  User,
  Clock,
  Tag,
  MessageSquare,
} from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function TrackTicket({
  setView,
  trackCredentials,
  setTrackCredentials,
  userEmail,
}) {
  const [email, setEmail] = useState(trackCredentials?.email || userEmail || '');
  const [ticketNumber, setTicketNumber] = useState(trackCredentials?.ticketNumber || '');
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (trackCredentials?.email && trackCredentials?.ticketNumber) {
      handleLookup(trackCredentials.email, trackCredentials.ticketNumber);
    }
  }, []);

  useEffect(() => {
    if (userEmail) setEmail(userEmail);
  }, [userEmail]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ticket]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeStyle = (status) => {
    switch ((status || 'Open').toLowerCase()) {
      case 'closed':
        return styles.statusClosed;
      case 'resolved':
        return styles.statusResolved;
      case 'in progress':
        return styles.statusProgress;
      default:
        return styles.statusOpen;
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch ((priority || 'Normal').toLowerCase()) {
      case 'emergency':
        return styles.priorityEmergency;
      case 'high':
        return styles.priorityHigh;
      case 'medium':
        return styles.priorityMedium;
      case 'low':
        return styles.priorityLow;
      default:
        return styles.priorityNormal;
    }
  };

  const handleLookup = async (customEmail, customTicketNumber) => {
    setError('');

    const lookupEmail = (customEmail || email).trim();
    const lookupTicketNumber = (customTicketNumber || ticketNumber).trim();

    if (!lookupEmail) return setError('Please enter your email address.');
    if (!lookupTicketNumber) return setError('Please enter your ticket number.');

    setLoading(true);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/tickets/track?email=${encodeURIComponent(
          lookupEmail
        )}&ticket_number=${encodeURIComponent(lookupTicketNumber)}`
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ticket not found.');

      setTicket(data);
      setTrackCredentials({
        email: lookupEmail,
        ticketNumber: lookupTicketNumber,
      });

      await fetchReplies(data.id);
    } catch (err) {
      setError(err.message || 'Unable to load ticket.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (ticketId) => {
    setRepliesLoading(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${ticketId}/replies`);
      if (!response.ok) throw new Error('Failed to load replies.');
      const data = await response.json();
      setReplies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleBack = () => {
    setTicket(null);
    setReplies([]);
    setTicketNumber('');
    setTrackCredentials(null);
  };

  const handlePostReply = async () => {
    if (!ticket || !newReply.trim()) return;

    setSubmittingReply(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${ticket.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'Client',
          name: ticket.name,
          message: newReply.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to post reply.');

      setReplies(prev => [...prev, data]);
      setNewReply('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Error posting reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (!ticket) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.lookupContainer}>
        <Animated.View
          style={[
            styles.lookupBox,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.backLink} onPress={() => setView('user-dashboard')}>
            <ArrowLeft size={16} color="#2563EB" />
            <Text style={styles.backLinkText}>Back to Tickets</Text>
          </TouchableOpacity>

          <Text style={styles.lookupTitle}>Check Ticket Status</Text>
          <Text style={styles.lookupSubtitle}>
            Enter email and ticket number to view ticket details.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.formLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, !!userEmail && styles.disabledInput]}
            value={email}
            onChangeText={setEmail}
            editable={!userEmail && !loading}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="customer@email.com"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.formLabel}>Ticket Number</Text>
          <TextInput
            style={styles.input}
            value={ticketNumber}
            onChangeText={setTicketNumber}
            editable={!loading}
            autoCapitalize="none"
            placeholder="AL-123456"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={styles.lookupButton}
            onPress={() => handleLookup(email, ticketNumber)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.buttonRow}>
                <Search size={16} color="#FFFFFF" />
                <Text style={styles.lookupButtonText}>Search Ticket</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        style={[
          styles.container,
          styles.detailContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.smallButton} onPress={handleBack}>
            <ArrowLeft size={14} color="#111827" />
            <Text style={styles.smallButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleLookup(ticket.email, ticket.ticket_number)}
            >
              <RefreshCw size={13} color="#111827" />
              <Text style={styles.smallButtonText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallButton}>
              <Printer size={13} color="#111827" />
              <Text style={styles.smallButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallButton}>
              <Edit3 size={13} color="#111827" />
              <Text style={styles.smallButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.ticketHeadingRow}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketMeta}>{ticket.ticket_number}</Text>
              <Text style={styles.ticketHeading}>
                {ticket.help_topic_name || 'Support Ticket'}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, getStatusBadgeStyle(ticket.status)]}>
                <Text style={styles.badgeText}>{ticket.status}</Text>
              </View>
              <View style={[styles.statusBadge, getPriorityBadgeStyle(ticket.priority)]}>
                <Text style={styles.badgeText}>{ticket.priority || 'Normal'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Basic Ticket Information</Text>

            <View style={styles.infoRow}>
              <Clock size={14} color="#2563EB" />
              <Text style={styles.infoLabel}>Create Date</Text>
              <Text style={styles.infoValue}>{formatDateTime(ticket.created_at)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Tag size={14} color="#2563EB" />
              <Text style={styles.infoLabel}>Ticket Type</Text>
              <Text style={styles.infoValue}>{ticket.help_topic_name || 'Support Ticket'}</Text>
            </View>

            <View style={styles.infoRow}>
              <RefreshCw size={14} color="#2563EB" />
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{ticket.status}</Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>User Information</Text>

            <View style={styles.infoRow}>
              <User size={14} color="#2563EB" />
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{ticket.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Mail size={14} color="#2563EB" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{ticket.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Phone size={14} color="#2563EB" />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{ticket.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.messagePanel}>
          <View style={styles.messageHeader}>
            <MessageSquare size={15} color="#2563EB" />
            <Text style={styles.messageHeaderText}>
              {ticket.name} posted {formatDateTime(ticket.created_at)}
            </Text>
          </View>

          <Text style={styles.messageBody}>
            {replies[0]?.message || ticket.help_topic_name || 'Ticket created.'}
          </Text>
        </View>

        <View style={styles.timelineLine}>
          <Text style={styles.timelineText}>
            Created by <Text style={styles.bold}>{ticket.name}</Text> {formatDateTime(ticket.created_at)}
          </Text>
        </View>

        <Text style={styles.replyTitle}>Post Reply</Text>

        <View style={styles.replyBox}>
          <TextInput
            style={styles.replyInput}
            value={newReply}
            onChangeText={setNewReply}
            multiline
            placeholder="Type your reply..."
            placeholderTextColor="#9CA3AF"
            editable={!submittingReply}
          />

          <TouchableOpacity
            style={[styles.sendButton, !newReply.trim() && styles.sendButtonDisabled]}
            onPress={handlePostReply}
            disabled={submittingReply || !newReply.trim()}
          >
            {submittingReply ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.replyTitle}>Conversation</Text>

        {repliesLoading ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 16 }} />
        ) : replies.length === 0 ? (
          <View style={styles.emptyConversation}>
            <Text style={styles.emptyReplies}>No replies yet.</Text>
          </View>
        ) : (
          <ScrollView style={styles.replyList}>
            {replies.map(reply => (
              <View key={reply.id} style={styles.replyItem}>
                <View style={styles.replyItemHeader}>
                  <Text style={styles.replySender}>
                    {reply.sender === 'Staff' ? 'Support Team' : reply.name}
                  </Text>
                  <Text style={styles.replyDate}>{formatDateTime(reply.created_at)}</Text>
                </View>
                <Text style={styles.replyMessage}>{reply.message}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  lookupContainer: {
    padding: 18,
    minHeight: '100%',
    justifyContent: 'center',
  },
  lookupBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  backLinkText: {
    color: '#2563EB',
    fontWeight: '800',
  },
  lookupTitle: {
    fontSize: 26,
    color: '#111827',
    fontWeight: '900',
    marginBottom: 6,
  },
  lookupSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#64748B',
  },
  lookupButton: {
    height: 42,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  lookupButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailContainer: {
    padding: 16,
    paddingBottom: 10,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 34,
  },
  smallButtonText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  ticketHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  ticketMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '900',
    marginBottom: 2,
  },
  ticketHeading: {
    fontSize: 22,
    color: '#111827',
    fontWeight: '900',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    textTransform: 'uppercase',
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusProgress: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusResolved: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  statusClosed: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  priorityEmergency: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  priorityHigh: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },
  priorityMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  priorityNormal: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  priorityLow: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoColumn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  infoLabel: {
    width: 90,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '800',
  },
  messagePanel: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  messageHeader: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageHeaderText: {
    fontWeight: '900',
    color: '#111827',
  },
  messageBody: {
    padding: 12,
    minHeight: 38,
    color: '#111827',
  },
  timelineLine: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  timelineText: {
    fontSize: 13,
    color: '#64748B',
  },
  bold: {
    fontWeight: '900',
    color: '#111827',
  },
  replyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  replyInput: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: '#111827',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  emptyConversation: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
  },
  emptyReplies: {
    color: '#64748B',
    fontWeight: '700',
  },
  replyList: {
    maxHeight: 150,
  },
  replyItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  replyItemHeader: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replySender: {
    fontWeight: '900',
    color: '#111827',
  },
  replyDate: {
    color: '#64748B',
    fontSize: 12,
  },
  replyMessage: {
    padding: 12,
    color: '#111827',
    lineHeight: 20,
  },
});
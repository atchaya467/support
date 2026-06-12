import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { Search, ArrowLeft, RefreshCw, FileText, User, Truck, Calendar, MessageSquare, Send } from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function TrackTicket({ setView, trackCredentials, setTrackCredentials }) {
  // Authentication lookup state
  const [email, setEmail] = useState(trackCredentials?.email || '');
  const [ticketNumber, setTicketNumber] = useState(trackCredentials?.ticketNumber || '');
  
  // App states
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState('');
  const [replySuccess, setReplySuccess] = useState(false);

  // Auto load ticket if credentials exist on mount
  useEffect(() => {
    if (trackCredentials?.email && trackCredentials?.ticketNumber) {
      handleLookup(trackCredentials.email, trackCredentials.ticketNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lookup API call
  const handleLookup = async (customEmail, customNum) => {
    setError('');
    setTicket(null);
    setReplies([]);

    // Safeguard against event objects passed by direct onPress callbacks
    const validEmail = typeof customEmail === 'string' ? customEmail : '';
    const validNum = typeof customNum === 'string' ? customNum : '';

    const lookupEmail = (validEmail || email).trim();
    const lookupNum = (validNum || ticketNumber).trim();

    if (!lookupEmail || !lookupNum) {
      setError('Please enter both your email address and ticket reference number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch ticket details
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/track?email=${encodeURIComponent(lookupEmail)}&ticket_number=${encodeURIComponent(lookupNum)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ticket not found. Verify email and reference number.');
      }

      setTicket(data);
      // Save credentials to keep session
      setTrackCredentials({ email: lookupEmail, ticketNumber: lookupNum });

      // 2. Fetch replies
      const repliesResponse = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${data.id}/replies`);
      if (repliesResponse.ok) {
        const repliesData = await repliesResponse.json();
        setReplies(repliesData);
      }
    } catch (err) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Submit reply
  const handlePostReply = async () => {
    if (!newReply.trim()) return;

    setSubmittingReply(true);
    setReplySuccess(false);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${ticket.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: 'Client',
          name: ticket.name,
          message: newReply.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit reply');
      }

      setReplies(prev => [...prev, data]);
      setNewReply('');
      setReplySuccess(true);
      setTimeout(() => setReplySuccess(false), 3000);
    } catch (err) {
      Alert.alert('Error', err.message || 'Error posting reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleClearCredentials = () => {
    setTicket(null);
    setReplies([]);
    setTrackCredentials(null);
    setEmail('');
    setTicketNumber('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Emergency': return styles.badgeRed;
      case 'High': return styles.badgeOrange;
      case 'Medium': return styles.badgeYellow;
      default: return styles.badgeGray;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Resolved': return styles.badgeGreen;
      case 'In Progress': return styles.badgeYellow;
      case 'Closed': return styles.badgeGray;
      default: return styles.badgeBlue;
    }
  };

  // VIEW 1: LOOKUP SCREEN
  if (!ticket) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.backLink} onPress={() => setView('home')}>
            <ArrowLeft size={16} color="#1E40AF" />
            <Text style={styles.backLinkText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Track Ticket Status</Text>
          <Text style={styles.subtitle}>Enter your logged email address and ticket reference code to inspect progress.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Your Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="customer@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.fieldLabel}>Ticket Reference Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. AL-123456"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            value={ticketNumber}
            onChangeText={setTicketNumber}
          />

          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => handleLookup()} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.btnPrimaryText}>Lookup Ticket</Text>
                <Search size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // VIEW 2: DETAILS & TIMELINE
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.actionHeader}>
        <TouchableOpacity style={styles.miniBtn} onPress={handleClearCredentials}>
          <ArrowLeft size={14} color="#475569" />
          <Text style={styles.miniBtnText}>Back to Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.miniBtn} onPress={() => handleLookup(ticket.email, ticket.ticket_number)} disabled={loading}>
          <RefreshCw size={12} color="#1E40AF" style={loading ? styles.spin : null} />
          <Text style={[styles.miniBtnText, { color: '#1E40AF' }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingTop: 4 }]}>
        {/* Ticket Header card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.ticketNumText}>{ticket.ticket_number}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, getPriorityStyle(ticket.priority)]}>
                <Text style={styles.badgeText}>{ticket.priority}</Text>
              </View>
              <View style={[styles.badge, getStatusStyle(ticket.status)]}>
                <Text style={styles.badgeText}>{ticket.status}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.ticketSubject}>{ticket.subject}</Text>
          
          <View style={styles.descRow}>
            <FileText size={16} color="#64748B" style={styles.descIcon} />
            <Text style={styles.descText}>{ticket.description}</Text>
          </View>

          {/* Details list in a grid-like box */}
          <View style={styles.detailsBox}>
            <View style={styles.detailsColumn}>
              <View style={styles.detailsHeader}>
                <User size={12} color="#1E40AF" />
                <Text style={styles.detailsHeaderText}>Owner</Text>
              </View>
              <Text style={styles.detailsVal}>{ticket.name}</Text>
              <Text style={styles.detailsSub}>{ticket.phone}</Text>
            </View>
          </View>
        </View>

        {/* Timeline updates */}
        <Text style={styles.timelineHeading}>
          <MessageSquare size={16} color="#0F172A" /> Updates & Conversation
        </Text>

        {replies.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Text style={styles.emptyTimelineText}>No messages logged yet. Use the response box below to contact support.</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {replies.map((reply, idx) => (
              <View key={reply.id || idx} style={styles.timelineItem}>
                {/* Visual marker dot */}
                <View style={[
                  styles.timelineMarker, 
                  reply.sender === 'Staff' ? styles.markerStaff : styles.markerClient
                ]} />
                
                <View style={styles.timelineContent}>
                  <View style={styles.timelineMeta}>
                    <Text style={[
                      styles.timelineSender, 
                      reply.sender === 'Staff' ? styles.senderStaff : styles.senderClient
                    ]}>
                      {reply.sender === 'Staff' ? 'Support Engineer' : reply.name}
                    </Text>
                    <Text style={styles.timelineTime}>{formatDate(reply.created_at)}</Text>
                  </View>
                  <Text style={styles.timelineBody}>{reply.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reply Post input at bottom */}
      {ticket.status !== 'Closed' && ticket.status !== 'Resolved' ? (
        <View style={styles.replyBoxContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type your message to support team..."
            placeholderTextColor="#94A3B8"
            multiline={true}
            value={newReply}
            onChangeText={setNewReply}
            disabled={submittingReply}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !newReply.trim() && styles.sendBtnDisabled]} 
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
      ) : (
        <View style={styles.closedInfoBox}>
          <Text style={styles.closedInfoText}>This ticket is marked as {ticket.status}. Replies are locked.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  btn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: '#1E40AF',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  miniBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  ticketNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeGray: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', color: '#475569' },
  badgeYellow: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', color: '#D97706' },
  badgeOrange: { backgroundColor: '#FFE4E6', borderColor: '#FECDD3', color: '#E11D48' },
  badgeRed: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' },
  badgeBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' },
  badgeGreen: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', color: '#047857' },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  descRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  descIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    flex: 1,
  },
  detailsBox: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: '#EBF5FF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 16,
  },
  detailsColumn: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailsHeaderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  detailsVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailsSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  timelineHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyTimeline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyTimelineText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  timelineContainer: {
    flexDirection: 'column',
    paddingLeft: 14,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: 20,
    paddingBottom: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
  },
  timelineMarker: {
    position: 'absolute',
    left: -7,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  markerStaff: { borderColor: '#3B82F6', backgroundColor: '#3B82F6' },
  markerClient: { borderColor: '#1E40AF', backgroundColor: '#1E40AF' },
  timelineContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  timelineMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 4,
  },
  timelineSender: {
    fontSize: 11,
    fontWeight: '800',
  },
  senderStaff: { color: '#3B82F6' },
  senderClient: { color: '#1E40AF' },
  timelineTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timelineBody: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  replyBoxContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    fontSize: 13,
    color: '#0F172A',
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  closedInfoBox: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closedInfoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  spin: {
    // Note: React Native spin animations require Animated, but standard styling works.
  },
});

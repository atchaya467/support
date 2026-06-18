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
import { Search, ArrowLeft, RefreshCw, FileText, User, Calendar, MessageSquare, Send, ShieldAlert, Key, Lock } from 'lucide-react-native';
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

  // Verification CAPTCHA + OTP States
  const [showVerification, setShowVerification] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState('');
  const [otpText, setOtpText] = useState('');
  const [userOtp, setUserOtp] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [pendingTicket, setPendingTicket] = useState(null);
  const [pendingReplies, setPendingReplies] = useState([]);

  // Auto load ticket if credentials exist on mount
  useEffect(() => {
    if (trackCredentials?.email && trackCredentials?.ticketNumber) {
      handleLookup(trackCredentials.email, trackCredentials.ticketNumber, true); // skip verification on active session
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateCaptchaAndOtp = () => {
    const val1 = Math.floor(Math.random() * 10) + 1;
    const val2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaText((val1 + val2).toString());
    setCaptchaChallenge(`${val1} + ${val2} = ?`);
    setUserCaptcha('');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpText(code);
    setUserOtp('');
    setVerificationError('');
  };

  // Lookup API call
  const handleLookup = async (customEmail, customNum, skipVerify = false) => {
    setError('');
    
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

      // 2. Fetch replies
      let repliesData = [];
      const repliesResponse = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${data.id}/replies`);
      if (repliesResponse.ok) {
        repliesData = await repliesResponse.json();
      }

      if (skipVerify) {
        setTicket(data);
        setReplies(repliesData);
      } else {
        setPendingTicket(data);
        setPendingReplies(repliesData);
        generateCaptchaAndOtp();
        setShowVerification(true);
      }
    } catch (err) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAccess = () => {
    setVerificationError('');

    if (userCaptcha.trim() !== captchaText) {
      setVerificationError('CAPTCHA answer is incorrect.');
      return;
    }

    if (userOtp.trim() !== otpText) {
      setVerificationError('Verification OTP code is incorrect.');
      return;
    }

    // Success - load ticket
    setTicket(pendingTicket);
    setReplies(pendingReplies);
    setShowVerification(false);
    
    // Save session credentials
    setTrackCredentials({ email: email.trim(), ticketNumber: ticketNumber.trim() });
  };

  // Submit reply
  const handlePostReply = async () => {
    if (!newReply.trim()) return;

    setSubmittingReply(true);
    setReplySuccess(false);
    setError('');

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
    setShowVerification(false);
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

  // UNIFIED SEARCH & VERIFICATION VIEW
  if (!ticket) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.backLink} onPress={() => {
            if (showVerification) {
              setShowVerification(false);
              setVerificationError('');
            } else {
              setView('home');
            }
          }}>
            <ArrowLeft size={16} color="#1E40AF" />
            <Text style={styles.backLinkText}>
              {showVerification ? 'Back to Search' : 'Back to Dashboard'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>Track Ticket Status</Text>
          <Text style={styles.subtitle}>
            {showVerification 
              ? 'Complete the CAPTCHA and OTP challenge to verify your identity.'
              : 'Enter your logged email address and ticket reference code to inspect progress.'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {verificationError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{verificationError}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Your Email Address</Text>
          <TextInput
            style={[styles.input, showVerification && styles.disabledInput]}
            placeholder="customer@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!showVerification && !loading}
          />

          <Text style={styles.fieldLabel}>Ticket Reference Code</Text>
          <TextInput
            style={[styles.input, showVerification && styles.disabledInput]}
            placeholder="e.g. AL-123456"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            value={ticketNumber}
            onChangeText={setTicketNumber}
            editable={!showVerification && !loading}
          />

          {showVerification ? (
            <View style={styles.verificationSection}>
              <View style={styles.dividerLine} />
              
              <Text style={styles.verificationHeading}>Identity Verification Required</Text>

              {/* CAPTCHA Challenge */}
              <Text style={styles.fieldLabel}>Solve Captcha Challenge</Text>
              <View style={styles.captchaRow}>
                <View style={styles.captchaDisplay}>
                  <Text style={styles.captchaText}>{captchaChallenge}</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={generateCaptchaAndOtp}>
                  <RefreshCw size={14} color="#64748B" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Result"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  value={userCaptcha}
                  onChangeText={setUserCaptcha}
                />
              </View>

              {/* OTP Code Input */}
              <Text style={styles.fieldLabel}>One-Time Password (OTP)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP code"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={userOtp}
                onChangeText={setUserOtp}
              />

              {/* Simulated Toast Delivery Notice */}
              <View style={styles.demoOtpBox}>
                <Key size={14} color="#1E40AF" />
                <Text style={styles.demoOtpText}>
                  <Text style={{ fontWeight: '700' }}>SMS OTP Gateway:</Text> A simulated 6-digit OTP code of <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>{otpText}</Text> was sent to your phone number: <Text style={{ fontWeight: '700' }}>{pendingTicket ? pendingTicket.phone : 'registered number'}</Text>.
                </Text>
              </View>

              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleVerifyAccess}>
                <View style={styles.btnRow}>
                  <Lock size={16} color="#FFFFFF" />
                  <Text style={styles.btnPrimaryText}>Verify & Access Ticket</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { marginTop: 12 }]} onPress={() => { setShowVerification(false); setVerificationError(''); }}>
                <Text style={styles.btnSecondaryText}>Change Ticket Info</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => handleLookup(email, ticketNumber)} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.btnPrimaryText}>Request Verification OTP</Text>
                  <Search size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  // VIEW 3: TICKET DETAILS & CONVERSATION
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
        
        <TouchableOpacity style={styles.miniBtn} onPress={() => handleLookup(ticket.email, ticket.ticket_number, true)} disabled={loading}>
          <RefreshCw size={12} color="#1E40AF" />
          <Text style={[styles.miniBtnText, { color: '#1E40AF' }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingTop: 4 }]}>
        {error ? (
          <View style={[styles.errorBox, { marginBottom: 12 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {replySuccess ? (
          <View style={[styles.successBox, { marginBottom: 12 }]}>
            <Text style={styles.successText}>Reply posted successfully!</Text>
          </View>
        ) : null}

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
  successBox: {
    backgroundColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
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
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    borderColor: '#E2E8F0',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  verificationHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
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
  securityHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  captchaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  captchaDisplay: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captchaText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  refreshBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
    marginBottom: 16,
  },
  demoOtpText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 15,
  },
});

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
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { RefreshCw, X, MessageSquare, Send, Check, AlertCircle, User } from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function UserDashboard({ setView, userEmail }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Loaders & states
  const [loading, setLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load tickets on mount & when filters change
  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    setError('');

    // Fetch ALL tickets — no email filter
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);

    const url = `${API_BASE_URL}/api/staff/tickets?${params.toString()}`;

    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error('Failed to load tickets');
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
      setError('Connection failure. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setReplies([]);
    setRepliesLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${ticket.id}/replies`);
      if (!response.ok) throw new Error('Failed to load replies');
      const data = await response.json();
      setReplies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || !newStatus || newStatus === selectedTicket.status) return;
    setUpdatingStatus(true);
    setStatusSuccess(false);
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/staff/tickets/${selectedTicket.id}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status');
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      setTickets(prev =>
        prev.map(t => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      );
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 2000);
    } catch (err) {
      Alert.alert('Error', err.message || 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostReply = async () => {
    if (!newReply.trim() || !selectedTicket) return;
    setSubmittingReply(true);
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/tickets/${selectedTicket.id}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'Client',
            name: selectedTicket.name,
            message: newReply.trim(),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to post reply');
      setReplies(prev => [...prev, data]);
      setNewReply('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Error posting reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Emergency': return styles.badgeRed;
      case 'High':      return styles.badgeOrange;
      case 'Medium':    return styles.badgeYellow;
      default:          return styles.badgeGray;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Resolved':    return styles.badgeGreen;
      case 'In Progress': return styles.badgeYellow;
      case 'Closed':      return styles.badgeGray;
      default:            return styles.badgeBlue;
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Filter / Header Bar ── */}
      <View style={styles.filterBar}>
        <View style={styles.filterHeader}>
          <View>
            <Text style={styles.title}>All Tickets</Text>
            <Text style={styles.emailHint}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchTickets}
            disabled={loading}
          >
            <RefreshCw size={14} color="#1E40AF" />
          </TouchableOpacity>
        </View>

        {/* Filter Pickers */}
        <View style={styles.pickerRow}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={statusFilter}
              style={styles.picker}
              onValueChange={setStatusFilter}
            >
              <Picker.Item label="All Statuses" value="" />
              <Picker.Item label="Open"        value="Open" />
              <Picker.Item label="In Progress" value="In Progress" />
              <Picker.Item label="Resolved"    value="Resolved" />
              <Picker.Item label="Closed"      value="Closed" />
            </Picker>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={priorityFilter}
              style={styles.picker}
              onValueChange={setPriorityFilter}
            >
              <Picker.Item label="All Priorities" value="" />
              <Picker.Item label="Low"       value="Low" />
              <Picker.Item label="Medium"    value="Medium" />
              <Picker.Item label="High"      value="High" />
              <Picker.Item label="Emergency" value="Emergency" />
            </Picker>
          </View>
        </View>
      </View>

      {/* ── Error Banner ── */}
      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchTickets}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Ticket List ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading your tickets…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={[
            styles.listContent,
            isWide && styles.listContentWide,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptyText}>
                {statusFilter || priorityFilter
                  ? 'No tickets match the selected filters.'
                  : 'Submit your first support request using the New Ticket button above.'}
              </Text>
              {(statusFilter || priorityFilter) && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => { setStatusFilter(''); setPriorityFilter(''); }}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={isWide ? styles.gridLayout : undefined}>
              {tickets.map(ticket => (
                <TouchableOpacity
                  key={ticket.id}
                  style={[styles.ticketCard, isWide && styles.ticketCardWide]}
                  onPress={() => handleSelectTicket(ticket)}
                  activeOpacity={0.75}
                >
                  <View style={styles.ticketCardHeader}>
                    <Text style={styles.ticketNum}>{ticket.ticket_number}</Text>
                    <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                  </View>
                  <Text style={styles.ticketSubj} numberOfLines={1}>
                    {ticket.help_topic_name || 'Support Ticket'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, getPriorityStyle(ticket.priority)]}>
                      <Text style={styles.badgeText}>{ticket.priority}</Text>
                    </View>
                    <View style={[styles.badge, getStatusStyle(ticket.status)]}>
                      <Text style={styles.badgeText}>{ticket.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Ticket Detail Modal ── */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket && (
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalMeta}>
                  {selectedTicket.ticket_number} · {selectedTicket.help_topic_name}
                </Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedTicket.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedTicket(null)}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Status Row */}
                <View style={styles.manageBox}>
                  <Text style={styles.manageLabel}>Status:</Text>
                  <View style={styles.statusPickerWrapper}>
                    <Picker
                      selectedValue={selectedTicket.status}
                      style={styles.statusPicker}
                      onValueChange={handleStatusChange}
                      enabled={!updatingStatus}
                    >
                      <Picker.Item label="Open"        value="Open" />
                      <Picker.Item label="In Progress" value="In Progress" />
                      <Picker.Item label="Resolved"    value="Resolved" />
                      <Picker.Item label="Closed"      value="Closed" />
                    </Picker>
                  </View>
                  {updatingStatus && <ActivityIndicator size="small" color="#1E40AF" />}
                  {statusSuccess && <Check size={16} color="#10B981" />}
                </View>

                {/* Customer Info */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <User size={14} color="#1E40AF" />
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryHeader}>Customer</Text>
                      <Text style={styles.summaryVal}>{selectedTicket.name}</Text>
                      <Text style={styles.summarySub}>
                        {selectedTicket.email} · {selectedTicket.phone}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Conversation */}
                <Text style={styles.timelineHeader}>
                  <MessageSquare size={14} color="#0F172A" /> Conversation ({replies.length})
                </Text>

                {repliesLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#1E40AF"
                    style={{ marginVertical: 16 }}
                  />
                ) : replies.length === 0 ? (
                  <Text style={styles.emptyReplies}>No messages yet.</Text>
                ) : (
                  <View style={styles.timelineList}>
                    {replies.map(reply => (
                      <View
                        key={reply.id}
                        style={[
                          styles.replyBubble,
                          reply.sender === 'Staff'
                            ? styles.bubbleStaff
                            : styles.bubbleClient,
                        ]}
                      >
                        <View style={styles.replyMeta}>
                          <Text
                            style={[
                              styles.replySender,
                              reply.sender === 'Staff'
                                ? styles.senderStaffText
                                : styles.senderClientText,
                            ]}
                          >
                            {reply.sender === 'Staff' ? 'Support Team' : reply.name}
                          </Text>
                          <Text style={styles.replyDate}>
                            {formatDate(reply.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.replyMsg}>{reply.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Reply Box */}
              <View style={styles.replyBox}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Write a reply..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={newReply}
                  onChangeText={setNewReply}
                  editable={!submittingReply}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    !newReply.trim() && styles.sendBtnDisabled,
                  ]}
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
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // ── Filter Bar ──
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  emailHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    height: 42,
    color: '#0F172A',
    fontSize: 13,
  },

  // ── Error ──
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  retryText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // ── Ticket List ──
  scrollList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  listContentWide: {
    paddingHorizontal: '8%',
  },
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '700',
  },

  // ── Ticket Card ──
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    padding: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  ticketCardWide: {
    flex: 1,
    minWidth: 260,
    maxWidth: '48%',
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.3,
  },
  ticketDate: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  ticketSubj: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 10,
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
    letterSpacing: 0.5,
    color: '#0F172A',
  },
  badgeGray:   { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  badgeYellow: { backgroundColor: '#FEF9C3', borderColor: '#FDE047' },
  badgeOrange: { backgroundColor: '#FFF1F2', borderColor: '#FDA4AF' },
  badgeRed:    { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  badgeBlue:   { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  badgeGreen:  { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },

  // ── Modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    gap: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  modalMeta: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.3,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 32,
  },

  // ── Manage Status ──
  manageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  manageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusPickerWrapper: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  statusPicker: {
    height: 40,
    color: '#0F172A',
  },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  summaryCol: {
    flex: 1,
  },
  summaryHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  summarySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // ── Timeline ──
  timelineHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptyReplies: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  timelineList: {
    gap: 10,
  },
  replyBubble: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  bubbleStaff: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    marginLeft: 20,
  },
  bubbleClient: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    marginRight: 20,
  },
  replyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  replySender: {
    fontSize: 11,
    fontWeight: '800',
  },
  senderStaffText: {
    color: '#1E40AF',
  },
  senderClientText: {
    color: '#475569',
  },
  replyDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  replyMsg: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },

  // ── Reply Box ──
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});

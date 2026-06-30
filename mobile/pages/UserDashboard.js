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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { RefreshCw, X, MessageSquare, Send, Check, AlertCircle, User } from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function UserDashboard({ setView, userEmail }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const [loading, setLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (searchText.trim()) params.append('search', searchText.trim());

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
    new Date(dateString).toLocaleDateString('en-GB');

  const openCount = tickets.filter(t => t.status === 'Open').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;

  return (
    <View style={styles.container}>
      <View style={styles.ticketToolbar}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={fetchTickets}
          />

          <TouchableOpacity style={styles.searchButton} onPress={fetchTickets}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>

          <Text style={styles.helpTopicLabel}>Help Topic:</Text>

          <View style={styles.helpTopicSelect}>
            <Picker
              selectedValue={priorityFilter}
              style={styles.picker}
              onValueChange={setPriorityFilter}
            >
              <Picker.Item label="-- All Help Topics --" value="" />
              <Picker.Item label="Low" value="Low" />
              <Picker.Item label="Medium" value="Medium" />
              <Picker.Item label="High" value="High" />
              <Picker.Item label="Emergency" value="Emergency" />
            </Picker>
          </View>
        </View>

        <View style={styles.ticketTitleRow}>
          <View style={styles.ticketTitleWrap}>
            <RefreshCw size={20} color="#5B8F22" />
            <Text style={styles.ticketTitle}>Tickets</Text>
          </View>

          <View style={styles.statusLinks}>
            <TouchableOpacity onPress={() => setStatusFilter('Open')}>
              <Text style={styles.statusLink}>Open ({openCount})</Text>
            </TouchableOpacity>
            <Text style={styles.statusSeparator}>|</Text>
            <TouchableOpacity onPress={() => setStatusFilter('Closed')}>
              <Text style={styles.statusLink}>Closed ({closedCount})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchTickets}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.listContent}
          horizontal={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.ticketTable}>
            <Text style={styles.tableCaption}>
              Showing 1 - {tickets.length} of {tickets.length} Open Tickets
            </Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colTicket]}>Ticket #</Text>
              <Text style={[styles.th, styles.colDate]}>Create Date</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colSubject]}>Subject</Text>
              <Text style={[styles.th, styles.colDepartment]}>Department</Text>
            </View>

            {tickets.length === 0 ? (
              <View style={styles.emptyTableRow}>
                <Text style={styles.emptyText}>No tickets found.</Text>
              </View>
            ) : (
              tickets.map(ticket => (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.tableRow}
                  onPress={() => handleSelectTicket(ticket)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tdLink, styles.colTicket]} numberOfLines={1}>
                    {ticket.ticket_number}
                  </Text>

                  <Text style={[styles.td, styles.colDate]}>
                    {formatDate(ticket.created_at)}
                  </Text>

                  <Text style={[styles.td, styles.colStatus]}>
                    {ticket.status}
                  </Text>

                  <Text style={[styles.tdLink, styles.colSubject]} numberOfLines={1}>
                    {ticket.help_topic_name || 'Support Ticket'}
                  </Text>

                  <Text style={[styles.td, styles.colDepartment]} numberOfLines={1}>
                    {ticket.priority || 'L1 Leykart'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalMeta}>
                  {selectedTicket.ticket_number} - {selectedTicket.help_topic_name}
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
                <View style={styles.manageBox}>
                  <Text style={styles.manageLabel}>Status:</Text>

                  <View style={styles.statusPickerWrapper}>
                    <Picker
                      selectedValue={selectedTicket.status}
                      style={styles.statusPicker}
                      onValueChange={handleStatusChange}
                      enabled={!updatingStatus}
                    >
                      <Picker.Item label="Open" value="Open" />
                      <Picker.Item label="In Progress" value="In Progress" />
                      <Picker.Item label="Resolved" value="Resolved" />
                      <Picker.Item label="Closed" value="Closed" />
                    </Picker>
                  </View>

                  {updatingStatus && <ActivityIndicator size="small" color="#1E40AF" />}
                  {statusSuccess && <Check size={16} color="#10B981" />}
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <User size={14} color="#1E40AF" />
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryHeader}>Customer</Text>
                      <Text style={styles.summaryVal}>{selectedTicket.name}</Text>
                      <Text style={styles.summarySub}>
                        {selectedTicket.email} - {selectedTicket.phone}
                      </Text>
                    </View>
                  </View>
                </View>

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
    backgroundColor: '#F4F4F4',
  },
  ticketToolbar: {
    backgroundColor: '#F4F4F4',
    padding: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  searchInput: {
    width: 320,
    height: 30,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    color: '#111',
  },
  searchButton: {
    height: 30,
    borderWidth: 1,
    borderColor: '#777',
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 13,
    color: '#111',
  },
  helpTopicLabel: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#333',
  },
  helpTopicSelect: {
    width: 260,
    height: 32,
    borderWidth: 1,
    borderColor: '#AAA',
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
  },
  picker: {
    height: 42,
    color: '#0F172A',
    fontSize: 13,
  },
  ticketTitleRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketTitle: {
    fontSize: 24,
    color: '#2F6F91',
    fontWeight: '500',
  },
  statusLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  statusLink: {
    color: '#334155',
    fontWeight: '700',
  },
  statusSeparator: {
    color: '#CBD5E1',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    margin: 14,
    padding: 12,
    borderRadius: 4,
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
  scrollList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  ticketTable: {
    minWidth: 1050,
    borderWidth: 1,
    borderColor: '#AAA',
    backgroundColor: '#FFFFFF',
  },
  tableCaption: {
    backgroundColor: '#D8D3CB',
    padding: 8,
    fontWeight: '700',
    color: '#111',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E9EEF0',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#AAA',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 32,
    borderBottomWidth: 1,
    borderColor: '#C8C8C8',
  },
  emptyTableRow: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  th: {
    padding: 7,
    fontWeight: '700',
    borderRightWidth: 1,
    borderColor: '#C8C8C8',
    color: '#111',
  },
  td: {
    padding: 7,
    borderRightWidth: 1,
    borderColor: '#D0D0D0',
    color: '#111',
  },
  tdLink: {
    padding: 7,
    borderRightWidth: 1,
    borderColor: '#D0D0D0',
    color: '#0B5F86',
    fontWeight: '700',
  },
  colTicket: {
    width: 220,
  },
  colDate: {
    width: 140,
  },
  colStatus: {
    width: 120,
  },
  colSubject: {
    width: 310,
  },
  colDepartment: {
    width: 260,
  },
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
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
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Filter, RefreshCw, X, MessageSquare, Send, Check, AlertCircle, FileText, User, Truck } from 'lucide-react-native';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function StaffDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
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
    let url = `${API_BASE_URL}/api/staff/tickets?`;
    if (statusFilter) url += `status=${statusFilter}&`;
    if (priorityFilter) url += `priority=${priorityFilter}&`;
    if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error('Failed to load tickets');
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
      setError('Connection failure. Is Express API running?');
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
      if (!response.ok) throw new Error('Failed to load comments');
      const data = await response.json();
      setReplies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || !newStatus) return;

    setUpdatingStatus(true);
    setStatusSuccess(false);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/staff/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status');

      // Update states
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
      
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 2000);
    } catch (err) {
      Alert.alert('Error', err.message || 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostStaffReply = async () => {
    if (!newReply.trim() || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: 'Staff',
          name: 'Support Service Manager',
          message: newReply.trim()
        })
      });

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
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

  return (
    <View style={styles.container}>
      
      {/* 1. Header controls */}
      <View style={styles.filterBar}>
        <View style={styles.filterHeader}>
          <Text style={styles.title}>Operator Desk</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchTickets} disabled={loading}>
            <RefreshCw size={14} color="#1E40AF" />
          </TouchableOpacity>
        </View>

        {/* Filters Grid */}
        <View style={styles.pickerRow}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={statusFilter}
              style={styles.picker}
              onValueChange={setStatusFilter}
            >
              <Picker.Item label="All Statuses" value="" />
              <Picker.Item label="Open" value="Open" />
              <Picker.Item label="In Progress" value="In Progress" />
              <Picker.Item label="Resolved" value="Resolved" />
              <Picker.Item label="Closed" value="Closed" />
            </Picker>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={priorityFilter}
              style={styles.picker}
              onValueChange={priorityFilter => setPriorityFilter(priorityFilter)}
            >
              <Picker.Item label="All Urgencies" value="" />
              <Picker.Item label="Low" value="Low" />
              <Picker.Item label="Medium" value="Medium" />
              <Picker.Item label="High" value="High" />
              <Picker.Item label="Emergency" value="Emergency" />
            </Picker>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchTickets}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={fetchTickets}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Tickets list */}
      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={24} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Fetching active service tickets...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollList} contentContainerStyle={styles.listContent}>
          {tickets.length === 0 ? (
            <Text style={styles.emptyText}>No matching tickets in queue.</Text>
          ) : (
            tickets.map(ticket => (
              <TouchableOpacity 
                key={ticket.id} 
                style={styles.ticketCard}
                onPress={() => handleSelectTicket(ticket)}
              >
                <View style={styles.ticketCardHeader}>
                  <Text style={styles.ticketNum}>{ticket.ticket_number}</Text>
                  <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                </View>
                <Text style={styles.ticketSubj} numberOfLines={1}>{ticket.subject}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, getPriorityStyle(ticket.priority)]}>
                    <Text style={styles.badgeText}>{ticket.priority}</Text>
                  </View>
                  <View style={[styles.badge, getStatusStyle(ticket.status)]}>
                    <Text style={styles.badgeText}>{ticket.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* 3. Detail Modal Overlay */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalMetaText}>{selectedTicket.ticket_number} &bull; {selectedTicket.help_topic_name}</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedTicket.subject}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedTicket(null)}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                
                {/* Status selector management */}
                <View style={styles.manageBox}>
                  <Text style={styles.manageLabel}>Manage Status:</Text>
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

                {/* Details summaries */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <User size={14} color="#1E40AF" />
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryHeader}>Customer Owner</Text>
                      <Text style={styles.summaryVal}>{selectedTicket.name}</Text>
                      <Text style={styles.summarySub}>{selectedTicket.email} &bull; {selectedTicket.phone}</Text>
                    </View>
                  </View>
                </View>

                {/* Description details */}
                <View style={styles.descCard}>
                  <View style={styles.descTitleRow}>
                    <FileText size={14} color="#64748B" />
                    <Text style={styles.descTitleText}>Complaint Description</Text>
                  </View>
                  <Text style={styles.descBodyText}>{selectedTicket.description}</Text>
                </View>

                {/* Timeline chat updates */}
                <Text style={styles.timelineHeader}>
                  <MessageSquare size={14} color="#0F172A" /> Conversation Logs ({replies.length})
                </Text>

                {repliesLoading ? (
                  <ActivityIndicator size="small" color="#1E40AF" style={{ marginVertical: 10 }} />
                ) : replies.length === 0 ? (
                  <Text style={styles.emptyReplies}>No replies recorded yet.</Text>
                ) : (
                  <View style={styles.timelineList}>
                    {replies.map(reply => (
                      <View 
                        key={reply.id} 
                        style={[
                          styles.replyBubble,
                          reply.sender === 'Staff' ? styles.bubbleStaff : styles.bubbleClient
                        ]}
                      >
                        <View style={styles.replyMeta}>
                          <Text style={[
                            styles.replySender,
                            reply.sender === 'Staff' ? styles.senderStaffText : styles.senderClientText
                          ]}>
                            {reply.sender === 'Staff' ? 'Staff Desk' : reply.name}
                          </Text>
                          <Text style={styles.replyDate}>{formatDate(reply.created_at)}</Text>
                        </View>
                        <Text style={styles.replyMsg}>{reply.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Reply write box */}
              <View style={styles.replyBox}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Post reply updates to customer..."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  value={newReply}
                  onChangeText={setNewReply}
                  disabled={submittingReply}
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, !newReply.trim() && styles.sendBtnDisabled]} 
                  onPress={handlePostStaffReply}
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
    backgroundColor: '#F8FAFC',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFCFF',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    height: 38,
    color: '#0F172A',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0F172A',
  },
  searchBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  scrollList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 40,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
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
    color: '#64748B',
  },
  ticketDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  ticketSubj: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ticketVeh: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeGray: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', color: '#475569' },
  badgeYellow: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', color: '#D97706' },
  badgeOrange: { backgroundColor: '#FFE4E6', borderColor: '#FECDD3', color: '#E11D48' },
  badgeRed: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' },
  badgeBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' },
  badgeGreen: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', color: '#047857' },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  modalMetaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    width: 250,
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  manageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  manageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusPickerWrapper: {
    flex: 1,
    height: 36,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  statusPicker: {
    height: 36,
    color: '#0F172A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
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
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  summarySub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  descCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  descTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  descTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  descBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  timelineHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  emptyReplies: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 14,
  },
  timelineList: {
    flexDirection: 'column',
    gap: 10,
  },
  replyBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  bubbleStaff: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#F0F7FF',
  },
  bubbleClient: {
    borderLeftWidth: 4,
    borderLeftColor: '#1E40AF',
  },
  replyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  replySender: {
    fontSize: 11,
    fontWeight: '800',
  },
  senderStaffText: { color: '#3B82F6' },
  senderClientText: { color: '#1E40AF' },
  replyDate: {
    fontSize: 9,
    color: '#94A3B8',
  },
  replyMsg: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  replyBox: {
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
});

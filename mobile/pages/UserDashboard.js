import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import {
  RefreshCw,
  X,
  MessageSquare,
  Send,
  Check,
  AlertCircle,
  User,
  Mail,
  Phone,
  Clock,
  Tag,
} from 'lucide-react-native';
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

  const pageAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    if (selectedTicket) {
      modalAnim.setValue(0);
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();

    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (searchText.trim()) params.append('search', searchText.trim());

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE_URL}/api/staff/tickets?${queryString}`
      : `${API_BASE_URL}/api/staff/tickets`;

    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error('Failed to load tickets');

      const data = await response.json();
      setTickets(Array.isArray(data) ? data : []);
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
      setReplies(Array.isArray(data) ? data : []);
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

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const allCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;

  const getPriorityLabel = (priority) => priority || 'Normal';

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
      case 'normal':
      default:
        return styles.priorityNormal;
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch ((status || 'Open').toLowerCase()) {
      case 'closed':
        return styles.statusClosed;
      case 'resolved':
        return styles.statusResolved;
      case 'in progress':
        return styles.statusProgress;
      case 'open':
      default:
        return styles.statusOpen;
    }
  };

  const pageAnimatedStyle = {
    opacity: pageAnim,
    transform: [
      {
        translateY: pageAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const modalAnimatedStyle = {
    opacity: modalAnim,
    transform: [
      {
        translateY: modalAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ticketToolbar, pageAnimatedStyle]}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={fetchTickets}
            placeholder="Search tickets..."
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity style={styles.searchButton} onPress={fetchTickets}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>

          <Text style={styles.helpTopicLabel}>Priority:</Text>

          <View style={styles.helpTopicSelect}>
            <Picker
              selectedValue={priorityFilter}
              style={styles.picker}
              onValueChange={setPriorityFilter}
            >
              <Picker.Item label="All Priorities" value="" />
              <Picker.Item label="Low" value="Low" />
              <Picker.Item label="Normal" value="Normal" />
              <Picker.Item label="Medium" value="Medium" />
              <Picker.Item label="High" value="High" />
              <Picker.Item label="Emergency" value="Emergency" />
            </Picker>
          </View>
        </View>

        <View style={styles.ticketTitleRow}>
          <View style={styles.ticketTitleWrap}>
            <RefreshCw size={20} color="#2563EB" />
            <Text style={styles.ticketTitle}>All Tickets</Text>
          </View>

          <View style={styles.statusLinks}>
            <TouchableOpacity onPress={() => setStatusFilter('')}>
              <Text style={[styles.statusLink, !statusFilter && styles.statusLinkActive]}>
                All ({allCount})
              </Text>
            </TouchableOpacity>

            <Text style={styles.statusSeparator}>|</Text>

            <TouchableOpacity onPress={() => setStatusFilter('Open')}>
              <Text style={[styles.statusLink, statusFilter === 'Open' && styles.statusLinkActive]}>
                Open ({openCount})
              </Text>
            </TouchableOpacity>

            <Text style={styles.statusSeparator}>|</Text>

            <TouchableOpacity onPress={() => setStatusFilter('Closed')}>
              <Text style={[styles.statusLink, statusFilter === 'Closed' && styles.statusLinkActive]}>
                Closed ({closedCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

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
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={true}
          >
            <Animated.View style={[styles.ticketTable, pageAnimatedStyle]}>
              <Text style={styles.tableCaption}>
                Showing {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </Text>

              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colTicket]}>Ticket #</Text>
                <Text style={[styles.th, styles.colDate]}>Create Date</Text>
                <Text style={[styles.th, styles.colStatus]}>Status</Text>
                <Text style={[styles.th, styles.colSubject]}>Subject</Text>
                <Text style={[styles.th, styles.colDepartment]}>Priority</Text>
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
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.tdLink, styles.colTicket]} numberOfLines={1}>
                      {ticket.ticket_number}
                    </Text>

                    <Text style={[styles.td, styles.colDate]}>
                      {formatDate(ticket.created_at)}
                    </Text>

                    <View style={[styles.td, styles.colStatus]}>
                      <View style={[styles.statusBadge, getStatusBadgeStyle(ticket.status)]}>
                        <Text style={styles.statusBadgeText}>{ticket.status}</Text>
                      </View>
                    </View>

                    <Text style={[styles.tdLink, styles.colSubject]} numberOfLines={1}>
                      {ticket.help_topic_name || 'Support Ticket'}
                    </Text>

                    <View style={[styles.td, styles.colDepartment]}>
                      <View style={[styles.priorityBadge, getPriorityBadgeStyle(ticket.priority)]}>
                        <Text style={styles.priorityBadgeText}>
                          {getPriorityLabel(ticket.priority)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </Animated.View>
          </ScrollView>
        </ScrollView>
      )}

      <Modal
        visible={!!selectedTicket}
        animationType="fade"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket && (
          <SafeAreaView style={styles.detailPage}>
            <Animated.View style={[styles.detailPageInner, modalAnimatedStyle]}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTicketNo}>{selectedTicket.ticket_number}</Text>
                  <Text style={styles.detailTitle} numberOfLines={1}>
                    {selectedTicket.help_topic_name || 'Support Ticket'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setSelectedTicket(null)}
                >
                  <X size={22} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.detailScroll}
                contentContainerStyle={styles.detailContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.detailHeroCard}>
                  <View style={styles.detailHeroTop}>
                    <View>
                      <Text style={styles.detailMetaLabel}>Ticket</Text>
                      <Text style={styles.detailHeroTitle}>{selectedTicket.ticket_number}</Text>
                    </View>

                    <View style={styles.detailBadgeRow}>
                      <View style={[styles.detailBadge, getStatusBadgeStyle(selectedTicket.status)]}>
                        <Text style={styles.detailBadgeText}>{selectedTicket.status}</Text>
                      </View>

                      <View style={[styles.detailBadge, getPriorityBadgeStyle(selectedTicket.priority)]}>
                        <Text style={styles.detailBadgeText}>
                          {selectedTicket.priority || 'Normal'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.detailSubject}>
                    {selectedTicket.help_topic_name || 'Support Ticket'}
                  </Text>
                </View>

                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoCard}>
                    <Text style={styles.detailSectionTitle}>Basic Ticket Information</Text>

                    <View style={styles.detailInfoRow}>
                      <Clock size={14} color="#2563EB" />
                      <Text style={styles.detailInfoLabel}>Create Date</Text>
                      <Text style={styles.detailInfoValue}>
                        {formatDateTime(selectedTicket.created_at)}
                      </Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Tag size={14} color="#2563EB" />
                      <Text style={styles.detailInfoLabel}>Priority</Text>
                      <Text style={styles.detailInfoValue}>
                        {selectedTicket.priority || 'Normal'}
                      </Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <RefreshCw size={14} color="#2563EB" />
                      <Text style={styles.detailInfoLabel}>Status</Text>
                      <Text style={styles.detailInfoValue}>{selectedTicket.status}</Text>
                    </View>
                  </View>

                  <View style={styles.detailInfoCard}>
                    <Text style={styles.detailSectionTitle}>User Information</Text>

                    <View style={styles.detailInfoRow}>
                      <User size={14} color="#2563EB" />
                      <Text style={styles.detailInfoLabel}>Name</Text>
                      <Text style={styles.detailInfoValue}>{selectedTicket.name}</Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Mail size={14} color="#2563EB" />
                      <Text style={styles.detailInfoLabel}>Email</Text>
                      <Text style={styles.detailInfoValue}>{selectedTicket.email}</Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Phone size={14} color="#2563EB" />
                      <Text style={styles.detailInfoLabel}>Phone</Text>
                      <Text style={styles.detailInfoValue}>{selectedTicket.phone}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailManageCard}>
                  <Text style={styles.detailSectionTitle}>Update Status</Text>

                  <View style={styles.detailStatusRow}>
                    <Text style={styles.detailInfoLabel}>Status</Text>

                    <View style={styles.detailStatusPicker}>
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

                    {updatingStatus && <ActivityIndicator size="small" color="#2563EB" />}
                    {statusSuccess && <Check size={16} color="#10B981" />}
                  </View>
                </View>

                <View style={styles.detailMessageCard}>
                  <View style={styles.detailMessageHeader}>
                    <MessageSquare size={15} color="#2563EB" />
                    <Text style={styles.detailMessageAuthor}>
                      {selectedTicket.name} posted {formatDateTime(selectedTicket.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.detailMessageBody}>
                    {selectedTicket.help_topic_name || 'Ticket created.'}
                  </Text>
                </View>

                <View style={styles.detailConversationHeader}>
                  <MessageSquare size={15} color="#111827" />
                  <Text style={styles.detailConversationTitle}>
                    Conversation ({replies.length})
                  </Text>
                </View>

                {repliesLoading ? (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 16 }} />
                ) : replies.length === 0 ? (
                  <View style={styles.detailEmptyBox}>
                    <Text style={styles.detailEmptyText}>No messages yet.</Text>
                  </View>
                ) : (
                  <View style={styles.detailTimeline}>
                    {replies.map(reply => (
                      <View
                        key={reply.id}
                        style={[
                          styles.detailReplyBubble,
                          reply.sender === 'Staff'
                            ? styles.detailReplyStaff
                            : styles.detailReplyClient,
                        ]}
                      >
                        <View style={styles.detailReplyMeta}>
                          <Text style={styles.detailReplySender}>
                            {reply.sender === 'Staff' ? 'Support Team' : reply.name}
                          </Text>

                          <Text style={styles.detailReplyDate}>
                            {formatDate(reply.created_at)}
                          </Text>
                        </View>

                        <Text style={styles.detailReplyMessage}>{reply.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={styles.detailReplyBox}>
                <TextInput
                  style={styles.detailReplyInput}
                  placeholder="Write a reply..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={newReply}
                  onChangeText={setNewReply}
                  editable={!submittingReply}
                />

                <TouchableOpacity
                  style={[
                    styles.detailSendBtn,
                    !newReply.trim() && styles.detailSendBtnDisabled,
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
            </Animated.View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  ticketToolbar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchInput: {
    width: 320,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 13,
    color: '#111827',
  },
  searchButton: {
    height: 40,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  helpTopicLabel: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#374151',
    fontWeight: '800',
  },
  helpTopicSelect: {
    width: 260,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: 42,
    color: '#111827',
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
    gap: 8,
  },
  ticketTitle: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '900',
  },
  statusLinks: {
    flexDirection: 'row',
    gap: 10,
  },
  statusLink: {
    color: '#64748B',
    fontWeight: '900',
  },
  statusLinkActive: {
    color: '#2563EB',
  },
  statusSeparator: {
    color: '#CBD5E1',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '700',
    flex: 1,
  },
  retryText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '800',
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
    fontWeight: '600',
  },
  scrollList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  ticketTable: {
    minWidth: 1050,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  tableCaption: {
    backgroundColor: '#F9FAFB',
    padding: 13,
    fontWeight: '900',
    color: '#111827',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 52,
    borderBottomWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#FFFFFF',
  },
  emptyTableRow: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  th: {
    padding: 11,
    fontWeight: '900',
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    color: '#374151',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  td: {
    padding: 11,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
    color: '#111827',
    justifyContent: 'center',
  },
  tdLink: {
    padding: 11,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
    color: '#2563EB',
    fontWeight: '900',
  },
  colTicket: {
    width: 220,
  },
  colDate: {
    width: 140,
  },
  colStatus: {
    width: 130,
  },
  colSubject: {
    width: 300,
  },
  colDepartment: {
    width: 260,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#111827',
  },
  priorityEmergency: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  priorityHigh: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },
  priorityNormal: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  priorityMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  priorityLow: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#111827',
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
  detailPage: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  detailPageInner: {
    flex: 1,
  },
  detailHeader: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailTicketNo: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '900',
  },
  detailTitle: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '900',
    marginTop: 3,
  },
  detailCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
    paddingBottom: 24,
  },
  detailHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  detailHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailMetaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailHeroTitle: {
    fontSize: 22,
    color: '#111827',
    fontWeight: '900',
    marginTop: 3,
  },
  detailSubject: {
    marginTop: 14,
    fontSize: 15,
    color: '#374151',
    fontWeight: '700',
  },
  detailBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  detailBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    textTransform: 'uppercase',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  detailInfoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  detailSectionTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '900',
    marginBottom: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailInfoLabel: {
    width: 92,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  detailInfoValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '800',
  },
  detailManageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailStatusPicker: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  statusPicker: {
    height: 42,
    color: '#0F172A',
  },
  detailMessageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 14,
  },
  detailMessageHeader: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMessageAuthor: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '900',
  },
  detailMessageBody: {
    padding: 14,
    minHeight: 54,
    fontSize: 14,
    color: '#111827',
  },
  detailConversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailConversationTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '900',
  },
  detailEmptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
  },
  detailEmptyText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  detailTimeline: {
    gap: 10,
  },
  detailReplyBubble: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  detailReplyStaff: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    marginLeft: 24,
  },
  detailReplyClient: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    marginRight: 24,
  },
  detailReplyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailReplySender: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '900',
  },
  detailReplyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailReplyMessage: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 19,
  },
  detailReplyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailReplyInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 90,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    textAlignVertical: 'top',
  },
  detailSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
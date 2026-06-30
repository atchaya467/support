import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { ArrowLeft, RefreshCw, Search, Send, Printer, Edit3 } from 'lucide-react-native';
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

  useEffect(() => {
    if (trackCredentials?.email && trackCredentials?.ticketNumber) {
      handleLookup(trackCredentials.email, trackCredentials.ticketNumber);
    }
  }, []);

  useEffect(() => {
    if (userEmail) setEmail(userEmail);
  }, [userEmail]);

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
        <View style={styles.lookupBox}>
          <TouchableOpacity style={styles.backLink} onPress={() => setView('user-dashboard')}>
            <ArrowLeft size={16} color="#2F6F91" />
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
            placeholderTextColor="#777"
          />

          <Text style={styles.formLabel}>Ticket Number</Text>
          <TextInput
            style={styles.input}
            value={ticketNumber}
            onChangeText={setTicketNumber}
            editable={!loading}
            autoCapitalize="none"
            placeholder="AL-123456"
            placeholderTextColor="#777"
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
        </View>
      </ScrollView>
    );
  }

  return (
  <KeyboardAvoidingView
    style={styles.screen}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View style={[styles.container, styles.detailContainer]}>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.smallButton} onPress={handleBack}>
            <ArrowLeft size={14} color="#333" />
            <Text style={styles.smallButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.smallButton} onPress={() => handleLookup(ticket.email, ticket.ticket_number)}>
              <RefreshCw size={13} color="#333" />
              <Text style={styles.smallButtonText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallButton}>
              <Printer size={13} color="#333" />
              <Text style={styles.smallButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallButton}>
              <Edit3 size={13} color="#333" />
              <Text style={styles.smallButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.ticketHeadingRow}>
          <RefreshCw size={20} color="#5B8F22" />
          <Text style={styles.ticketHeading}>
            {ticket.help_topic_name || 'Support Ticket'} #{ticket.ticket_number}
          </Text>
        </View>

        <View style={styles.dottedLine} />

        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Basic Ticket Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ticket Status:</Text>
              <Text style={styles.infoValue}>{ticket.status}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoValue}>{ticket.priority || 'L1 Leykart'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Create Date:</Text>
              <Text style={styles.infoValue}>{formatDateTime(ticket.created_at)}</Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>User Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{ticket.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{ticket.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{ticket.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleUpper}>MARKET INTELLIGENCE</Text>
          <View style={styles.fullInfoRow}>
            <Text style={styles.fullInfoLabel}>Ticket Type:</Text>
            <Text style={styles.fullInfoValue}>
              {ticket.help_topic_name || 'Access control - Roles & Authorizations'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitleUpper}>MARKET INTELLIGENCE</Text>
          <View style={styles.fullInfoRow}>
            <Text style={styles.fullInfoLabel}>Subcategories:</Text>
            <Text style={styles.fullInfoValue}>Login</Text>
          </View>
        </View>

        <View style={styles.messagePanel}>
          <View style={styles.messageHeader}>
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
            placeholderTextColor="#777"
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
          <ActivityIndicator size="small" color="#2F6F91" style={{ marginVertical: 16 }} />
        ) : replies.length === 0 ? (
          <Text style={styles.emptyReplies}>No replies yet.</Text>
        ) : (
          replies.map(reply => (
            <View key={reply.id} style={styles.replyItem}>
              <View style={styles.replyItemHeader}>
                <Text style={styles.replySender}>
                  {reply.sender === 'Staff' ? 'Support Team' : reply.name}
                </Text>
                <Text style={styles.replyDate}>{formatDateTime(reply.created_at)}</Text>
              </View>
              <Text style={styles.replyMessage}>{reply.message}</Text>
            </View>
          ))
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  lookupContainer: {
    padding: 18,
  },
  lookupBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C8C8C8',
    padding: 18,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  backLinkText: {
    color: '#2F6F91',
    fontWeight: '700',
  },
  lookupTitle: {
    fontSize: 24,
    color: '#2F6F91',
    marginBottom: 6,
  },
  lookupSubtitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#888',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    marginBottom: 14,
    color: '#111',
  },
  disabledInput: {
    backgroundColor: '#F0F0F0',
    color: '#666',
  },
  lookupButton: {
    height: 38,
    backgroundColor: '#2F6F91',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  lookupButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailContainer: {
    padding: 12,
    paddingBottom: 8,
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
    gap: 4,
    borderWidth: 1,
    borderColor: '#AAA',
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 8,
    height: 28,
  },
  smallButtonText: {
    fontSize: 12,
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
  },
  ticketHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  ticketHeading: {
    fontSize: 18,
    color: '#2F6F91',
    fontWeight: '500',
  },
  dottedLine: {
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderColor: '#AAA',
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  infoColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#777',
    paddingBottom: 5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#333',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111',
  },
  sectionBlock: {
    borderTopWidth: 1,
    borderTopColor: '#999',
    paddingTop: 6,
    marginBottom: 8,
  },
  sectionTitleUpper: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111',
    marginBottom: 10,
  },
  fullInfoRow: {
    flexDirection: 'row',
  },
  fullInfoLabel: {
    width: 180,
    fontSize: 14,
    color: '#333',
  },
  fullInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
  },
  messagePanel: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  messageHeader: {
    backgroundColor: '#BFD0E3',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
  },
  messageHeaderText: {
    fontWeight: '800',
    color: '#111',
  },
  messageBody: {
    padding: 10,
    minHeight: 34,
    color: '#111',
  },
  timelineLine: {
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    paddingTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  timelineText: {
    fontSize: 14,
    color: '#333',
  },
  bold: {
    fontWeight: '800',
  },
  replyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 18,
  },
  replyInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#AAA',
    backgroundColor: '#FFFFFF',
    padding: 10,
    textAlignVertical: 'top',
    color: '#111',
  },
  sendButton: {
    width: 42,
    height: 42,
    backgroundColor: '#2F6F91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#AAA',
  },
  emptyReplies: {
    color: '#666',
    marginBottom: 20,
  },
  replyItem: {
    borderWidth: 1,
    borderColor: '#C8C8C8',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  replyItemHeader: {
    backgroundColor: '#E9EEF0',
    borderBottomWidth: 1,
    borderBottomColor: '#C8C8C8',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replySender: {
    fontWeight: '800',
    color: '#111',
  },
  replyDate: {
    color: '#555',
    fontSize: 12,
  },
  replyMessage: {
    padding: 10,
    color: '#111',
    lineHeight: 20,
  },
});
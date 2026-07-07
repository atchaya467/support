import React, { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, Send, MessageSquare, Clock, Tag, User, Mail, Phone } from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function TrackTicket({ setView, trackCredentials, setTrackCredentials, userEmail }) {
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

  const handleLookup = async (lookupEmail = email, lookupNumber = ticketNumber) => {
    const trimmedEmail = lookupEmail.trim();
    const trimmedNumber = lookupNumber.trim();

    if (!trimmedEmail || !trimmedNumber) {
      setError('Please provide both your Email and Ticket Number.');
      return;
    }

    setLoading(true);
    setError('');
    setTicket(null);
    setReplies([]);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/tickets/track?email=${encodeURIComponent(trimmedEmail)}&ticket_number=${encodeURIComponent(trimmedNumber)}`
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No matching ticket was found.');
      }

      setTicket(data);
      fetchReplies(data.id);
    } catch (err) {
      setError(err.message || 'Could not find a ticket with those details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (ticketId) => {
    setRepliesLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets/${ticketId}/replies`);
      if (!response.ok) throw new Error('Failed to load replies');

      const data = await response.json();
      setReplies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !ticket) return;

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
      if (!response.ok) throw new Error(data.error || 'Failed to post reply');

      setReplies((prev) => [...prev, data]);
      setNewReply('');
    } catch (err) {
      alert(err.message || 'Error posting reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleBack = () => {
    setTrackCredentials(null);
    setView('user-dashboard');
  };

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="track-container">
      <button onClick={handleBack} className="back-btn animate-fade-in">
        <ChevronLeft size={16} />
        <span>Back to tickets</span>
      </button>

      <h2 className="animate-fade-in">Track Ticket Status</h2>
      <p className="page-subtitle animate-fade-in">Enter your reference details to check status and chat with support.</p>

      {!ticket ? (
        <div className="form-card card animate-fade-in">
          {error && (
            <div className="alert alert-error animate-slide-in">
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="track-form"
          >
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Ticket Number</label>
              <input
                type="text"
                placeholder="AL-123456"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Finding Ticket...' : 'Find Ticket'}
            </button>
          </form>
        </div>
      ) : (
        <div className="ticket-workspace animate-fade-in">
          {/* Left Column: Info Panel */}
          <div className="workspace-sidebar">
            <div className="detail-hero">
              <div className="hero-top">
                <div>
                  <span className="meta-label">Ticket Number</span>
                  <h3>{ticket.ticket_number}</h3>
                </div>
                <button onClick={() => handleLookup(email, ticketNumber)} className="refresh-btn-round">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="hero-meta">
                <span className={`badge badge-status status-${(ticket.status || 'Open').toLowerCase().replace(' ', '-')}`}>
                  {ticket.status}
                </span>
                <span className={`badge badge-priority priority-${(ticket.priority || 'Normal').toLowerCase()}`}>
                  {ticket.priority || 'Normal'}
                </span>
              </div>
              <h4 className="detail-subject">{ticket.help_topic_name || 'Support Ticket'}</h4>
            </div>

            <div className="detail-card">
              <h4>Ticket Details</h4>
              <div className="info-row">
                <Clock size={14} />
                <strong>Created:</strong>
                <span>{formatDateTime(ticket.created_at)}</span>
              </div>
              <div className="info-row">
                <Tag size={14} />
                <strong>Priority:</strong>
                <span>{ticket.priority || 'Normal'}</span>
              </div>
              <div className="info-row">
                <RefreshCw size={14} />
                <strong>Status:</strong>
                <span>{ticket.status}</span>
              </div>
            </div>

            <div className="detail-card">
              <h4>User Information</h4>
              <div className="info-row">
                <User size={14} />
                <strong>Name:</strong>
                <span>{ticket.name}</span>
              </div>
              <div className="info-row">
                <Mail size={14} />
                <strong>Email:</strong>
                <span>{ticket.email}</span>
              </div>
              <div className="info-row">
                <Phone size={14} />
                <strong>Phone:</strong>
                <span>{ticket.phone}</span>
              </div>
            </div>

            <div className="form-actions-bottom">
              <button onClick={() => setTicket(null)} className="btn btn-secondary" style={{ width: '100%' }}>
                Look Up Another
              </button>
            </div>
          </div>

          {/* Right Column: Chat/Conversation */}
          <div className="workspace-chat">
            <div className="chat-header">
              <h4>Conversation Chat</h4>
            </div>

            <div className="chat-messages">
              {/* Initial message card */}
              <div className="chat-initial-message">
                <div className="message-header-inner">
                  <MessageSquare size={14} style={{ marginRight: 6 }} />
                  <strong>{ticket.name}</strong>
                  <span className="message-time" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {formatDateTime(ticket.created_at)}
                  </span>
                </div>
                <div className="message-body-inner" style={{ marginTop: 8 }}>
                  <p>Opened ticket for topic: <strong>{ticket.help_topic_name || 'Support Request'}</strong></p>
                </div>
              </div>

              {/* Chat replies */}
              {repliesLoading ? (
                <div className="small-loader">Loading replies...</div>
              ) : replies.length === 0 ? (
                <div className="empty-conversation">No messages yet. Start the conversation below.</div>
              ) : (
                replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`reply-bubble ${
                      reply.sender === 'Staff' ? 'reply-staff' : 'reply-client'
                    }`}
                  >
                    <div className="reply-meta">
                      <span className="reply-sender">
                        {reply.sender === 'Staff' ? 'Support Team' : reply.name}
                      </span>
                      <span className="reply-date">{formatDateTime(reply.created_at)}</span>
                    </div>
                    <p className="reply-text">{reply.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostReply} className="chat-input-form">
              <textarea
                placeholder="Type your message here..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                disabled={submittingReply}
                required
              />
              <button
                type="submit"
                disabled={submittingReply || !newReply.trim()}
                className="btn btn-send"
              >
                {submittingReply ? <span className="small-spinner"></span> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

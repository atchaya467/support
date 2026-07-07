import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
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

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
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

      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      );

      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 2000);
    } catch (err) {
      alert(err.message || 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedTicket) return;

    setSubmittingReply(true);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/tickets/${selectedTicket.id}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'Staff',
            name: 'Support Team',
            message: newReply.trim(),
          }),
        }
      );

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

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const allCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const closedCount = tickets.filter((t) => t.status === 'Closed').length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-toolbar animate-fade-in">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTickets();
          }}
          className="search-row"
        >
          <input
            type="text"
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search tickets by subject, name, number..."
          />
          <button type="submit" className="btn btn-search">
            Search
          </button>

          <div className="filter-group">
            <label>Priority:</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
        </form>

        <div className="title-row">
          <div className="title-wrap">
            <RefreshCw size={20} className="refresh-icon" onClick={fetchTickets} />
            <h2>All Tickets</h2>
          </div>

          <div className="status-links">
            <button
              onClick={() => setStatusFilter('')}
              className={`status-link ${!statusFilter ? 'active' : ''}`}
            >
              All ({allCount})
            </button>
            <span className="separator">|</span>
            <button
              onClick={() => setStatusFilter('Open')}
              className={`status-link ${statusFilter === 'Open' ? 'active' : ''}`}
            >
              Open ({openCount})
            </button>
            <span className="separator">|</span>
            <button
              onClick={() => setStatusFilter('Closed')}
              className={`status-link ${statusFilter === 'Closed' ? 'active' : ''}`}
            >
              Closed ({closedCount})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error dashboard-alert animate-slide-in">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchTickets} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Loading tickets...</p>
        </div>
      ) : (
        <div className="table-responsive animate-fade-in">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Create Date</th>
                <th>Status</th>
                <th>Subject</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => handleSelectTicket(ticket)} className="clickable-row">
                    <td>
                      <span className="ticket-link">{ticket.ticket_number}</span>
                    </td>
                    <td>{formatDate(ticket.created_at)}</td>
                    <td>
                      <span className={`badge badge-status status-${(ticket.status || 'Open').toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="subject-cell">{ticket.help_topic_name || 'Support Ticket'}</td>
                    <td>
                      <span className={`badge badge-priority priority-${(ticket.priority || 'Normal').toLowerCase()}`}>
                        {ticket.priority || 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal-card animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-ticket-no">{selectedTicket.ticket_number}</span>
                <h3>{selectedTicket.help_topic_name || 'Support Ticket'}</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedTicket(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body modal-workspace">
              {/* Left sidebar: metadata & actions */}
              <div className="modal-sidebar">
                <div className="detail-hero" style={{ marginBottom: 0 }}>
                  <div className="hero-meta">
                    <span className={`badge badge-status status-${(selectedTicket.status || 'Open').toLowerCase().replace(' ', '-')}`}>
                      {selectedTicket.status}
                    </span>
                    <span className={`badge badge-priority priority-${(selectedTicket.priority || 'Normal').toLowerCase()}`}>
                      {selectedTicket.priority || 'Normal'}
                    </span>
                  </div>
                  <h4 style={{ marginTop: 8, textTransform: 'none', border: 'none', padding: 0, margin: 0 }}>
                    {selectedTicket.help_topic_name || 'Support Ticket'}
                  </h4>
                </div>

                <div className="detail-card animate-slide-in">
                  <h4>Ticket Details</h4>
                  <div className="info-row">
                    <Clock size={14} />
                    <strong>Created:</strong>
                    <span>{formatDateTime(selectedTicket.created_at)}</span>
                  </div>
                  <div className="info-row">
                    <Tag size={14} />
                    <strong>Priority:</strong>
                    <span>{selectedTicket.priority || 'Normal'}</span>
                  </div>
                  <div className="info-row">
                    <RefreshCw size={14} />
                    <strong>Status:</strong>
                    <span>{selectedTicket.status}</span>
                  </div>
                </div>

                <div className="detail-card animate-slide-in" style={{ animationDelay: '0.05s' }}>
                  <h4>User Info</h4>
                  <div className="info-row">
                    <User size={14} />
                    <strong>Name:</strong>
                    <span>{selectedTicket.name}</span>
                  </div>
                  <div className="info-row">
                    <Mail size={14} />
                    <strong>Email:</strong>
                    <span>{selectedTicket.email}</span>
                  </div>
                  <div className="info-row">
                    <Phone size={14} />
                    <strong>Phone:</strong>
                    <span>{selectedTicket.phone}</span>
                  </div>
                </div>

                <div className="detail-card status-update-card">
                  <h4>Update Ticket Status</h4>
                  <div className="status-picker-row">
                    <select
                      value={selectedTicket.status}
                      onChange={handleStatusChange}
                      disabled={updatingStatus}
                      className="status-select"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    {updatingStatus && <span className="small-spinner"></span>}
                    {statusSuccess && <Check size={18} className="success-icon" />}
                  </div>
                </div>
              </div>

              {/* Right panel: chat/replies & input */}
              <div className="modal-chat-pane">
                <div className="chat-messages">
                  <div className="chat-initial-message">
                    <div className="message-header-inner">
                      <MessageSquare size={14} style={{ marginRight: 6 }} />
                      <strong>{selectedTicket.name}</strong>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {formatDateTime(selectedTicket.created_at)}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
                      <p>{selectedTicket.help_topic_name || 'Ticket created.'}</p>
                    </div>
                  </div>

                  {repliesLoading ? (
                    <div className="small-loader">Loading replies...</div>
                  ) : replies.length === 0 ? (
                    <div className="empty-conversation">No messages yet.</div>
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

                <div className="modal-chat-footer">
                  <form onSubmit={handlePostReply} className="reply-form">
                    <textarea
                      placeholder="Write a reply..."
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
                      {submittingReply ? <span className="small-spinner"></span> : <Send size={18} />}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

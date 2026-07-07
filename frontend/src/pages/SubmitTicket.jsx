import React, { useState, useEffect } from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout } from '../config';

export default function SubmitTicket({ setView, setTrackCredentials, userEmail, userName, userPhone }) {
  const [helpTopics, setHelpTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTopics, setFetchingTopics] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: userName || '',
    email: userEmail || '',
    phone: userPhone || '',
    help_topic_id: '',
    priority: 'Normal',
  });

  const [createdTicket, setCreatedTicket] = useState(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      email: userEmail || prev.email,
      name: userName || prev.name,
      phone: userPhone || prev.phone,
    }));
  }, [userEmail, userName, userPhone]);

  // Fetch help topics
  useEffect(() => {
    fetchWithTimeout(`${API_BASE_URL}/api/help-topics`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load help topics');
        return res.json();
      })
      .then((data) => {
        setHelpTopics(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, help_topic_id: data[0].id.toString() }));
        }
        setFetchingTopics(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Connection error. Is the server running?');
        setFetchingTopics(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setView('user-dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) return setError('Full Name is required.');
    if (!formData.email.trim()) return setError('Email Address is required.');
    const emailPattern = /^\S+@\S+\.\S+$/;
    if (!emailPattern.test(formData.email)) return setError('Please enter a valid email address.');

    const phoneDigits = (formData.phone || '').replace(/[^0-9]/g, '');
    if (phoneDigits.length !== 10) return setError('Phone Number must contain exactly 10 digits.');
    if (phoneDigits !== (formData.phone || '')) return setError('Phone Number must contain only digits.');

    setLoading(true);

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      help_topic_id: formData.help_topic_id || (helpTopics[0]?.id?.toString() ?? '1'),
      priority: formData.priority || 'Normal',
    };

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server failed to save ticket');
      }

      setCreatedTicket({
        ticketNumber: data.ticketNumber,
        email: formData.email,
      });
    } catch (err) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackCreatedTicket = () => {
    if (createdTicket) {
      setTrackCredentials({
        email: createdTicket.email,
        ticketNumber: createdTicket.ticketNumber,
      });
      setView('track-ticket');
    }
  };

  if (createdTicket) {
    return (
      <div className="success-container animate-fade-in">
        <div className="success-card animate-zoom-in">
          <CheckCircle size={64} className="success-icon" />
          <h3>Ticket Submitted!</h3>
          <p>Your support request has been registered. Save the reference number below to track progress.</p>

          <div className="code-container">
            <span className="code-label">Ticket Number</span>
            <span className="code-text">{createdTicket.ticketNumber}</span>
          </div>

          <div className="success-actions">
            <button onClick={handleTrackCreatedTicket} className="btn btn-primary">
              Track Ticket Progress
            </button>
            <button onClick={() => setView('user-dashboard')} className="btn btn-secondary">
              Back to Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <button onClick={handleCancel} className="back-btn animate-fade-in">
        <ChevronLeft size={16} />
        <span>Back to tickets</span>
      </button>

      <h2 className="animate-fade-in">New Support Ticket</h2>
      <p className="page-subtitle animate-fade-in">Fill in the details below and we'll get back to you as soon as possible.</p>

      <div className="form-card card animate-fade-in">
        {error && (
          <div className="alert alert-error animate-slide-in">
            <span>{error}</span>
          </div>
        )}

        {fetchingTopics ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Loading form...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ticket-form">
            <div className="form-row">
              <div className="form-group half-col">
                <label>
                  Full name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Atchayas"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group half-col">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="anil@test.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!!userEmail}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half-col">
                <label>Phone Number (10 digits) <span className="required">*</span></label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="9876543210"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData((prev) => ({ ...prev, phone: val.slice(0, 10) }));
                  }}
                  required
                />
              </div>

              <div className="form-group half-col">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>

            {helpTopics.length > 0 && (
              <div className="form-group">
                <label>Help Topic</label>
                <select name="help_topic_id" value={formData.help_topic_id} onChange={handleChange}>
                  {helpTopics.map((topic) => (
                    <option key={topic.id} value={topic.id.toString()}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

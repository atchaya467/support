import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Settings } from 'lucide-react';
import UserLogin from './pages/UserLogin';
import SubmitTicket from './pages/SubmitTicket';
import TrackTicket from './pages/TrackTicket';
import UserDashboard from './pages/UserDashboard';
import { API_BASE_URL } from './config';

export default function App() {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(() => {
    return localStorage.getItem('isUserAuthenticated') === 'true';
  });
  const [currentView, setView] = useState(() => {
    return localStorage.getItem('currentView') || 'user-login';
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || '';
  });
  const [userPhone, setUserPhone] = useState(() => {
    return localStorage.getItem('userPhone') || '';
  });
  const [trackCredentials, setTrackCredentials] = useState(() => {
    const stored = localStorage.getItem('trackCredentials');
    return stored ? JSON.parse(stored) : null;
  });

  // Settings State for switching backends
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('api_base_url') || 'http://localhost:8000';
  });

  useEffect(() => {
    localStorage.setItem('isUserAuthenticated', isUserAuthenticated);
  }, [isUserAuthenticated]);

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('userEmail', userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('userPhone', userPhone);
  }, [userPhone]);

  useEffect(() => {
    if (trackCredentials) {
      localStorage.setItem('trackCredentials', JSON.stringify(trackCredentials));
    } else {
      localStorage.removeItem('trackCredentials');
    }
  }, [trackCredentials]);

  const handleUserLoginSuccess = (email, name = '', phone = '') => {
    setIsUserAuthenticated(true);
    setUserEmail(email);
    setUserName(name);
    setUserPhone(phone);
    setView('user-dashboard');
  };

  const handleUserSignOut = () => {
    setIsUserAuthenticated(false);
    setUserEmail('');
    setUserName('');
    setUserPhone('');
    setTrackCredentials(null);
    setView('user-login');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('api_base_url', apiUrl.trim());
    setShowSettings(false);
    window.location.reload();
  };

  const renderScreen = () => {
    const activeView = isUserAuthenticated ? currentView : 'user-login';

    switch (activeView) {
      case 'user-login':
        return <UserLogin onLoginSuccess={handleUserLoginSuccess} />;

      case 'submit-ticket':
        return (
          <SubmitTicket
            setView={setView}
            setTrackCredentials={setTrackCredentials}
            userEmail={userEmail}
            userName={userName}
            userPhone={userPhone}
          />
        );

      case 'track-ticket':
        return (
          <TrackTicket
            setView={setView}
            trackCredentials={trackCredentials}
            setTrackCredentials={setTrackCredentials}
            userEmail={userEmail}
          />
        );

      case 'user-dashboard':
        return <UserDashboard setView={setView} userEmail={userEmail} />;

      default:
        return isUserAuthenticated ? (
          <UserDashboard setView={setView} userEmail={userEmail} />
        ) : (
          <UserLogin onLoginSuccess={handleUserLoginSuccess} />
        );
    }
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header animate-fade-in">
        <div className="header-inner">
          <div
            className="brand-container"
            onClick={() => isUserAuthenticated && setView('user-dashboard')}
            style={{ cursor: isUserAuthenticated ? 'pointer' : 'default' }}
          >
            <h1>SUPPORT CENTER</h1>
            <span className="brand-subtitle">Support Ticket System</span>
          </div>

          <div className="header-right">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="settings-btn"
              title="Backend Settings"
            >
              <Settings size={18} />
            </button>

            {isUserAuthenticated && (
              <div className="user-info-box">
                <span className="user-email-text">{userEmail}</span>
                <span className="divider">|</span>
                <button onClick={handleUserSignOut} className="sign-out-btn">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Backend Settings Panel */}
      {showSettings && (
        <div className="settings-panel animate-slide-in">
          <form onSubmit={handleSaveSettings} className="settings-form">
            <h4>API Connection Settings</h4>
            <div className="form-group">
              <label>Backend API Base URL:</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                required
              />
              <span className="help-text">
                Defaults: PHP = <code>http://localhost:8000</code>, Python/Node = <code>http://localhost:5000</code>
              </span>
            </div>
            <div className="settings-actions">
              <button type="button" onClick={() => setShowSettings(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Reload
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation Bar */}
      {isUserAuthenticated && (
        <nav className="nav-bar animate-fade-in">
          <div className="nav-bar-inner">
            <button
              className={`nav-tab ${currentView === 'user-dashboard' ? 'active' : ''}`}
              onClick={() => setView('user-dashboard')}
            >
              <FileText size={16} />
              <span>View Ticket</span>
            </button>

            <button
              className={`nav-tab ${currentView === 'submit-ticket' ? 'active' : ''}`}
              onClick={() => setView('submit-ticket')}
            >
              <Plus size={16} />
              <span>New Ticket</span>
            </button>

            <button
              className={`nav-tab ${currentView === 'track-ticket' ? 'active' : ''}`}
              onClick={() => setView('track-ticket')}
            >
              <Search size={16} />
              <span>Ticket Status</span>
            </button>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main className="main-content">{renderScreen()}</main>

      {/* Footer */}
      <footer className="app-footer">
        <p>© 2026 Support Center · All rights reserved.</p>
      </footer>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { getCurrentUser, logout } from './services/api';
import ConstituencyView from './components/ConstituencyView';
import IssueDetail from './components/IssueDetail';
import CreateIssue from './components/CreateIssue';
import Login from './components/Login';
import Register from './components/Register';
import ElectionVoting from './components/ElectionVoting';
import ElectionResults from './components/ElectionResults';
import CandidateRegistration from './components/CandidateRegistration';
import CreateElection from './components/CreateElection';
import ModeratorDashboard from './components/ModeratorDashboard';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import NotificationBell from './components/NotificationBell';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              {/* Left side - Logo and main links */}
              <div className="flex items-center space-x-4">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  🗳️ VirMP
                </Link>
                <span className="text-sm text-gray-500 hidden sm:inline">
                  Your Virtual Representative Platform
                </span>
                
                {/* Profile Link - for all logged in users */}
                {user && (
                  <Link to="/profile" className="text-gray-600 hover:text-gray-800 ml-4">
                    👤 Profile
                  </Link>
                )}
                
                {/* Moderator Dashboard Link */}
                {user?.role === 'moderator' && (
                  <Link to="/moderator/dashboard" className="text-purple-600 hover:text-purple-800">
                    🛡️ Dashboard
                  </Link>
                )}
                
                {/* Admin Dashboard Link - only for super_admin */}
                {user?.role === 'super_admin' && (
                  <Link to="/admin" className="text-red-600 hover:text-red-800">
                    🔧 Admin
                  </Link>
                )}
              </div>
              
              {/* Right side - User info, notification bell, and auth buttons */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <NotificationBell />
                    <span className="text-gray-700">
                      👤 {user.username} ({user.role})
                    </span>
                    <button
                      onClick={handleLogout}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-blue-600 hover:text-blue-800">
                      Login
                    </Link>
                    <Link to="/register" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register onRegister={setUser} /> : <Navigate to="/" />} />
            
            {/* User Profile Route */}
            <Route path="/profile" element={user ? <UserProfile onProfileUpdate={setUser} /> : <Navigate to="/login" />} />
            
            {/* Moderator Routes */}
            <Route path="/moderator/dashboard" element={user?.role === 'moderator' ? <ModeratorDashboard /> : <Navigate to="/" />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={user?.role === 'super_admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            
            {/* Election Routes */}
            <Route path="/create-election/:constituencyId" element={user?.role === 'moderator' ? <CreateElection /> : <Navigate to="/" />} />
            <Route path="/create-election" element={user?.role === 'moderator' ? <CreateElection /> : <Navigate to="/" />} />
            <Route path="/election/:electionId/vote" element={user ? <ElectionVoting /> : <Navigate to="/login" />} />
            <Route path="/election/:electionId/results" element={user ? <ElectionResults /> : <Navigate to="/login" />} />
            <Route path="/election/:electionId/register" element={user ? <CandidateRegistration /> : <Navigate to="/login" />} />
            
            {/* Main App Routes */}
            <Route path="/" element={user ? <ConstituencyView /> : <Navigate to="/login" />} />
            <Route path="/constituency/:constituencyId" element={user ? <ConstituencyView /> : <Navigate to="/login" />} />
            <Route path="/issue/:issueId" element={user ? <IssueDetail /> : <Navigate to="/login" />} />
            <Route path="/create-issue/:constituencyId" element={user ? <CreateIssue /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
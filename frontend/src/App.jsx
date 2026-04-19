import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { getCurrentUser, logout } from './services/api';
import ConstituencyView from './components/ConstituencyView';
import IssueDetail from './components/IssueDetail';
import CreateIssue from './components/CreateIssue';
import Login from './components/Login';
import Register from './components/Register';

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
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  🗳️ VirMP
                </Link>
                <span className="ml-2 text-sm text-gray-500">Your Virtual Representative Platform</span>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
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
            <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register onRegister={setUser} /> : <Navigate to="/" />} />
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
import React, { useEffect, useState } from 'react';
import { getPendingCandidates, approveCandidate, rejectCandidate, getCurrentUser } from '../services/api';

function ModeratorDashboard() {
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [approvedCandidates, setApprovedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const allCandidates = await getPendingCandidates();
      // Separate pending from approved/rejected
      setPendingCandidates(allCandidates.filter(c => c.status === 'pending'));
      setApprovedCandidates(allCandidates.filter(c => c.status === 'approved'));
    } catch (err) {
      console.error('Failed to load candidates:', err);
      setMessage({ type: 'error', text: 'Failed to load candidates' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (candidateId, candidateName) => {
    try {
      await approveCandidate(candidateId);
      setMessage({ type: 'success', text: `${candidateName} has been approved!` });
      loadCandidates(); // Reload the list
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to approve candidate' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReject = async (candidateId, candidateName) => {
    if (window.confirm(`Reject ${candidateName}?`)) {
      try {
        await rejectCandidate(candidateId);
        setMessage({ type: 'error', text: `${candidateName} has been rejected.` });
        loadCandidates(); // Reload the list
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to reject candidate' });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  if (currentUser?.role !== 'moderator') {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-600">Only moderators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Moderator Dashboard</h1>
        <p className="text-gray-600">Manage candidate registrations for your constituency</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Pending Candidates Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">📋</span>
          Pending Approval ({pendingCandidates.length})
        </h2>
        
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : pendingCandidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <p>No pending candidates. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCandidates.map((candidate) => (
              <div key={candidate.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{candidate.username}</h3>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Pending
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-semibold">Election:</span> {candidate.election_title}
                    </p>
                    <p className="text-gray-600 text-sm mb-2">
                      <span className="font-semibold">Constituency:</span> {candidate.constituency_name}
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg mt-2">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Manifesto:</span><br />
                        {candidate.manifesto || "No manifesto provided"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Registered: {new Date(candidate.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(candidate.id, candidate.username)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(candidate.id, candidate.username)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Candidates Section */}
      {approvedCandidates.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">✅</span>
            Approved Candidates ({approvedCandidates.length})
          </h2>
          <div className="space-y-2">
            {approvedCandidates.map((candidate) => (
              <div key={candidate.id} className="border-l-4 border-green-500 pl-4 py-2">
                <p className="font-semibold">{candidate.username}</p>
                <p className="text-sm text-gray-600">{candidate.election_title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModeratorDashboard;
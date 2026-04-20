import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getElectionDetail } from '../services/api';
import api from '../services/api';

function ModerateCandidates() {
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [electionId]);

  const loadData = async () => {
    try {
      const data = await getElectionDetail(electionId);
      setElection(data);
      
      // Get all candidates including pending
      const response = await api.get(`/elections/${electionId}/candidates/all`);
      setCandidates(response.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveCandidate = async (candidateId) => {
    try {
      await api.put(`/candidates/${candidateId}/approve`);
      loadData();
    } catch (err) {
      console.error('Failed to approve candidate:', err);
    }
  };

  const rejectCandidate = async (candidateId) => {
    try {
      await api.put(`/candidates/${candidateId}/reject`);
      loadData();
    } catch (err) {
      console.error('Failed to reject candidate:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Moderate Candidates</h1>
        <p className="text-gray-600">Election: {election?.title}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Pending Candidates</h2>
        
        {candidates.filter(c => c.status === 'pending').length === 0 ? (
          <p className="text-gray-500">No pending candidates.</p>
        ) : (
          <div className="space-y-4">
            {candidates.filter(c => c.status === 'pending').map((candidate) => (
              <div key={candidate.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{candidate.user?.username}</h3>
                    <p className="text-gray-600 mt-1">{candidate.manifesto}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Registered: {new Date(candidate.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveCandidate(candidate.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => rejectCandidate(candidate.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold mt-8 mb-4">Approved Candidates</h2>
        {candidates.filter(c => c.status === 'approved').length === 0 ? (
          <p className="text-gray-500">No approved candidates yet.</p>
        ) : (
          <div className="space-y-4">
            {candidates.filter(c => c.status === 'approved').map((candidate) => (
              <div key={candidate.id} className="border rounded-lg p-4 bg-green-50">
                <div>
                  <h3 className="font-bold text-lg">{candidate.user?.username}</h3>
                  <p className="text-gray-600 mt-1">{candidate.manifesto}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModerateCandidates;
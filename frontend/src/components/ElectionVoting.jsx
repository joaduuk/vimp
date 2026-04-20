import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getElectionDetail, castElectionVote, getElectionResults } from '../services/api';

function ElectionVoting() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadElection();
  }, [electionId]);

  const loadElection = async () => {
    try {
      const data = await getElectionDetail(electionId);
      setElection(data);
      
      // Check if user already voted
      const results = await getElectionResults(electionId);
      // This is simplified - in production, you'd have a user_vote endpoint
    } catch (err) {
      setError('Failed to load election');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate) {
      setError('Please select a candidate');
      return;
    }
    
    setSubmitting(true);
    try {
      await castElectionVote(electionId, selectedCandidate);
      setVoted(true);
      setTimeout(() => {
        navigate(`/election/${electionId}/results`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cast vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading election...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">
        {error}
        <button onClick={() => navigate(-1)} className="ml-4 underline">Go Back</button>
      </div>
    );
  }

  if (voted) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <div className="text-6xl mb-4">🗳️</div>
        <h2 className="text-2xl font-bold mb-2">Thank You for Voting!</h2>
        <p className="text-gray-600 mb-4">Your voice has been counted.</p>
        <p className="text-sm text-gray-500">Redirecting to results...</p>
      </div>
    );
  }

  const now = new Date();
  const electionStart = new Date(election.start_date);
  const electionEnd = new Date(election.end_date);

  if (now < electionStart) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <div className="text-6xl mb-4">⏰</div>
        <h2 className="text-2xl font-bold mb-2">Election Not Started Yet</h2>
        <p className="text-gray-600">
          This election starts on {electionStart.toLocaleDateString()}
        </p>
      </div>
    );
  }

  if (now > electionEnd) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <div className="text-6xl mb-4">🏁</div>
        <h2 className="text-2xl font-bold mb-2">Election Has Ended</h2>
        <button 
          onClick={() => navigate(`/election/${electionId}/results`)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          View Results
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{election.title}</h1>
        <p className="text-gray-600 mb-4">{election.description}</p>
        <div className="text-sm text-gray-500">
          <div>🗳️ Vote for your Virtual MP</div>
          <div>⏰ Voting ends: {new Date(election.end_date).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Select Your Candidate</h2>
        
        {election.candidates?.length === 0 ? (
          <p className="text-gray-500">No candidates registered yet.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {election.candidates?.map((candidate) => (
              <label
                key={candidate.id}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${
                  selectedCandidate === candidate.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="candidate"
                  value={candidate.id}
                  checked={selectedCandidate === candidate.id}
                  onChange={() => setSelectedCandidate(candidate.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold">{candidate.user?.username}</div>
                  {candidate.manifesto && (
                    <p className="text-sm text-gray-600 mt-1">{candidate.manifesto}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={handleVote}
          disabled={!selectedCandidate || submitting}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400"
        >
          {submitting ? 'Casting Vote...' : '🗳️ Cast Your Vote'}
        </button>
      </div>
    </div>
  );
}

export default ElectionVoting;
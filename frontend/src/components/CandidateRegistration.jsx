import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getElectionDetail, registerAsCandidate } from '../services/api';

function CandidateRegistration() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [manifesto, setManifesto] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    loadElection();
  }, [electionId]);

  const loadElection = async () => {
    try {
      const data = await getElectionDetail(electionId);
      setElection(data);
    } catch (err) {
      setError('Failed to load election');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      await registerAsCandidate(electionId, manifesto);
      setRegistered(true);
      setTimeout(() => {
        navigate(`/constituency/${election.constituency_id}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register as candidate');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (registered) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
        <p className="text-gray-600 mb-4">You are now registered as a candidate.</p>
        <p className="text-sm text-gray-500">Your registration will be reviewed by a moderator.</p>
      </div>
    );
  }

  // Check status instead of dates
  const isRegisterPhase = election?.status === 'register';
  const isActive = election?.status === 'active';
  const isEnded = election?.status === 'ended';

  if (!isRegisterPhase) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <div className="text-6xl mb-4">
          {isActive ? '🗳️' : isEnded ? '🏁' : '⏰'}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {isActive ? 'Voting Already Started' : isEnded ? 'Election Has Ended' : 'Registration Closed'}
        </h2>
        <p className="text-gray-600 mb-4">
          {isActive 
            ? 'Candidate registration closed when voting began.' 
            : isEnded 
            ? 'This election has already ended.'
            : 'Registration for this election is currently closed.'}
        </p>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Calculate dates for display
  const registrationStartDate = election?.start_date ? new Date(election.start_date) : null;
  const votingStartDate = registrationStartDate ? new Date(registrationStartDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold mb-2">Register as Candidate</h1>
      <p className="text-gray-600 mb-4">
        Election: <span className="font-semibold">{election?.title}</span>
      </p>

      {/* Corrected registration period info */}
      {registrationStartDate && votingStartDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            📋 <span className="font-semibold">Registration Period:</span> {registrationStartDate.toLocaleDateString()} - {votingStartDate.toLocaleDateString()}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Register as a candidate before voting begins on {votingStartDate.toLocaleDateString()}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-semibold">
            Your Manifesto
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Tell constituents what you stand for and what you'll do as their Virtual MP.
          </p>
          <textarea
            value={manifesto}
            onChange={(e) => setManifesto(e.target.value)}
            rows="6"
            placeholder="Example: I will represent the voice of our community on key issues like housing, transportation, and education. My priorities are..."
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
          >
            {submitting ? 'Registering...' : 'Register as Candidate'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CandidateRegistration;
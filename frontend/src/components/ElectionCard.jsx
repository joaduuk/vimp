import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getElectionResults } from '../services/api';

function ElectionCard({ election, constituencyId }) {
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Use the database status field directly
  const electionStatus = election.status; // 'upcoming', 'register', 'active', 'ended'
  
  let statusBadge = '';
  let statusColor = '';
  let statusIcon = '';
  
  if (electionStatus === 'upcoming') {
    statusBadge = '⏳ Coming Soon';
    statusColor = 'bg-gray-100 text-gray-800';
    statusIcon = '⏳';
  } else if (electionStatus === 'register') {
    statusBadge = '📋 Registration Open';
    statusColor = 'bg-purple-100 text-purple-800';
    statusIcon = '📋';
  } else if (electionStatus === 'active') {
    statusBadge = '🗳️ Voting Active';
    statusColor = 'bg-green-100 text-green-800';
    statusIcon = '🗳️';
  } else if (electionStatus === 'ended') {
    statusBadge = '🏁 Election Ended';
    statusColor = 'bg-gray-100 text-gray-800';
    statusIcon = '🏁';
  } else {
    statusBadge = electionStatus || 'Unknown';
    statusColor = 'bg-gray-100 text-gray-800';
    statusIcon = '❓';
  }

  useEffect(() => {
    if (showResults) {
      loadResults();
    }
  }, [showResults]);

  const loadResults = async () => {
    try {
      const data = await getElectionResults(election.id);
      setResults(data);
    } catch (err) {
      console.error('Failed to load results:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Calculate voting start date (registration open + 7 days)
  const getVotingStartDate = () => {
    if (!election.start_date) return null;
    try {
      const registrationOpen = new Date(election.start_date);
      if (isNaN(registrationOpen.getTime())) return null;
      const votingStart = new Date(registrationOpen);
      votingStart.setDate(registrationOpen.getDate() + 7);
      return votingStart;
    } catch (e) {
      return null;
    }
  };

  const isUpcoming = electionStatus === 'upcoming';
  const isRegister = electionStatus === 'register';
  const isActive = electionStatus === 'active';
  const isEnded = electionStatus === 'ended';
  
  const votingStartDate = getVotingStartDate();

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-blue-600">{election.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${statusColor}`}>
          <span>{statusIcon}</span>
          <span>{statusBadge}</span>
        </span>
      </div>
      
      {election.description && (
        <p className="text-gray-600 text-sm mb-3">{election.description}</p>
      )}
      
      <div className="text-sm text-gray-500 mb-3">
        <div>📅 Registration Opens: {formatDate(election.start_date)}</div>
        {votingStartDate && (
          <div>🗳️ Voting Starts: {formatDate(votingStartDate)}</div>
        )}
        <div>🏁 Voting Ends: {formatDate(election.end_date)}</div>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {isRegister && (
          <Link
            to={`/election/${election.id}/register`}
            className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 font-semibold"
          >
            📋 Register as Candidate
          </Link>
        )}
        
        {isActive && (
          <Link
            to={`/election/${election.id}/vote`}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 font-semibold"
          >
            🗳️ Vote Now
          </Link>
        )}
        
        <button
          onClick={() => setShowResults(!showResults)}
          className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
        >
          {showResults ? 'Hide Results' : '📊 View Results'}
        </button>
      </div>
      
      {showResults && results && (
        <div className="mt-3 pt-3 border-t">
          <h4 className="font-semibold text-sm mb-2">📊 Current Results</h4>
          {results.candidates?.length === 0 ? (
            <p className="text-sm text-gray-500">No candidates registered yet.</p>
          ) : (
            <div className="space-y-2">
              {results.candidates?.slice(0, 3).map((candidate, idx) => (
                <div key={candidate.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-6">
                    {idx === 0 && isEnded ? '🏆' : `${idx + 1}.`}
                  </span>
                  <span className="text-sm flex-1">{candidate.user?.username || 'Candidate'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${results.total_votes ? (candidate.vote_count / results.total_votes) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{candidate.vote_count} votes</span>
                  </div>
                </div>
              ))}
              {results.candidates?.length > 3 && (
                <p className="text-xs text-gray-500">+{results.candidates.length - 3} more candidates</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ElectionCard;
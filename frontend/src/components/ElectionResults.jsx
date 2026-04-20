import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getElectionResults, getElectionDetail } from '../services/api';

function ElectionResults() {
  const { electionId } = useParams();
  const [results, setResults] = useState(null);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [electionId]);

  const loadResults = async () => {
    try {
      const [resultsData, electionData] = await Promise.all([
        getElectionResults(electionId),
        getElectionDetail(electionId)
      ]);
      setResults(resultsData);
      setElection(electionData);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading results...</div>;
  }

  // Check if election has actually ended
  const now = new Date();
  const electionEndDate = election?.end_date ? new Date(election.end_date) : null;
  const hasEnded = electionEndDate && now > electionEndDate;
  const isActive = election?.status === 'active';
  const isRegister = election?.status === 'register';

  const sortedCandidates = [...(results?.candidates || [])].sort((a, b) => b.vote_count - a.vote_count);
  const winner = hasEnded && sortedCandidates.length > 0 ? sortedCandidates[0] : null;
  const totalVotes = results?.total_votes || 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Show appropriate message based on election status */}
      {isRegister && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 rounded-lg p-4 mb-6 text-center">
          <div className="text-3xl mb-2">📋</div>
          <h2 className="text-xl font-bold mb-1">Registration Open</h2>
          <p>Voting hasn't started yet. Check back after the registration period ends.</p>
          <p className="text-sm mt-2">Voting begins on {new Date(election?.start_date).toLocaleDateString()}</p>
        </div>
      )}

      {isActive && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg p-4 mb-6 text-center">
          <div className="text-3xl mb-2">🗳️</div>
          <h2 className="text-xl font-bold mb-1">Election In Progress</h2>
          <p>Voting is still open! Results are preliminary until the election ends.</p>
          <p className="text-sm mt-2">Election ends on {electionEndDate?.toLocaleDateString()}</p>
          <Link 
            to={`/election/${electionId}/vote`}
            className="inline-block mt-3 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Cast Your Vote
          </Link>
        </div>
      )}

      {/* Winner Banner - ONLY show if election has ended */}
      {hasEnded && winner && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold mb-1">Winner Announced!</h2>
          <p className="text-xl text-gray-700 mb-2">
            <span className="font-bold text-blue-600">{winner.user?.username || winner.user?.email || 'Candidate'}</span>
          </p>
          <p className="text-gray-600">
            Elected as Virtual MP for {election?.constituency?.name}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Received {winner.vote_count} out of {totalVotes} votes ({totalVotes > 0 ? ((winner.vote_count / totalVotes) * 100).toFixed(1) : 0}%)
          </p>
        </div>
      )}

      {/* Election Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{election?.title}</h1>
        <p className="text-gray-600">{election?.description}</p>
        <div className="mt-3 text-sm text-gray-500">
          <div>📊 Total Votes Cast: {totalVotes}</div>
          <div>
            🏁 Election {hasEnded ? 'ended' : 'ends'}: {electionEndDate?.toLocaleDateString()}
            {!hasEnded && <span className="ml-2 text-yellow-600">(Voting still open!)</span>}
          </div>
        </div>
      </div>

      {/* Results Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {hasEnded ? 'Final Results' : 'Current Results (Preliminary)'}
        </h2>
        
        {sortedCandidates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No candidates in this election.</p>
        ) : (
          <div className="space-y-4">
            {sortedCandidates.map((candidate, index) => {
              const percentage = totalVotes > 0 
                ? ((candidate.vote_count / totalVotes) * 100).toFixed(1)
                : 0;
              
              const isWinner = hasEnded && index === 0;
              
              return (
                <div key={candidate.id}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      {isWinner && <span className="text-xl">👑</span>}
                      <span className="font-medium">{candidate.user?.username || candidate.user?.email || 'Anonymous'}</span>
                      {!hasEnded && index === 0 && totalVotes > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Leading
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {candidate.vote_count} vote{candidate.vote_count !== 1 ? 's' : ''} ({percentage}%)
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${
                        isWinner ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {candidate.manifesto && (
                    <p className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-300">
                      {candidate.manifesto.substring(0, 100)}...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t text-center flex gap-4 justify-center">
          {isActive && (
            <Link to={`/election/${electionId}/vote`} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
              🗳️ Cast Your Vote
            </Link>
          )}
          <Link to={`/constituency/${election?.constituency_id}`} className="text-blue-500 hover:underline">
            ← Back to Constituency
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ElectionResults;
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

  const winner = results?.winner;
  const sortedCandidates = [...(results?.candidates || [])].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Winner Banner */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold mb-1">Winner Announced!</h2>
          <p className="text-xl text-gray-700 mb-2">
            <span className="font-bold text-blue-600">{winner.user?.username}</span>
          </p>
          <p className="text-gray-600">
            Elected as Virtual MP for {election?.constituency?.name}
          </p>
        </div>
      )}

      {/* Election Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{election?.title}</h1>
        <p className="text-gray-600">{election?.description}</p>
        <div className="mt-3 text-sm text-gray-500">
          <div>📊 Total Votes Cast: {results?.total_votes || 0}</div>
          <div>🏁 Election ended: {new Date(election?.end_date).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Results Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Full Results</h2>
        
        <div className="space-y-4">
          {sortedCandidates.map((candidate, index) => {
            const percentage = results?.total_votes 
              ? ((candidate.vote_count / results.total_votes) * 100).toFixed(1)
              : 0;
            
            return (
              <div key={candidate.id}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    {index === 0 && <span className="text-xl">👑</span>}
                    <span className="font-medium">{candidate.user?.username}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {candidate.vote_count} votes ({percentage}%)
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {candidate.manifesto && (
                  <p className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-300">
                    {candidate.manifesto}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t text-center">
          <Link to={`/constituency/${election?.constituency_id}`} className="text-blue-500 hover:underline">
            ← Back to Constituency
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ElectionResults;
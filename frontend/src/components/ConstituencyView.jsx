import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getCountries, getConstituencies, getIssues, deleteIssue, getCurrentUser, getPopularConstituencies, getElections } from '../services/api';
import SearchableSelect from './SearchableSelect';
import ElectionCard from './ElectionCard';

function ConstituencyView() {
  const { constituencyId } = useParams();
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popularConstituencies, setPopularConstituencies] = useState([]);
  const [elections, setElections] = useState([]);
  const currentUser = getCurrentUser();

  // Load countries on mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Load constituencies when country changes
  useEffect(() => {
    if (selectedCountry) {
      loadConstituencies(selectedCountry);
    }
  }, [selectedCountry]);

  // Load issues when constituencyId changes
  useEffect(() => {
    if (constituencyId) {
      loadIssues(constituencyId);
    }
  }, [constituencyId]);

  // Load popular constituencies when country changes
  useEffect(() => {
    loadPopularConstituencies();
  }, [selectedCountry]);

  // Load elections when constituencyId changes
  useEffect(() => {
    if (constituencyId) {
      loadElections();
    }
  }, [constituencyId]);

  const loadCountries = async () => {
    try {
      const data = await getCountries();
      setCountries(data);
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  };

  const loadElections = async () => {
    if (!constituencyId) return;
    try {
      const data = await getElections(constituencyId);
      setElections(data);
    } catch (err) {
      console.error('Failed to load elections:', err);
    }
  };

  const loadConstituencies = async (countryId) => {
    try {
      const data = await getConstituencies(countryId);
      setConstituencies(data);
    } catch (err) {
      console.error('Failed to load constituencies:', err);
    }
  };

  const loadPopularConstituencies = async () => {
    try {
      const data = await getPopularConstituencies();
      setPopularConstituencies(data);
    } catch (err) {
      console.error('Failed to load popular constituencies:', err);
    }
  };

  const loadIssues = async (id) => {
    setLoading(true);
    try {
      const data = await getIssues(id);
      setIssues(data);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      try {
        await deleteIssue(issueId);
        loadIssues(constituencyId);
      } catch (err) {
        console.error('Failed to delete issue:', err);
      }
    }
  };

  const handleConstituencySelect = (constituencyId) => {
    navigate(`/constituency/${constituencyId}`);
  };

  return (
    <div>
      {/* Country Selector with Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Select Your Country</h2>
        <SearchableSelect
          options={countries}
          value={selectedCountry}
          onChange={(countryId) => {
            setSelectedCountry(countryId);
            setConstituencies([]);
            navigate('/');
          }}
          placeholder="Search or select a country..."
          label="Country"
        />
      </div>

      {/* Constituencies Section with Search */}
      {constituencies.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Select Your Constituency</h2>
          
          <SearchableSelect
            options={constituencies}
            value={parseInt(constituencyId) || null}
            onChange={(selectedConstituencyId) => {
              navigate(`/constituency/${selectedConstituencyId}`);
            }}
            placeholder="Search or select a constituency..."
            label="Constituency"
          />

          {/* Most Active Constituencies */}
          {popularConstituencies.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">🔥 Most Active</span>
                <span className="text-xs text-gray-400">(by discussions & votes)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularConstituencies.map((constituency) => (
                  <button
                    key={constituency.id}
                    onClick={() => handleConstituencySelect(constituency.id)}
                    className="text-sm bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 border border-orange-200 px-3 py-1 rounded-full transition flex items-center gap-1"
                  >
                    🔥 {constituency.name}
                    <span className="text-xs text-gray-500">
                      ({constituency.comment_count} 💬)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

            {/* Elections Section - Separate from Issues */}
      {constituencyId && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🗳️ Elections & Virtual MP</h2>
            {currentUser?.role === 'moderator' && (
              <Link
                to={`/create-election/${constituencyId}`}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 text-sm font-semibold"
              >
                + Create New Election
              </Link>
            )}
          </div>
          
          {elections.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No elections yet. {currentUser?.role === 'moderator' && 'Click the button above to create one!'}
            </p>
          ) : (
            <div className="space-y-3">
              {elections.map((election) => (
                <ElectionCard key={election.id} election={election} constituencyId={constituencyId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Issues List */}
      {constituencyId && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Issues in this Constituency</h2>
            <Link
              to={`/create-issue/${constituencyId}`}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              + Create New Issue
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading issues...</p>
          ) : issues.length === 0 ? (
            <p className="text-gray-500">No issues yet. Be the first to create one!</p>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div key={issue.id} className="border rounded-lg p-4 hover:shadow-md">
                  <Link to={`/issue/${issue.id}`}>
                    <h3 className="font-bold text-lg text-blue-600 hover:underline">
                      {issue.title}
                    </h3>
                  </Link>
                  <p className="text-gray-600 mt-2">{issue.content.substring(0, 200)}...</p>
                  <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                    <span>Posted by: {issue.author?.username || 'Unknown'}</span>
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                  {(currentUser?.role === 'moderator' || currentUser?.id === issue.user_id) && (
                    <button
                      onClick={() => handleDeleteIssue(issue.id)}
                      className="mt-2 text-red-500 text-sm hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConstituencyView;
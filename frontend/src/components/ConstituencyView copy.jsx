import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCountries, getConstituencies, getIssues, deleteIssue, getCurrentUser } from '../services/api';

function ConstituencyView() {
  const { constituencyId } = useParams();
  const [countries, setCountries] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const loadCountries = async () => {
    try {
      const data = await getCountries();
      setCountries(data);
    } catch (err) {
      console.error('Failed to load countries:', err);
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

  return (
    <div>
      {/* Country Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Select Your Country</h2>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a country...</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Constituencies Grid */}
      {constituencies.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Your Constituency</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {constituencies.map((constituency) => (
              <Link
                key={constituency.id}
                to={`/constituency/${constituency.id}`}
                className={`block p-4 border rounded-lg hover:shadow-lg transition ${
                  parseInt(constituencyId) === constituency.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <h3 className="font-semibold text-lg">{constituency.name}</h3>
              </Link>
            ))}
          </div>
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
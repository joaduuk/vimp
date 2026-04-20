import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createElection } from '../services/api';

function CreateElection() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [votingStartDate, setVotingStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  // Calculate preview dates when voting start date changes
  const handleDateChange = (date) => {
    setVotingStartDate(date);
    if (date) {
      const start = new Date(date);
      const registrationOpen = new Date(start);
      registrationOpen.setDate(start.getDate() - 7);
      const votingEnd = new Date(start);
      votingEnd.setDate(start.getDate() + 29);
      const resultsDay = new Date(votingEnd);
      resultsDay.setDate(votingEnd.getDate() + 1);
      
      setPreview({
        registrationOpen: registrationOpen.toDateString(),
        votingStart: start.toDateString(),
        votingEnd: votingEnd.toDateString(),
        resultsDay: resultsDay.toDateString()
      });
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await createElection({
        constituency_id: parseInt(constituencyId),
        title,
        description,
        start_date: new Date(votingStartDate).toISOString()
      });
      navigate(`/constituency/${constituencyId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create election');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold mb-6">Create New Election</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-semibold">
            Constituency ID
          </label>
          <input
            type="number"
            value={constituencyId}
            onChange={(e) => setConstituencyId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-semibold">
            Election Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Virtual MP Election 2024"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-semibold">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this election is for..."
            rows="3"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-semibold">
            Voting Start Date
          </label>
          <input
            type="date"
            value={votingStartDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Select the date when voting begins (registration opens 7 days before)
          </p>
        </div>

        {/* Timeline Preview */}
        {preview && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">📅 Election Timeline</h3>
            <div className="space-y-1 text-sm">
              <div>📋 Registration Opens: <span className="font-medium">{preview.registrationOpen}</span></div>
              <div>🗳️ Voting Starts: <span className="font-medium">{preview.votingStart}</span></div>
              <div>🏁 Voting Ends: <span className="font-medium">{preview.votingEnd}</span></div>
              <div>🏆 Results Announced: <span className="font-medium">{preview.resultsDay}</span></div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Election'}
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

export default CreateElection;
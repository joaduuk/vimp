import React, { useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile, getEligibleConstituencies, getCurrentUser } from '../services/api';

function UserProfile({ onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [constituencies, setConstituencies] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    constituency_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadProfile();
    loadConstituencies();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      setFormData({
        username: data.username,
        constituency_id: data.constituency_id || ''
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConstituencies = async () => {
    try {
      const data = await getEligibleConstituencies();
      setConstituencies(data);
    } catch (err) {
      console.error('Failed to load constituencies:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const updated = await updateUserProfile(formData);
      setProfile(updated);
      setEditMode(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      if (onProfileUpdate) onProfileUpdate(updated);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {!editMode ? (
          // View Mode
          <div className="space-y-4">
            <div className="border-b pb-3">
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div className="border-b pb-3">
              <label className="text-sm text-gray-500">Username</label>
              <p className="font-medium">{profile.username}</p>
            </div>
            <div className="border-b pb-3">
              <label className="text-sm text-gray-500">Role</label>
              <p className="font-medium capitalize">{profile.role}</p>
            </div>
            <div className="border-b pb-3">
              <label className="text-sm text-gray-500">My Constituency</label>
              <p className="font-medium">
                {profile.constituency_name || 'Not set'}
                {!profile.constituency_id && (
                  <span className="ml-2 text-xs text-yellow-600">(Required to participate)</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setEditMode(true)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">
                My Constituency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.constituency_id}
                onChange={(e) => setFormData({ ...formData, constituency_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select your constituency...</option>
                {constituencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                You can only participate fully in your selected constituency
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Warning if no constituency selected */}
      {!profile.constituency_id && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">Action Required</p>
              <p className="text-sm text-yellow-700">
                Please set your constituency to participate in local issues, voting, and elections.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
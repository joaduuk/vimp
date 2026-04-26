import React, { useEffect, useState } from 'react';
import { getAdminStats, getAllUsers, updateUserRole, deleteUser } from '../services/api';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAllUsers()
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setMessage({ type: 'error', text: 'Failed to load admin data' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setMessage({ type: 'success', text: `User role updated to ${newRole}` });
      loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update role' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Delete user "${username}"? This action cannot be undone.`)) {
      try {
        await deleteUser(userId);
        setMessage({ type: 'success', text: `User ${username} deleted` });
        loadData();
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to delete user' });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Platform management and user administration</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">{stats.total_issues}</div>
            <div className="text-sm text-gray-500">Issues</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.total_comments}</div>
            <div className="text-sm text-gray-500">Comments</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.total_votes}</div>
            <div className="text-sm text-gray-500">Votes</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.total_elections}</div>
            <div className="text-sm text-gray-500">Elections</div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">User Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Username</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-2">{user.id}</td>
                  <td className="px-4 py-2">{user.username}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
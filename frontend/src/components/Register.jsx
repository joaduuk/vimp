import React, { useState, useEffect } from 'react';
import { register, getPublicConstituencies } from '../services/api';
import { useNavigate } from 'react-router-dom';

function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [constituencies, setConstituencies] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [error, setError] = useState('');
  const [loadingConstituencies, setLoadingConstituencies] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadConstituencies = async () => {
      try {
        const data = await getPublicConstituencies();
        setConstituencies(data);
      } catch (err) {
        console.error('Failed to load constituencies:', err);
      } finally {
        setLoadingConstituencies(false);
      }
    };
    loadConstituencies();
  }, []);

  const countries = [...new Set(constituencies.map((c) => c.country))].sort();

  const filteredConstituencies = selectedCountry
    ? constituencies.filter((c) => c.country === selectedCountry)
    : [];

  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setConstituencyId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await register(email, username, password, constituencyId);
      onRegister(data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-2 text-center">Register for VirMP</h2>
      <p className="text-center text-gray-500 text-sm mb-6">
        Your constituency lets you participate in local issues, voting, and elections.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Country selector */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Country <span className="text-red-500">*</span>
          </label>
          {loadingConstituencies ? (
            <div className="text-sm text-gray-400 py-2">Loading countries...</div>
          ) : (
            <select
              value={selectedCountry}
              onChange={handleCountryChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your country...</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Constituency selector — only shown once country is picked */}
        {selectedCountry && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">
              Constituency <span className="text-red-500">*</span>
            </label>
            <select
              value={constituencyId}
              onChange={(e) => setConstituencyId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your constituency...</option>
              {filteredConstituencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              You can change this later in your profile if needed.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!constituencyId}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;
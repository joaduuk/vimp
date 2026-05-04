import axios from 'axios';

const API_BASE_URL = 'http://69.62.124.214';
//onst API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ RESPONSE INTERCEPTOR - Ensures arrays for all endpoints ============
api.interceptors.response.use((response) => {
  // List of endpoints that should always return arrays
  const arrayEndpoints = [
    '/notifications',
    '/countries', 
    '/constituencies',
    '/elections',
    '/comments',
    '/issues',
    '/popular-constituencies',
    '/user/eligible-constituencies',
    '/admin/users',
    '/moderator/pending-candidates',
    '/votes',
    '/user/vote'
  ];
  
  // Check if this endpoint should return an array
  const shouldBeArray = arrayEndpoints.some(endpoint => 
    response.config.url?.includes(endpoint)
  );
  
  // If it should be an array but isn't, convert it to an empty array or array with single item
  if (shouldBeArray && !Array.isArray(response.data)) {
    console.warn(`API ${response.config.url} returned non-array, converting to array`);
    response.data = response.data === null || response.data === undefined ? [] : [response.data];
  }
  
  return response;
}, (error) => {
  return Promise.reject(error);
});
// ============ END RESPONSE INTERCEPTOR ============

// Auth API
export const register = async (email, username, password, constituencyId) => {
  const response = await api.post('/api/register', { email, username, password, constituency_id: constituencyId });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/api/login', { email, password });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Countries API
export const getCountries = async () => {
  const response = await api.get('/api/countries');
  return response.data;
};

export const getPublicConstituencies = async () => {
  const response = await api.get('/api/public/constituencies');
  return response.data;
};
// Constituencies API  
export const getConstituencies = async (countryId) => {
  const url = countryId ? `/api/constituencies?country_id=${countryId}` : '/api/constituencies';
  const response = await api.get(url);
  return response.data;
};

// Issues API
export const getIssues = async (constituencyId) => {
  const response = await api.get(`/api/issues/${constituencyId}`);
  return response.data;
};

export const getIssue = async (issueId) => {
  const response = await api.get(`/api/issue/${issueId}`);
  return response.data;
};

export const createIssue = async (title, content, constituencyId) => {
  const response = await api.post('/api/issues', { title, content, constituency_id: constituencyId });
  return response.data;
};

export const deleteIssue = async (issueId) => {
  await api.delete(`/api/issue/${issueId}`);
};

// Comments API
export const getComments = async (issueId) => {
  const response = await api.get(`/api/comments/${issueId}`);
  return response.data;
};

export const createComment = async (content, issueId) => {
  const response = await api.post('/api/comments', { content, issue_id: issueId });
  return response.data;
};

export const deleteComment = async (commentId) => {
  await api.delete(`/api/comment/${commentId}`);
};

// Voting API
export const castVote = async (voteType, issueId) => {
  const response = await api.post('/api/vote', { vote_type: voteType, issue_id: issueId });
  return response.data;
};

export const getVoteCounts = async (issueId) => {
  const response = await api.get(`/api/votes/${issueId}`);
  return response.data;
};

export const getUserVote = async (issueId) => {
  const response = await api.get(`/api/user/vote/${issueId}`);
  return response.data;
};

// Popular Constituencies API
export const getPopularConstituencies = async () => {
  const response = await api.get('/api/popular-constituencies');
  return response.data;
};

// ============ ELECTION API ============

export const getElections = async (constituencyId = null, status = null) => {
  let url = '/api/elections';
  const params = new URLSearchParams();
  if (constituencyId) params.append('constituency_id', constituencyId);
  if (status) params.append('status', status);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await api.get(url);
  return response.data;
};

export const getElectionDetail = async (electionId) => {
  const response = await api.get(`/api/elections/${electionId}`);
  return response.data;
};

export const createElection = async (electionData) => {
  const response = await api.post('/api/elections', electionData);
  return response.data;
};

export const registerAsCandidate = async (electionId, manifesto) => {
  const response = await api.post(`/api/elections/${electionId}/candidate`, { manifesto });
  return response.data;
};

export const castElectionVote = async (electionId, candidateId) => {
  const response = await api.post(`/api/elections/${electionId}/vote`, { candidate_id: candidateId });
  return response.data;
};

export const getElectionResults = async (electionId) => {
  const response = await api.get(`/api/elections/${electionId}/results`);
  return response.data;
};

// ============ MODERATOR API ============

export const getPendingCandidates = async () => {
  const response = await api.get('/api/moderator/pending-candidates');
  return response.data;
};

export const approveCandidate = async (candidateId) => {
  const response = await api.put(`/api/moderator/candidates/${candidateId}/approve`);
  return response.data;
};

export const rejectCandidate = async (candidateId) => {
  const response = await api.put(`/api/moderator/candidates/${candidateId}/reject`);
  return response.data;
};

// ============ ADMIN API ============

export const getAdminStats = async () => {
  const response = await api.get('/api/admin/stats');
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get('/api/admin/users');
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await api.put(`/api/admin/users/${userId}/role?role=${role}`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/admin/users/${userId}`);
  return response.data;
};

// ============ USER PROFILE API ============

export const getUserProfile = async () => {
  const response = await api.get('/api/user/profile');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await api.put('/api/user/profile', profileData);
  // Update localStorage with new user data
  const currentUser = getCurrentUser();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...response.data };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }
  return response.data;
};

export const getEligibleConstituencies = async () => {
  const response = await api.get('/api/user/eligible-constituencies');
  return response.data;
};

// ============ NOTIFICATION API ============

export const getNotifications = async (limit = 50) => {
  try {
    const response = await api.get(`/api/notifications?limit=${limit}`);
    // Ensure we always return an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const markAllRead = async () => {
  try {
    const response = await api.put('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

export default api;
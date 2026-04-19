import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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

// Auth API
export const register = async (email, username, password) => {
  const response = await api.post('/register', { email, username, password });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/login', { email, password });
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
  const response = await api.get('/countries');
  return response.data;
};

// Constituencies API  
export const getConstituencies = async (countryId) => {
  const url = countryId ? `/constituencies?country_id=${countryId}` : '/constituencies';
  const response = await api.get(url);
  return response.data;
};

// Issues API
export const getIssues = async (constituencyId) => {
  const response = await api.get(`/issues/${constituencyId}`);
  return response.data;
};

export const getIssue = async (issueId) => {
  const response = await api.get(`/issue/${issueId}`);
  return response.data;
};

export const createIssue = async (title, content, constituencyId) => {
  const response = await api.post('/issues', { title, content, constituency_id: constituencyId });
  return response.data;
};

export const deleteIssue = async (issueId) => {
  await api.delete(`/issue/${issueId}`);
};

// Comments API
export const getComments = async (issueId) => {
  const response = await api.get(`/comments/${issueId}`);
  return response.data;
};

export const createComment = async (content, issueId) => {
  const response = await api.post('/comments', { content, issue_id: issueId });
  return response.data;
};

export const deleteComment = async (commentId) => {
  await api.delete(`/comment/${commentId}`);
};

// Voting API
export const castVote = async (voteType, issueId) => {
  const response = await api.post('/vote', { vote_type: voteType, issue_id: issueId });
  return response.data;
};

export const getVoteCounts = async (issueId) => {
  const response = await api.get(`/votes/${issueId}`);
  return response.data;
};

export const getUserVote = async (issueId) => {
  const response = await api.get(`/user/vote/${issueId}`);
  return response.data;
};

export default api;
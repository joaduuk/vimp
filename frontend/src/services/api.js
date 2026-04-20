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

// Popular Constituencies API
export const getPopularConstituencies = async () => {
  const response = await api.get('/popular-constituencies');
  return response.data;
};

// ============ ELECTION API ============

export const getElections = async (constituencyId = null, status = null) => {
  let url = '/elections';
  const params = new URLSearchParams();
  if (constituencyId) params.append('constituency_id', constituencyId);
  if (status) params.append('status', status);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await api.get(url);
  return response.data;
};

export const getElectionDetail = async (electionId) => {
  const response = await api.get(`/elections/${electionId}`);
  return response.data;
};

export const createElection = async (electionData) => {
  const response = await api.post('/elections', electionData);
  return response.data;
};

export const registerAsCandidate = async (electionId, manifesto) => {
  const response = await api.post(`/elections/${electionId}/candidate`, { manifesto });
  return response.data;
};

export const castElectionVote = async (electionId, candidateId) => {
  const response = await api.post(`/elections/${electionId}/vote`, { candidate_id: candidateId });
  return response.data;
};

export const getElectionResults = async (electionId) => {
  const response = await api.get(`/elections/${electionId}/results`);
  return response.data;
};
export default api;
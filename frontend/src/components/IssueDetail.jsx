import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, getComments, createComment, deleteComment, castVote, getVoteCounts, getUserVote, getCurrentUser } from '../services/api';

function IssueDetail() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [voteCounts, setVoteCounts] = useState({ for: 0, neutral: 0, against: 0, total: 0 });
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadData();
  }, [issueId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issueData, commentsData, votesData, userVoteData] = await Promise.all([
        getIssue(issueId),
        getComments(issueId),
        getVoteCounts(issueId),
        getUserVote(issueId)
      ]);
      setIssue(issueData);
      setComments(commentsData);
      setVoteCounts(votesData);
      setUserVote(userVoteData);
    } catch (err) {
      console.error('Failed to load data:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteType) => {
    try {
      await castVote(voteType, issueId);
      loadData();
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await createComment(newComment, issueId);
      setNewComment('');
      loadData();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(commentId);
        loadData();
      } catch (err) {
        console.error('Failed to delete comment:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!issue) {
    return <div className="text-center py-8">Issue not found</div>;
  }

  const totalVotes = voteCounts.total;
  const forPercentage = totalVotes > 0 ? (voteCounts.for / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (voteCounts.against / totalVotes) * 100 : 0;
  const neutralPercentage = totalVotes > 0 ? (voteCounts.neutral / totalVotes) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Issue Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">{issue.title}</h1>
        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{issue.content}</p>
        <div className="text-sm text-gray-500">
          Posted by {issue.author?.username} on {new Date(issue.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Voting Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">What's your stance?</h2>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => handleVote(1)}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              userVote?.vote_type === 1
                ? 'bg-green-600 text-white'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            👍 For ({voteCounts.for})
          </button>
          <button
            onClick={() => handleVote(0)}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              userVote?.vote_type === 0
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-500 text-white hover:bg-yellow-600'
            }`}
          >
            ⚖️ Neutral ({voteCounts.neutral})
          </button>
          <button
            onClick={() => handleVote(-1)}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              userVote?.vote_type === -1
                ? 'bg-red-600 text-white'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            👎 Against ({voteCounts.against})
          </button>
        </div>

        {/* Vote Progress Bars */}
        {totalVotes > 0 && (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${forPercentage}%` }} />
              <div className="bg-yellow-500 h-full" style={{ width: `${neutralPercentage}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${againstPercentage}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center">Total votes: {totalVotes}</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows="3"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Post Comment
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500">No comments yet. Start the discussion!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="text-gray-700">{comment.content}</p>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>By {comment.author?.username}</span>
                  <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                {(currentUser?.role === 'moderator' || currentUser?.id === comment.user_id) && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="mt-1 text-red-500 text-sm hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueDetail;
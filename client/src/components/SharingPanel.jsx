import { useState, useEffect } from 'react';
import { getUsers, getShares, shareDocument, revokeShare } from '../api/client';

export default function SharingPanel({ docId, isOwner }) {
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [permission, setPermission] = useState('read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!docId || !isOwner) return;
    loadData();
  }, [docId, isOwner]);

  async function loadData() {
    try {
      const [userList, shareList] = await Promise.all([
        getUsers(),
        getShares(docId),
      ]);
      setUsers(userList);
      setShares(shareList);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleShare() {
    if (!selectedUser) return;
    setLoading(true);
    setError('');
    try {
      await shareDocument(docId, selectedUser, permission);
      setSelectedUser('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(userId) {
    try {
      await revokeShare(docId, userId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!isOwner) {
    return (
      <div className="panel">
        <h3>Sharing</h3>
        <p className="empty-msg">Only the document owner can manage sharing.</p>
      </div>
    );
  }

  const shareableUsers = users.filter(
    u => !shares.find(s => s.user_id === u.id)
  );

  return (
    <div className="panel">
      <h3>Sharing</h3>

      {error && <div className="error-msg">{error}</div>}

      <div className="share-form">
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
        >
          <option value="">Select user...</option>
          {shareableUsers.map(u => (
            <option key={u.id} value={u.username}>{u.display_name} ({u.username})</option>
          ))}
        </select>
        <select value={permission} onChange={e => setPermission(e.target.value)}>
          <option value="read">Can view</option>
          <option value="write">Can edit</option>
        </select>
        <button
          className="btn-primary btn-sm"
          onClick={handleShare}
          disabled={!selectedUser || loading}
        >
          Share
        </button>
      </div>

      <div className="shares-list">
        <h4>Shared with</h4>
        {shares.length === 0 && <p className="empty-msg">Not shared with anyone yet.</p>}
        {shares.map(share => (
          <div key={share.id} className="share-item">
            <span>
              <strong>{share.display_name}</strong>
              <span className="badge badge-shared"> {share.permission === 'write' ? 'Can edit' : 'Can view'}</span>
            </span>
            <button
              className="btn-icon btn-danger btn-sm"
              onClick={() => handleRevoke(share.user_id)}
              title="Revoke access"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

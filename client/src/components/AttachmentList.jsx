import { useState, useEffect, useRef } from 'react';
import { getAttachments, uploadAttachment, deleteAttachment, importFile } from '../api/client';

export default function AttachmentList({ docId, canEdit, onRefresh }) {
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    if (!docId) return;
    loadAttachments();
  }, [docId]);

  async function loadAttachments() {
    try {
      const list = await getAttachments(docId);
      setAttachments(list);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadAttachment(docId, file);
      await loadAttachments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(attId) {
    try {
      await deleteAttachment(docId, attId);
      await loadAttachments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    try {
      await importFile(docId, file);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return (
    <div className="panel">
      <h3>Attachments</h3>

      {error && <div className="error-msg">{error}</div>}

      {canEdit && (
        <div className="attach-actions">
          <button
            className="btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Upload File'}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => importInputRef.current?.click()}
          >
            Import into doc
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.txt"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      )}

      <div className="attachments-list">
        {attachments.length === 0 && (
          <p className="empty-msg">No attachments yet.</p>
        )}
        {attachments.map(att => (
          <div key={att.id} className="attach-item">
            <a
              href={`/uploads/${att.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="attach-name"
            >
              {att.original_name}
            </a>
            <span className="attach-size">{formatSize(att.size)}</span>
            {canEdit && (
              <button
                className="btn-icon btn-danger btn-sm"
                title="Delete attachment"
                onClick={() => handleDelete(att.id)}
              >
                &#10005;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

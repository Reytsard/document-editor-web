import { useState, useRef } from 'react';
import { createDocument, renameDocument, deleteDocument, uploadMd } from '../api/client';

export default function DocumentList({
  docs,
  selectedId,
  onSelect,
  onRefresh,
  currentUser,
}) {
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);
  const mdInputRef = useRef(null);

  async function handleCreate() {
    try {
      const doc = await createDocument();
      await onRefresh();
      onSelect(doc.id);
    } catch (err) {
      alert(err.message);
    }
  }

  function startRename(doc, e) {
    e.stopPropagation();
    setRenaming(doc.id);
    setRenameValue(doc.title);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }

  async function handleRename(docId) {
    if (!renameValue.trim()) return;
    try {
      await renameDocument(docId, renameValue);
      setRenaming(null);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(docId, e) {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(docId);
      if (selectedId === docId) onSelect(null);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleMdUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const doc = await uploadMd(file);
      await onRefresh();
      onSelect(doc.id);
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  }

  function renderDoc(doc, isOwned) {
    const isSelected = selectedId === doc.id;
    const isRenaming = renaming === doc.id;

    return (
      <div
        key={doc.id}
        className={`doc-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(doc.id)}
      >
        <div className="doc-item-main">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="rename-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => handleRename(doc.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename(doc.id);
                if (e.key === 'Escape') setRenaming(null);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="doc-title-text">{doc.title}</span>
          )}
          <span className="doc-meta">
            {isOwned ? (
              <span className="badge badge-owner">Owner</span>
            ) : (
              <span className={`badge badge-shared badge-${doc.role}`}>
                {doc.role === 'write' ? 'Can edit' : 'Can view'}
              </span>
            )}
          </span>
        </div>
        {isOwned && !isRenaming && (
          <div className="doc-actions">
            <button
              className="btn-icon"
              title="Rename"
              onClick={e => startRename(doc, e)}
            >&#9998;</button>
            <button
              className="btn-icon btn-danger"
              title="Delete"
              onClick={e => handleDelete(doc.id, e)}
            >&#10005;</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="doc-list">
      <div className="doc-list-header">
        <h2>Documents</h2>
        <div className="doc-list-actions">
          <button className="btn-primary btn-sm" onClick={handleCreate}>
            + New
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => mdInputRef.current?.click()}
          >
            Upload .md
          </button>
          <input
            ref={mdInputRef}
            type="file"
            accept=".md,.txt"
            style={{ display: 'none' }}
            onChange={handleMdUpload}
          />
        </div>
      </div>

      <div className="doc-section">
        <h3 className="section-title">My Documents</h3>
        {docs.owned.length === 0 && (
          <p className="empty-msg">No documents yet. Create one!</p>
        )}
        {docs.owned.map(doc => renderDoc(doc, true))}
      </div>

      <div className="doc-section">
        <h3 className="section-title">Shared With Me</h3>
        {docs.shared.length === 0 && (
          <p className="empty-msg">No shared documents</p>
        )}
        {docs.shared.map(doc => renderDoc(doc, false))}
      </div>

      <div className="user-info">
        Signed in as <strong>{currentUser?.display_name}</strong>
      </div>
    </div>
  );
}

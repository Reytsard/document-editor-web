import { useState, useEffect } from 'react';
import Login from './components/Login';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import SharingPanel from './components/SharingPanel';
import AttachmentList from './components/AttachmentList';
import { getDocuments, getDocument, logout } from './api/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState({ owned: [], shared: [] });
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('attachments');

  async function loadDocs() {
    try {
      const data = await getDocuments();
      setDocs(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }

  useEffect(() => {
    if (user) loadDocs();
  }, [user]);

  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      return;
    }
    getDocument(selectedDocId)
      .then(d => setSelectedDoc(d))
      .catch(() => setSelectedDoc(null));
  }, [selectedDocId]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setSelectedDocId(null);
    setDocs({ owned: [], shared: [] });
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const isOwner = selectedDoc && selectedDoc.userPermission === 'owner';
  const canEdit = selectedDoc && (isOwner || selectedDoc.userPermission === 'write');

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>DocEditor</h1>
        <button className="btn-secondary" onClick={handleLogout}>Sign Out</button>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <DocumentList
            docs={docs}
            selectedId={selectedDocId}
            onSelect={setSelectedDocId}
            onRefresh={loadDocs}
            currentUser={user}
          />
        </aside>

        <main className="main-content">
          <DocumentEditor docId={selectedDocId} />

          {selectedDocId && (
            <aside className="right-panel">
              <div className="panel-tabs">
                <button
                  className={`tab-btn ${activeTab === 'attachments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attachments')}
                >
                  Attachments
                </button>
                <button
                  className={`tab-btn ${activeTab === 'sharing' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sharing')}
                >
                  Sharing
                </button>
              </div>
              {activeTab === 'attachments' ? (
                <AttachmentList
                  docId={selectedDocId}
                  canEdit={canEdit}
                  onRefresh={loadDocs}
                />
              ) : (
                <SharingPanel docId={selectedDocId} isOwner={isOwner} />
              )}
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}

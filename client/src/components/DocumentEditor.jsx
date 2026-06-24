import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Toolbar from './Toolbar';
import { getDocument, updateDocument } from '../api/client';

export default function DocumentEditor({ docId }) {
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const docIdRef = useRef(docId);
  const saveTimerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    docIdRef.current = docId;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder: 'Start typing...' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const currentDocId = docIdRef.current;
        if (!currentDocId) return;
        try {
          setSaving(true);
          await updateDocument(currentDocId, html);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          setError('Save failed: ' + err.message);
        } finally {
          setSaving(false);
        }
      }, 1500);
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
    },
  });

  useEffect(() => {
    if (!docId || !editor) return;
    setError('');
    getDocument(docId)
      .then(d => {
        setDoc(d);
        if (d.content !== editor.getHTML()) {
          editor.commands.setContent(d.content || '');
        }
      })
      .catch(err => setError(err.message));
  }, [docId, editor]);

  useEffect(() => {
    if (!docId || !editor) return;
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        updateDocument(docId, editor.getHTML())
          .then(() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          })
          .catch(err => setError('Save failed: ' + err.message));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, docId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleWheel(e) {
      el.scrollTop += e.deltaY;
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  if (!docId) {
    return (
      <div className="editor-empty">
        <p>Select a document from the sidebar or create a new one.</p>
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="editor-empty">
        <p className="error-msg">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-status">
        {saving && <span className="status-saving">Saving...</span>}
        {saved && <span className="status-saved">Saved</span>}
        {error && <span className="status-error">{error}</span>}
      </div>
      <Toolbar editor={editor} />
      <div ref={scrollRef} className="editor-scroll">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

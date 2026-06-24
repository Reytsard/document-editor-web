export default function Toolbar({ editor }) {
  if (!editor) return null;

  const buttons = [
    {
      label: 'B',
      title: 'Bold (Ctrl+B)',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      style: { fontWeight: 'bold' },
    },
    {
      label: 'I',
      title: 'Italic (Ctrl+I)',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      style: { fontStyle: 'italic' },
    },
    {
      label: 'U',
      title: 'Underline (Ctrl+U)',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
      style: { textDecoration: 'underline' },
    },
  ];

  const headingButtons = [
    { label: 'H1', level: 1 },
    { label: 'H2', level: 2 },
    { label: 'H3', level: 3 },
    { label: 'P', level: 0 },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {buttons.map(btn => (
          <button
            key={btn.label}
            className={`toolbar-btn ${btn.isActive ? 'active' : ''}`}
            title={btn.title}
            onClick={btn.action}
            style={btn.style}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        {headingButtons.map(h => (
          <button
            key={h.label}
            className={`toolbar-btn ${editor.isActive('heading', h.level ? { level: h.level } : {}) ? 'active' : ''}`}
            title={h.level ? `Heading ${h.level}` : 'Paragraph'}
            onClick={() => {
              if (h.level) {
                editor.chain().focus().toggleHeading({ level: h.level }).run();
              } else {
                editor.chain().focus().setParagraph().run();
              }
            }}
          >
            {h.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          &#8226; List
        </button>
        <button
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Numbered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
      </div>
    </div>
  );
}

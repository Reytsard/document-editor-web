const sanitizeHtml = require('sanitize-html');

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'u', 's', 'del', 'sup', 'sub',
  'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'pre', 'code', 'blockquote',
]);

const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target'],
  img: ['src', 'alt', 'title'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

function sanitize(html) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

module.exports = { sanitize };

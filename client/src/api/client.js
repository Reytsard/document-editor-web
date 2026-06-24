const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return request('/auth/me');
}

export async function getUsers() {
  return request('/auth/users');
}

export async function getDocuments() {
  return request('/documents');
}

export async function createDocument() {
  return request('/documents', { method: 'POST' });
}

export async function getDocument(id) {
  return request('/documents/' + id);
}

export async function updateDocument(id, content) {
  return request('/documents/' + id, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function renameDocument(id, title) {
  return request('/documents/' + id + '/rename', {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteDocument(id) {
  return request('/documents/' + id, { method: 'DELETE' });
}

export async function uploadMd(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(BASE + '/documents/upload-md', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function importFile(docId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(BASE + '/documents/' + docId + '/import', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return data;
}

export async function shareDocument(docId, username, permission) {
  return request('/documents/' + docId + '/share', {
    method: 'POST',
    body: JSON.stringify({ username, permission }),
  });
}

export async function revokeShare(docId, userId) {
  return request('/documents/' + docId + '/share/' + userId, { method: 'DELETE' });
}

export async function getShares(docId) {
  return request('/documents/' + docId + '/shares');
}

export async function uploadAttachment(docId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(BASE + '/documents/' + docId + '/attachments', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function getAttachments(docId) {
  return request('/documents/' + docId + '/attachments');
}

export async function deleteAttachment(docId, attId) {
  return request('/documents/' + docId + '/attachments/' + attId, { method: 'DELETE' });
}

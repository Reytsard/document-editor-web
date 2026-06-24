import { useState, useEffect } from 'react';
import { login, getMe } from '../api/client';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMe().then(user => onLogin(user)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>DocEditor</h1>
        <p className="login-subtitle">A lightweight document editor</p>
        <form onSubmit={handleSubmit}>
          <div className="login-hint">
            <p>Demo accounts (password: <code>password123</code>)</p>
          </div>
          <label>
            Username
            <select value={username} onChange={e => setUsername(e.target.value)}>
              <option value="alice">alice (Alice Johnson)</option>
              <option value="bob">bob (Bob Smith)</option>
              <option value="charlie">charlie (Charlie Brown)</option>
            </select>
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password123"
            />
          </label>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

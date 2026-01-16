import { useState } from 'react';

function AdminLogin({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    function handleSubmit() {
        const ok = onLogin(password);
        if (!ok) {
            setError('Password errata');
            setPassword('');
        }
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h2>🔐 Accesso Admin</h2>

            <input
                type="password"
                placeholder="Password admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={handleSubmit}>
                Entra
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default AdminLogin;
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

    function handleKeyDown(e) {
        if (e.key === 'Enter') handleSubmit();
    }

    return (
        <div className="page">
            <div className="card">
                <div className="game-logo">Quizzettone</div>
                <p className="card__subtitle">🔐 Accesso amministratore</p>

                <input
                    className="input"
                    type="password"
                    placeholder="Password admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <div style={{ marginTop: '0.75rem' }}>
                    <button
                        className="btn btn--primary btn--full"
                        disabled={!password}
                        onClick={handleSubmit}
                    >
                        Entra
                    </button>
                </div>

                {error && <div className="admin-login__error">{error}</div>}
            </div>
        </div>
    );
}

export default AdminLogin;

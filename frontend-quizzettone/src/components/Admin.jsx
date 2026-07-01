import { useState, useEffect } from 'react';
import { useQuizSocket } from "../hooks/useQuizSocket";
import { useAdminAuth } from "../hooks/useAdminAuth";
import AdminLogin from "./AdminLogin";

function Admin() {

    const { isAdmin, login, logout } = useAdminAuth();

    const [players, setPlayers] = useState([]);
    const [winner, setWinner] = useState(null);
    const [scores, setScores] = useState([]);
    const [loginError, setLoginError] = useState(null);

    const socket = useQuizSocket('admin', (msg) => {
        if (msg.type === 'PLAYERS_UPDATE') {
            setPlayers(msg.players);
        }
        if (msg.type === 'WINNER') {
            setWinner(msg.player);
        }
        if (msg.type === 'RESET') {
            setWinner(null);
        }
        if (msg.type === 'SCORES_UPDATE') {
            setScores(msg.scores);
        }
        // Server conferma la password → login riuscito
        if (msg.type === 'ADMIN_OK') {
            setLoginError(null);
        }
        // Server rifiuta la password → logout forzato con errore
        if (msg.type === 'ADMIN_DENIED') {
            setLoginError('Password errata');
            logout();
        }
    });

    useEffect(() => {
        if (isAdmin) {
            const password = localStorage.getItem('quiz_admin_password');
            if (password) {
                socket.sendAdminLogin(password);
            }
        }
    }, [isAdmin]);

    // Pulisce l'errore login prima di un nuovo tentativo
    function handleLogin(password) {
        setLoginError(null);
        return login(password);
    }

    if (!isAdmin) {
        return <AdminLogin onLogin={handleLogin} serverError={loginError} />;
    }

    return (
        <div className="page page--admin">
            <div className="admin-header">
                <div className="game-logo" style={{ marginBottom: 0 }}>Quizzettone</div>
                <div className="admin-header__actions">
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={logout}
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="admin-content">
                {/* Winner banner */}
                {winner && (
                    <div className="admin-section" style={{ padding: '1rem 1.5rem' }}>
                        <div className="winner-banner" style={{ margin: 0 }}>
                            <div className="winner-banner__label">Primo a premere</div>
                            <div className="winner-banner__name">{winner}</div>
                        </div>
                    </div>
                )}

                {/* Quiz controls */}
                <div className="admin-section">
                    <div className="admin-section__header">
                        <div className="admin-section__title">🎮 Controlli Quiz</div>
                    </div>
                    <button
                        className="btn btn--primary"
                        onClick={socket.reset}
                        style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}
                    >
                        🔄 RESET QUIZ
                    </button>
                </div>

                {/* Players table */}
                <div className="admin-section">
                    <div className="admin-section__header">
                        <div className="admin-section__title">👥 Giocatori ({players.length})</div>
                    </div>

                    {players.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state__icon">👤</div>
                            <div className="empty-state__text">Nessun giocatore connesso</div>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Buzz</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map(player => (
                                        <tr key={player.id}>
                                            <td style={{ fontWeight: 600 }}>{player.name}</td>
                                            <td>
                                                <span className={`badge ${player.canBuzz ? 'badge--success' : 'badge--error'}`}>
                                                    {player.canBuzz ? '🟢 Abilitato' : '🔴 Bloccato'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                    <button
                                                        className={`btn btn--icon ${player.canBuzz ? 'btn--danger' : 'btn--success'}`}
                                                        onClick={() =>
                                                            socket.setPlayerCanBuzz(
                                                                player.id,
                                                                !player.canBuzz
                                                            )
                                                        }
                                                        title={player.canBuzz ? 'Blocca' : 'Sblocca'}
                                                    >
                                                        {player.canBuzz ? '🔒' : '🔓'}
                                                    </button>
                                                    <button
                                                        className="btn btn--icon btn--danger"
                                                        onClick={() => {
                                                            const confirmed =
                                                                confirm(
                                                                    `Resettare il player "${player.name}" ?`
                                                                );
                                                            if (!confirmed) return;
                                                            socket.forceResetPlayer(player.id);
                                                        }}
                                                        title="Reset Player"
                                                    >
                                                        🧨
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Scoreboard */}
                <div className="admin-section">
                    <div className="admin-section__header">
                        <div className="admin-section__title">🏆 Classifica</div>
                        {scores.length > 0 && (
                            <button
                                className="btn btn--ghost btn--sm"
                                onClick={socket.resetScores}
                            >
                                Resetta tutto
                            </button>
                        )}
                    </div>

                    {scores.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state__icon">🏆</div>
                            <div className="empty-state__text">Nessun punteggio</div>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nome</th>
                                        <th>Punteggio</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...scores]
                                        .sort((a, b) => b.score - a.score)
                                        .map((entry, i) => (
                                            <tr key={entry.id}>
                                                <td>
                                                    <span className={`rank-number ${i < 3 ? 'rank-number--top' : ''}`}>
                                                        {i + 1}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{entry.name}</td>
                                                <td className="score-display">{entry.score}</td>
                                                <td>
                                                    <div className="score-actions">
                                                        <button
                                                            className="btn btn--icon btn--danger"
                                                            onClick={() => socket.adjustScore(entry.id, -1)}
                                                            title="−1"
                                                        >
                                                            −
                                                        </button>
                                                        <button
                                                            className="btn btn--icon btn--success"
                                                            onClick={() => socket.adjustScore(entry.id, 1)}
                                                            title="+1"
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            className="btn btn--icon btn--ghost"
                                                            onClick={() => socket.removeScore(entry.id)}
                                                            title="Rimuovi dalla classifica"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Admin;

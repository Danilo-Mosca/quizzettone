import { useState, useEffect } from 'react';
import { useQuizSocket } from '../hooks/useQuizSocket.jsx';
import { getOrCreatedPlayerId, getPlayerName, setPlayerName, resetPlayerId } from '../utils/playerIdentity.js';

export default function QuizButton() {
    const playerId = getOrCreatedPlayerId();
    const savedName = getPlayerName();

    const [playerName, setPlayerNameState] = useState(savedName || '');
    const [joined, setJoined] = useState(!!savedName);
    const [connecting, setConnecting] = useState(false);
    const [winner, setWinner] = useState(null);
    const [error, setError] = useState(null);
    const [players, setPlayers] = useState([]);
    const [canBuzz, setCanBuzz] = useState(false);

    const { sendWelcome, buzz, selfUnregister } = useQuizSocket('player', (msg) => {
        if (msg.type === 'NAME_OK') {
            setJoined(true);
            setError(null);
            setConnecting(false);
        }

        if (msg.type === 'NAME_TAKEN') {
            setError(msg.message);
            setJoined(false);
            setConnecting(false);
        }

        if (msg.type === 'WINNER') {
            setWinner(msg.player);
        }

        if (msg.type === 'RESET') {
            setWinner(null);
        }

        if (msg.type === 'PLAYERS_UPDATE') {
            const me = msg.players.find(p => p.id === playerId);
            if (me) {
                setCanBuzz(me.canBuzz);
            }
            setPlayers(msg.players.map(p => p.name));
        }

        if (msg.type === 'FORCE_RESET') {
            resetPlayerId();
            window.location.reload();
        }
    });

    useEffect(() => {
        if (savedName) {
            setConnecting(true);
            sendWelcome(savedName);
        }
    }, []);

    /**
     * 🖱️📱 Handler unificato per BUZZ (mouse + touch).
     * 
     * Su desktop, onMouseDown è più veloce di onClick (~50ms di vantaggio).
     * Su mobile, il browser NON genera mousedown immediato: prima scatta
     * touchstart, poi attende ~300ms per eventuale doppio-tap (zoom) e solo
     * dopo sintetizza un mousedown ritardato.
     * 
     * La soluzione: gestire subito touchstart con preventDefault() per
     * bloccare la generazione dell'evento mouse sintetico ritardato.
     * In questo modo sia mouse che touch partono con la massima reattività.
     * 
     * @param {React.MouseEvent | React.TouchEvent} e - Evento nativo
     */
    function handleBuzz(e) {
        // Su mobile (touchstart), impediamo al browser di generare
        // un successivo mousedown fittizio con latenza da doppio-tap.
        // Su desktop preventDefault non ha effetti negativi su mousedown.
        e.preventDefault();
        buzz();
    }

    function handleResetIdentity() {
        const confirmReset = confirm('Sei sicuro di voler entrare come nuovo player?');
        if (confirmReset) {
            selfUnregister();
            resetPlayerId();
            window.location.reload();
        }
    }

    if (!joined) {
        if (connecting) {
            return (
                <div className="page">
                    <p style={{ color: 'var(--color-text-secondary)' }}>⏳ Connessione in corso...</p>
                </div>
            );
        }
        return (
            <div className="page">
                <div className="card">
                    <div className="game-logo">Quizzettone</div>
                    <p className="card__subtitle">Inserisci il tuo nome per entrare</p>

                    <input
                        className="input"
                        value={playerName}
                        onChange={(e) => setPlayerNameState(e.target.value)}
                        placeholder="Il tuo nome"
                    />

                    <div style={{ marginTop: '0.75rem' }}>
                        <button
                            className="btn btn--primary btn--full"
                            disabled={!playerName}
                            onClick={() => {
                                setConnecting(true);
                                setPlayerName(playerName);
                                sendWelcome(playerName);
                            }}
                        >
                            Entra nel quiz
                        </button>
                    </div>

                    {error && <div className="admin-login__error">{error}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="game-logo">Quizzettone</div>

                <button
                    className={`buzz-btn ${canBuzz && !winner ? 'buzz-btn--pulse' : ''}`}
                    onMouseDown={handleBuzz}
                    onTouchStart={handleBuzz}
                    disabled={!canBuzz || winner}
                >
                    BUZZ!
                </button>

                {winner && (
                    <div className="winner-banner">
                        <div className="winner-banner__label">Primo a premere</div>
                        <div className="winner-banner__name">{winner}</div>
                    </div>
                )}
            </div>

            <div className="player-list">
                <div className="player-list__header">
                    👥 Giocatori ({players.length})
                </div>
                {players.length === 0 ? (
                    <div className="player-list__item" style={{ border: 'none', color: 'var(--color-text-muted)' }}>
                        Nessun giocatore connesso
                    </div>
                ) : (
                    players.map((p, i) => (
                        <div key={i} className="player-list__item">
                            <span className="player-list__dot" />
                            {p}
                        </div>
                    ))
                )}
            </div>

            <button
                className="btn btn--ghost"
                style={{ marginTop: '1rem' }}
                onClick={handleResetIdentity}
            >
                🔄 Entra come nuovo giocatore
            </button>
        </div>
    );
}

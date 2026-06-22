import { useState, useEffect } from 'react';
import { useQuizSocket } from "../hooks/useQuizSocket";     // Importo l'hook personalizzato useQuizSocket che crea la connessione WebSocket, gestisce onmessage
import { useAdminAuth } from "../hooks/useAdminAuth";       // Importo l'hook personalizzato useAdminAuth che gestisce stato admin (isAdmin), gestisce login, gestisce logout
import AdminLogin from "./AdminLogin";      // Importo il componente AdminLogin.jsx

function Admin() {

    /**
     * 🔐 Gestione login admin
     */
    // Destrutturo l'hook personalizzato "useAdminAuth" per usare le sue funzioni:
    const { isAdmin, login, logout } = useAdminAuth();

    /**
     * 👥 Lista player ricevuta dal server
     *
     * Formato:
     * [
     *   {
     *      id,
     *      name,
     *      canBuzz
     *   }
     * ]
     */
    const [players, setPlayers] = useState([]);
    // MODIFICA: Stato per mostrare nell'admin chi ha premuto il Buzz per primo, proprio come nella pagina del player.
    const [winner, setWinner] = useState(null);
    // 🏆 Classifica punteggi
    const [scores, setScores] = useState([]);

    /* SPIEGAZIONE DEL CODICE DI SEGUITO E DELLA CHIAMATA A useQuizSocket():
     * Quando entro come admin non vedrò mai il console.log('MSG: ', msg);
     * Questo perché il server NON sta inviando alcun messaggio all’admin in quel momento. 
     * ➡️ onMessage viene eseguito solo quando il server manda qualcosa.
     * Un WebSocket funziona così:
     * Client  ──(SEND)──▶  Server
     * Client  ◀─(MESSAGE)─ Server
     * ❌ NON è: “mi connetto → ricevo subito qualcosa”. ✔️ È: “ricevo SOLO quando il server invia”
     * COSA SUCCEDE (step by step):
     * 1️⃣ L’admin apre /admin e viene eseguita la seguente riga di codice: const socket = useQuizSocket('admin', callback);
     * Dentro useQuizSocket viene creato: new WebSocket('ws://192.168.1.86:3000')
     * la socket si connette, STOP, il server NON manda nulla automaticamente.
     * 2️⃣ onmessage è pronto… ma inattivo:
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };
     * ✔️ Il listener è registrato, ❌ ma nessun messaggio arriva.
     * Quando parte davvero il console.log? SOLO se il server esegue: ws.send(...) oppure broadcast(...)
     * Nel server.js solo in questi casi: HELLO OK -> NAME_OK, Nome duplicato -> NAME_TAKEN, BUZZ vinto -> WINNER, RESET -> RESET
     * L’admin NON riceve nulla quando: entra, si connette, fa login.
     * Mentre riceverà il console.log('MSG: ', msg) se ad esempio clicco sul pulsante del vincitore: MSG: { type: "WINNER", player: "Danilo" }
     * Oppure quando un utente si disconnette: MSG:  {type: 'PLAYERS_UPDATE', players: Array(0)}
     * O quando un utente si connette: MSG:  {type: 'PLAYERS_UPDATE', players: Array(1)}
     */
    // ✅ HOOK CHIAMATO SEMPRE. Connessione websocket admin
    const socket = useQuizSocket('admin', (msg) => {
        console.log('MSG: ', msg);
        /**
         * 👥 Aggiornamento lista player
         */
        if (msg.type === 'PLAYERS_UPDATE') {
            setPlayers(msg.players);
        }
        // MODIFICA: Gestiamo il messaggio WINNER anche nell'admin in modo da visualizzare
        // chi ha premuto il Buzz per primo, esattamente come avviene nella pagina del player.
        if (msg.type === 'WINNER') {
            setWinner(msg.player);
        }
        // MODIFICA: Quando arriva il RESET, azzeriamo anche il vincitore visualizzato nell'admin.
        if (msg.type === 'RESET') {
            setWinner(null);
        }
        // 🏆 Aggiornamento classifica
        if (msg.type === 'SCORES_UPDATE') {
            setScores(msg.scores);
        }
    });

    // MODIFICA: Quando l'admin è autenticato sul client (isAdmin === true),
    // inviamo automaticamente la password al server WebSocket tramite `sendAdminLogin`.
    // Questo accade al primo login e ad ogni refresh della pagina (sfruttando il localStorage).
    useEffect(() => {
        if (isAdmin) {
            const password = localStorage.getItem('quiz_admin_password');
            if (password) {
                socket.sendAdminLogin(password);
            }
        }
    }, [isAdmin]);

    // 🔐 NON loggato → mostra login
    if (!isAdmin) {
        return <AdminLogin onLogin={login} />;
    }

    // ✅ LOGGATO → dashboard admin
    return (
        <div style={{ padding: '2rem' }}>
            <h1>🎤 Pannello Admin</h1>

            {/* RESET QUIZ GENERALE */}
            <button
                onClick={socket.reset}
                style={{ fontSize: '2rem', padding: '1rem' }}
            >
                RESET QUIZ
            </button>

            {/* MODIFICA: Mostriamo il vincitore del Buzz anche nel pannello admin.
                Il messaggio scompare quando l'admin preme RESET QUIZ. */}
            {winner && <h2>🏆 Primo a premere: {winner}</h2>}

            <hr />

            <h2>👥 Giocatori Connessi ({players.length})</h2>

            {
                players.length === 0
                    ? <p>Nessun giocatore connesso</p>
                    : (
                        <table
                            border="1"
                            cellPadding="10"
                            style={{
                                borderCollapse: 'collapse'
                            }}
                        >
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

                                        {/* Nome player */}
                                        <td>
                                            {player.name}
                                        </td>

                                        {/* Stato buzzer */}
                                        <td>

                                            {
                                                player.canBuzz
                                                    ? '🟢 Abilitato'
                                                    : '🔴 Bloccato'
                                            }

                                        </td>

                                        {/* Azioni admin */}
                                        <td>

                                            {/* Toggle blocco/sblocco */}

                                            <button
                                                onClick={() =>
                                                    socket.setPlayerCanBuzz(
                                                        player.id,
                                                        !player.canBuzz
                                                    )
                                                }
                                            >
                                                {
                                                    player.canBuzz
                                                        ? '🔒 Blocca'
                                                        : '🔓 Sblocca'
                                                }
                                            </button>

                                            {' '}

                                            {/* Reset identità */}

                                            <button
                                                onClick={() => {

                                                    const confirmed =
                                                        confirm(
                                                            `Resettare il player "${player.name}" ?`
                                                        );

                                                    if (!confirmed) return;

                                                    socket.forceResetPlayer(
                                                        player.id
                                                    );
                                                }}
                                            >
                                                🧨 Reset Player
                                            </button>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>
                    )
            }

            {/* 🏆 CLASSIFICA */}
            <h2>🏆 Classifica</h2>

            {
                scores.length === 0
                    ? <p>Nessun punteggio</p>
                    : (
                        <table
                            border="1"
                            cellPadding="10"
                            style={{
                                borderCollapse: 'collapse',
                                marginTop: '0.5rem'
                            }}
                        >
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
                                            <td>{i + 1}</td>
                                            <td>{entry.name}</td>
                                            <td>{entry.score}</td>
                                            <td>
                                                <button
                                                    onClick={() => socket.adjustScore(entry.id, -1)}
                                                >
                                                    −
                                                </button>
                                                {' '}
                                                <button
                                                    onClick={() => socket.adjustScore(entry.id, 1)}
                                                >
                                                    +
                                                </button>
                                                {' '}
                                                <button
                                                    onClick={() => socket.removeScore(entry.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    )
            }

            <button
                onClick={socket.resetScores}
                style={{ marginTop: '0.5rem' }}
            >
                Resetta Classifica
            </button>

            <hr />

            <button onClick={logout}>
                Logout
            </button>

        </div>
    );
}

export default Admin;
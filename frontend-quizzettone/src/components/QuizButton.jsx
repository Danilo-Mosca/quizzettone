import { useState, useEffect } from 'react';
import { useQuizSocket } from '../hooks/useQuizSocket.jsx';         // Usando il percorso relativo
// import { useQuizSocket } from '/src/hooks/useQuizSocket.jsx';    // Usando il percorso assoluto che in realtà non è il vero percorso assoluto JavaScript ma è una convenzione di Vite
import { getOrCreatedPlayerId, getPlayerName, setPlayerName, resetPlayerId } from '../utils/playerIdentity.js';         // Importo la funzione resetPlayerId() dal file "playerIdentity.js"

export default function QuizButton() {
    // Recupero UUID e nome salvati nel localStorage
    const playerId = getOrCreatedPlayerId();      // UUID unico per questo giocatore
    const savedName = getPlayerName();            // Legge il nome salvato nel localStorage (se presente)

    // Stato del componente
    const [playerName, setPlayerNameState] = useState(savedName || '');  // Nome del giocatore
    const [joined, setJoined] = useState(!!savedName);              // true se il player ha completato l'iscrizione
    const [connecting, setConnecting] = useState(false);            // true se stiamo aspettando risposta dal server
    const [winner, setWinner] = useState(null);                     // Primo giocatore che ha premuto BUZZ. Variabile di stato che controlla chi ha premuto per primo il pulsante
    const [error, setError] = useState(null);                       // Messaggi di errore (es. nome già preso)
    const [players, setPlayers] = useState([]);                     // Lista dei giocatori connessi
    const [canBuzz, setCanBuzz] = useState(false);                  // Stato server per abilitare/disabilitare il pulsante BUZZ


    /** Inizializziamo la socket WebSocket */
    const { sendWelcome, buzz, selfUnregister } = useQuizSocket('player', (msg) => {
        // Se il nome è stato preso, ovvero quando il type del messaggio è === 'NAME_OK': SERVER → NAME_OK
        if (msg.type === 'NAME_OK') {
            setJoined(true);    // Setto la variabile di stato "setJoined" a true. Il player è ufficialmente registrato
            setError(null);     // Setto la variabile di stato "setError" a null
            setConnecting(false);

            // Salva sempre il nome nel localStorage, anche in caso di reconnect
            setPlayerName(playerName || msg.playerName);
        }

        // ❌ Nome già preso
        // Se il nome è già presente e quindi non è stato preso, ovvero quando il type del messaggio è === 'NAME_TAKEN': SERVER → NAME_TAKEN
        if (msg.type === 'NAME_TAKEN') {
            setError(msg.message);  // Setto la variabile di stato "setError" con la stringa ricevuta dal server: "Nome giocatore già presente, scegline un altro!"
            setJoined(false);
            setConnecting(false);
        }

        // Se il server annuncia il vincitore: SERVER → WINNER
        if (msg.type === 'WINNER') {
            setWinner(msg.player);
            // MODIFICA: Rimosso il setTimeout() provvisorio che azzerava il vincitore dopo 5 secondi.
            // Ora il reset del vincitore avviene correttamente quando l'admin preme "RESET QUIZ",
            // che invia { type: 'RESET' } e viene gestito dal blocco sottostante.
        }

        // Reset del quiz generico: SERVER → RESET
        if (msg.type === 'RESET') {
            setWinner(null);
        }

        // Aggiornamento lista giocatori dal server: SERVER → PLAYERS_UPDATE, include stato canBuzz
        if (msg.type === 'PLAYERS_UPDATE') {
            // MODIFICA: Identifichiamo il giocatore corrente confrontando l'ID unico (playerId)
            // anziché il nome. Questo è molto più robusto ed evita disallineamenti o bug
            // qualora il nome non sia inserito o contenga spazi extra.
            const me = msg.players.find(p => p.id === playerId);
            if (me) {
                setCanBuzz(me.canBuzz); // abilita/disabilita pulsante in base al server
            }
            
            // Lista dei player solo per mostrare i nomi
            setPlayers(msg.players.map(p => p.name));
        }

        // 🧨 Admin forza reset del player → cancella localStorage + reload
        if (msg.type === 'FORCE_RESET') {
            resetPlayerId();           // Rimuove UUID + nome
            window.location.reload();  // Ricarica pagina
        }
    });

    // useEffect automatico: se abbiamo già un nome salvato → invio HELLO al server automaticamente
    useEffect(() => {
        if (savedName) {
            setConnecting(true);          // Mostriamo "Connessione in corso..."
            sendWelcome(savedName);       // Invia HELLO al server
        }
    }, []); // eseguito solo al montaggio

    // Funzione che gestisce il reset del nome del giocatore
    function handleResetIdentity() {
        // Il metodo confirm() è una funzione integrata di JavaScript che serve a mostare una finestra di dialogo modale al browser per chiedere
        // conferma all'utente. confirm() visualizza un messaggio con due pulsanti: "Ok", "Annulla" e restituisce un valore booleano in base alla scelta
        // dell'utente
        const confirmReset = confirm('Sei sicuro di voler entrare come nuovo player?');
        if (confirmReset) {
            // MODIFICA: Prima di cancellare il localStorage, notifichiamo il server di rimuovere
            // questa identità da registeredPlayers. Senza questo passaggio, il server manteneva
            // il vecchio nome registrato e il player non poteva rientrare con lo stesso nome.
            selfUnregister();
            // Richiamo la funzione resetPlayerId() dal file "playerIdentity.js" che eliminerà l'UUID dal localStorage del client (giocatore) che lo ha richiesto
            resetPlayerId();            // Rimuove UUID
            window.location.reload();   // Refresho la pagina per potergli assegnare un nuovo nome, un nuovo UUID e così una nuova identità
        }
    }

    // Se il giocatore non è ancora entrato, mostra form di inserimento nome
    if (!joined) {
        if (connecting) {
            return <p>⏳ Connessione in corso...</p>;
        }
        return (
            <>
                <input
                    value={playerName}
                    onChange={(e) => setPlayerNameState(e.target.value)}
                    placeholder="Inserisci il tuo nome"
                />
                <button
                    disabled={!playerName}   // Disabilita se input vuoto
                    onClick={() => {
                        setConnecting(true);                 // Mostriamo stato "connessione"
                        sendWelcome(playerName);             // Invio messaggio HELLO al server
                    }}
                >
                    Entra nel quiz
                </button>

                {error && <p style={{ color: 'red' }}>{error}</p>}
            </>
        );
    }

    // 🔹 Player registrato → mostra pulsante BUZZ + lista giocatori
    return (
        <>
            <button
                onMouseDown={buzz}  // onMouseDown più veloce di onClick
                disabled={!canBuzz || winner}  // Disabilitato se il server lo blocca o se c'è già un vincitore
                style={{
                    fontSize: '3rem',
                    padding: '2rem',
                    background: 'red',
                    color: 'white'
                }}
            >
                BUZZ!
            </button>

            {winner && <h2>🏆 Primo: {winner}</h2>}

            {/* Lista giocatori connessi */}
            <h3>👥 Giocatori connessi ({players.length})</h3>
            <ul>
                {players.map((p, i) => (
                    <li key={i}>{p}</li>
                ))}
            </ul>

            {/* Bottone per entrare come nuovo giocatore */}
            <button onClick={handleResetIdentity}>
                Entra come nuovo giocatore
            </button>
        </>
    );
}
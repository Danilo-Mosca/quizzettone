// Importiamo la libreria ws (WebSocket server)
import { WebSocketServer, WebSocket } from 'ws';

// Creiamo un server WebSocket che ascolta sulla porta 3000
const wss = new WebSocketServer({ port: 3000 });

/**
 * 🔐 PASSWORD ADMIN (per ora hardcoded)
 * In futuro verrà spostata in una variabile d’ambiente (.env)
 */
const ADMIN_PASSWORD = 'quiz123'; // ⚠️ poi la sposteremo in .env

/**
 * Stato del quiz
 * Tutto in RAM → latenza minima
 */
let buzzerLocked = false; // true = qualcuno ha già premuto
let firstPlayer = null;  // nome del primo giocatore
// Aggiunto un oggetto di tipo Map(), una struttura dati pensata per memorizzare coppie chiave → valore, simile a un oggetto({}):
// la chiave sarà il valore di: playerId, il valore sarà: playerName
const connectedPlayers = new Map();     // valore persistente finché il server è acceso (UUID → nome (connessioni))
// Se connectedPlayers rappresenta le connessioni attive, registeredPlayers conterrà le identità:
// 🧠 Player registrati (UUID → nome)
const registeredPlayers = new Map();    // valore persistente finché il server è acceso (UUID → nome (identità))
/*********** QUINDI ORA L'IDENTITA' COMPLETA SARA': UUID + playerName ***********/

/**
 * Evento scatenato OGNI VOLTA che un client si connette
 * ws rappresenta QUEL giocatore
 */
wss.on('connection', (ws) => {
    console.log('🟢 Connessione in entrata');
    // IMPORTANTE: l'oggetto 'ws' rappresenta "quella connession", quella istanza specifica, quel client specifico che si è appena connesso

    /**
     * Evento: il client manda un messaggio
     * msg arriva come Buffer → lo convertiamo in stringa
     */
    ws.on('message', (msg) => {
        const data = JSON.parse(msg);

        /**
         * 🔐 LOGIN ADMIN
         * Questo messaggio NON è legato al player
         * Serve solo ad autenticare la socket come admin
         */
        if (data.type === 'ADMIN_LOGIN') {
            if (data.password === ADMIN_PASSWORD) {
                ws.role = 'admin';

                ws.send(JSON.stringify({
                    type: 'ADMIN_OK'
                }));

                console.log('🔐 Admin autenticato');
            } else {
                ws.send(JSON.stringify({
                    type: 'ADMIN_DENIED'
                }));
            }
            return;
        }
        
        // Caso 0: il giocatore si presenta
        /*** HELLO → handshake iniziale, arriva subito dopo l'apertura della socket
        handshake = processo di negoziazione iniziale tra due dispositivi (client e server) per stabilire una comunicazione sicura e affidabile
        */
        if (data.type === 'HELLO') {
            const { playerId, playerName, role } = data;

            // 🔁 CASO 1: UUID GIA' REGISTRATO (refresh / reconnect --------> quando si fa il refresh della pagina oppure ci si riconnette ad essa)
            // Controllo se il playerId è presente in registeredPlayers:
            if (registeredPlayers.has(playerId)) {
                const savedName = registeredPlayers.get(playerId);
                
                ws.playerId = playerId;
                ws.playerName = savedName;
                ws.role = role || 'player';
                // Se il playerId è presente, lo setto nell'oggetto di tipo Map() "connectedPlayers":
                connectedPlayers.set(playerId, savedName);
                
                // Allora mando un oggetto Json contenente un un type: "NAME_OK" per far capire che per quell'UUID già registrato 
                // è presente un nome , e quindi lo invio al client:
                ws.send(JSON.stringify({
                    type: 'NAME_OK',
                    playerName: savedName,
                    reconnect: true
                }));
                // Semplice messaggio informativo contenente il messaggio dell'utente riconnesso:
                console.log(`Player ${savedName} RICONNESSO! Id player: ${playerId}`);

                // 🔴 STEP 3 → aggiorniamo lista giocatori
                broadcastPlayers();
                return;
            }

            // 🚨 CASO 2: UUID NUOVO → PASSO AL CONTROLLO DEL NOME
            // controlla unicià del nome (escludendo se stesso)
            for (const [id, name] of registeredPlayers) {
                // Controllo se il nome del giocatore è uguale ad uno già presente su "registeredPlayers".
                // IMPORTANTE: prima del confronto tra le stringhe del nome porto queste tutte in maiuscolo (per evitare il case sensitive dei nomi)
                // con il metodo "toUpperCase()" ed elimino gli spazi alla sinistra e alla destra del stringa con il metodo "trim()"
                if (name.toUpperCase().trim() === playerName.toUpperCase().trim()) {
                    // Allora mando un oggetto Json contenente un messaggio di giocatore già presente e un type: "nome preso":
                    ws.send(JSON.stringify({
                        type: 'NAME_TAKEN',
                        message: 'Nome giocatore già presente, scegline un altro!'
                    }));
                    return;
                }
            }

            // INFINE SE IL NOME NON E' GIA' PRESENTE SALVO:
            // ✅ Registrazione nuova identità
            registeredPlayers.set(playerId, playerName);    //aggiungo la nuova identità su "registeredPlayers"
            // Creo una chiave dinamica "playerId" a cui associerò l'UUID salvato nel localStorage del client del giocatore:
            ws.playerId = playerId;    // Oppure andava bene anche: ws.playerId = data.playerId;
            // Creo una chiave dinamica "playerName" dell'oggetto ws per poterci salvare il nome del client appena connesso:
            ws.playerName = playerName;  // ✅ memorizziamo il nome sul ws. Andava bene anche: ws.playerName = data.playerName;
            ws.role = role || 'player';    // Creo un'altra chiave dinamica per il ruolo del client: giocatore o admin (conduttore). Andava bene anche: ws.role = data.role

            // Aggiungo il nuovo nome nell'oggetto di tipo Map() "connectedPlayers":
            connectedPlayers.set(playerId, playerName);
            // console.log(connectedPlayers);

            // Allora mando un oggetto Json contenente un un type: "NAME_OK" per far capire che il nome è stato preso correttamente
            ws.send(JSON.stringify({ type: 'NAME_OK' }));

            console.log(`🟢 ${ws.role.toUpperCase()} "${ws.playerName}" (${ws.playerId}) connesso`);

            // 🔴 STEP 3 → aggiorniamo lista giocatori
            broadcastPlayers();
            return;
        }
        
        /**
         * Caso 1: il giocatore preme il pulsante BUZZ
         * BUZZ → SOLO PLAYER
         */
        if (data.type === 'BUZZ') {
            // Se non è un player (quindi un admin) eseguo un return
            if (ws.role !== 'player') return;

            /* Altrimenti controllo se qualcuno ha già premuto e stampo a schermo eventuale vincitore */
            // Se nessuno ha ancora premuto
            if (!buzzerLocked) {
                buzzerLocked = true;        // blocchiamo il buzzer
                // firstPlayer = data.player; // salviamo chi ha vinto VECCHIO CODICE
                firstPlayer = ws.playerName;    // salviamo chi ha vinto, lo decide il server e così abbiamo meno latenza

                console.log('🚨 PRIMO BUZZ:', firstPlayer);

                // Avvisiamo TUTTI i client chi è il vincitore
                broadcast({
                    type: 'WINNER',
                    player: firstPlayer
                });

                /********** setTimeout() PROVVISORIO Setto provvisoriamente un timeout per ripristinare la variabile buzzerLocked a false dato che ancora non sviluppo la sezione "reset del quiz" del conduttore, una volta sviluppata bisogna togliere il setTimeOut() **********/
                setTimeout(() => {
                    buzzerLocked = false;
                    console.log("Variabile buzzerLocked sblocca quiz: ", buzzerLocked);
                }, 5000);
                /********** Fine codice provvisorio **********/
            }
        }

        /**
         * Caso 2: reset del quiz (tipicamente dal conduttore)
         * RESET → SOLO ADMIN
         */
        if (data.type === 'RESET') {
            // Se non admin rifiuto il reset
            if (ws.role != 'admin') {
                console.log(`⛔ RESET rifiutato (non admin)`);
                return;
            }
            buzzerLocked = false;
            firstPlayer = null;

            // Avvisiamo tutti che il quiz è resettato
            broadcast({ type: 'RESET' });
        }
    });

    /**
     * Evento: client disconnesso
     */
    ws.on('close', () => {
        // Alla disconnessione del browser/client se è presente un'istanza dell'oggetto ws (WebSocket) con quell'id, allora cancello il relativo nome_giocatore e id_giocatore salvato in "connectedPlayers":
        if (ws.playerId) {
            connectedPlayers.delete(ws.playerId);
            // 👉 Questo evita: nomi bloccati per sempre, zombie players

            // 🔴 STEP 3 → aggiorniamo lista giocatori
            broadcastPlayers();
        }
        // console.log('🔴 Giocatore disconnesso');
        const name = ws.playerName || 'Sconosciuto';
        const role = ws.role || 'Ruolo sconosciuto';
        console.log(`🔴 ${role} "${name}" disconnesso`);
    });
});

/**
 * Funzione helper per inviare un messaggio (con il nome del vincitore o se viene eseguito un reset)
 * a TUTTI i client connessi
 */
function broadcast(message) {
    const payload = JSON.stringify(message);

    wss.clients.forEach(client => {
        // Mandiamo il messaggio solo se la socket è aperta
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

/**
 * 🔴 STEP 3
 * Invia la lista dei giocatori connessi a TUTTI i client
 */
function broadcastPlayers() {
    const players = Array.from(connectedPlayers.values());
    /* Spiegazione della riga di codice di sopra:
    connectedPlayers.values() ---> Restituisce un iteratore che contiene tutti i valori della Map (non le chiavi).
    Array.from(...)           ---> Converte quell’iteratore in un array vero e proprio.
    Risultato finale:
    players sarà un array contenente tutti i valori presenti in connectedPlayers.
    
    Esempio concreto:
    const connectedPlayers = new Map();
    connectedPlayers.set(1, "Mario");
    connectedPlayers.set(2, "Luigi");

    const players = Array.from(connectedPlayers.values());

    console.log(players);   // ["Mario", "Luigi"]
    */
    
    broadcast({
        type: 'PLAYERS_UPDATE',
        players
    });
}

console.log('🚀 Quiz server WebSocket su ws://192.168.1.86:3000');  //L'IP del mio pc per potervi accedere nella mia rete locale
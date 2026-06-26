// Importiamo la libreria ws (WebSocket server)
import { WebSocketServer, WebSocket } from 'ws';

// Creiamo un server WebSocket che ascolta sulla porta 3000
// Prima del deploy per il locale:
// const wss = new WebSocketServer({ port: 3000 });
// Dopo il deploy visibile su Render.com:
const wss = new WebSocketServer({ host: '127.0.0.1', port: 3000 });

/**
 * 🔐 PASSWORD ADMIN (da .env)
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
    console.error('❌ ERRORE: ADMIN_PASSWORD non definita. Creare un file .env con ADMIN_PASSWORD=...');
    process.exit(1);
}

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
 * 🏆 Punteggi classifica (UUID → numero)
 */
const scores = new Map();

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

                // MODIFICA: Inviamo immediatamente la lista aggiornata di tutti i giocatori
                // all'admin appena autenticato, in modo che l'interfaccia si allinei subito
                // anche in caso di login iniziale o di refresh della pagina.
                broadcastPlayers();
                broadcastScores();
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
                // MODIFICA: registeredPlayers ora memorizza un oggetto { name, canBuzz } anziché solo il nome.
                // Questo permette di ripristinare lo stato del buzzer assegnato dall'admin anche dopo un refresh.
                const savedData = registeredPlayers.get(playerId);
                const savedName = savedData.name;

                ws.playerId = playerId;
                ws.playerName = savedName;
                ws.role = role || 'player';

                // MODIFICA: Ora leggiamo canBuzz direttamente da registeredPlayers (dove viene mantenuto
                // aggiornato da ADMIN_SET_CAN_BUZZ), invece di cercarlo in connectedPlayers che viene
                // azzerato al disconnect. In questo modo il permesso assegnato dall'admin sopravvive al refresh.
                connectedPlayers.set(playerId, {
                    name: savedName,
                    canBuzz: savedData.canBuzz  // lo stato canBuzz è ora persistente tra i refresh
                });

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
                broadcastScores();
                return;
            }

            // 🚨 CASO 2: UUID NUOVO → PASSO AL CONTROLLO DEL NOME
            // controlla unicià del nome (escludendo se stesso). Controllo se il nome è duplicato
            for (const savedData of registeredPlayers.values()) {
                // MODIFICA: registeredPlayers ora contiene oggetti { name, canBuzz }, quindi leggiamo savedData.name.
                // IMPORTANTE: prima del confronto tra le stringhe del nome porto queste tutte in maiuscolo (per evitare il case sensitive dei nomi)
                // con il metodo "toUpperCase()" ed elimino gli spazi alla sinistra e alla destra del stringa con il metodo "trim()"
                if (savedData.name.toUpperCase().trim() === playerName.toUpperCase().trim()) {
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
            // MODIFICA: registeredPlayers ora salva un oggetto { name, canBuzz } al posto della sola stringa del nome.
            // canBuzz parte sempre a false: il player è bloccato finché l'admin non lo sblocca esplicitamente.
            registeredPlayers.set(playerId, { name: playerName, canBuzz: false });
            // 🏆 Punteggio iniziale per la classifica
            if (!scores.has(playerId)) {
                scores.set(playerId, 0);
            }
            // Creo una chiave dinamica "playerId" a cui associerò l'UUID salvato nel localStorage del client del giocatore:
            ws.playerId = playerId;    // Oppure andava bene anche: ws.playerId = data.playerId;
            // Creo una chiave dinamica "playerName" dell'oggetto ws per poterci salvare il nome del client appena connesso:
            ws.playerName = playerName;  // ✅ memorizziamo il nome sul ws. Andava bene anche: ws.playerName = data.playerName;
            ws.role = role || 'player';    // Creo un'altra chiave dinamica per il ruolo del client: giocatore o admin (conduttore). Andava bene anche: ws.role = data.role

            // Aggiungo il nuovo nome nell'oggetto di tipo Map() "connectedPlayers":
            // 🔒 Player parte BLOCCATO
            connectedPlayers.set(playerId, {
                name: playerName,
                canBuzz: false
            });

            // Allora mando un oggetto Json contenente un un type: "NAME_OK" per far capire che il nome è stato preso correttamente
            ws.send(JSON.stringify({ type: 'NAME_OK' }));

            console.log(`🟢 ${ws.role.toUpperCase()} "${ws.playerName}" (${ws.playerId}) connesso`);

            // 🔴 STEP 3 → aggiorniamo lista giocatori
            broadcastPlayers();
            broadcastScores();
            return;
        }

        /**
         * Caso 1: il giocatore preme il pulsante BUZZ
         * BUZZ → SOLO PLAYER SE ABILITATO
         */
        if (data.type === 'BUZZ') {
            // Se non è un player (quindi un admin) eseguo un return
            if (ws.role !== 'player') return;

            const player = connectedPlayers.get(ws.playerId);
            if (!player || !player.canBuzz) return;

            /* Altrimenti controllo se qualcuno ha già premuto e stampo a schermo eventuale vincitore */
            // Se nessuno ha ancora premuto
            if (!buzzerLocked) {
                buzzerLocked = true;        // blocchiamo il buzzer
                // firstPlayer = data.player; // salviamo chi ha vinto VECCHIO CODICE
                firstPlayer = player.name;    // salviamo chi ha vinto, lo decide il server e così abbiamo meno latenza

                console.log('🚨 PRIMO BUZZ:', firstPlayer);

                // Avvisiamo TUTTI i client chi è il vincitore
                broadcast({
                    type: 'WINNER',
                    player: firstPlayer
                });
                // MODIFICA: Rimosso il setTimeout() provvisorio che sbloccava il buzzer automaticamente
                // dopo 5 secondi. Ora il reset viene gestito correttamente dall'admin tramite il pulsante
                // "RESET QUIZ", che invia { type: 'RESET' } e viene elaborato dal nuovo handler dedicato.
            }
        }

        /**
         * 🎛️ ADMIN → abilita / disabilita BUZZ
         */
        if (data.type === 'ADMIN_SET_CAN_BUZZ') {
            if (ws.role !== 'admin') return;

            const { playerId, canBuzz } = data;
            const player = connectedPlayers.get(playerId);
            if (!player) return;

            // Aggiorniamo canBuzz nella sessione attiva
            player.canBuzz = canBuzz;

            // MODIFICA: aggiorniamo canBuzz anche in registeredPlayers in modo che
            // il permesso assegnato dall'admin venga mantenuto se il player fa un refresh della pagina.
            const regPlayer = registeredPlayers.get(playerId);
            if (regPlayer) regPlayer.canBuzz = canBuzz;

            broadcastPlayers();
        }
        
        /**
         * Caso 3: reset del quiz (tipicamente dal conduttore)
         * ADMIN → reset player
         */
        if (data.type === 'ADMIN_FORCE_RESET_PLAYER') {
            // Se non admin rifiuto il reset
            if (ws.role != 'admin') {
                console.log(`⛔ RESET rifiutato (non admin)`);
                return;
            }
            
            const { playerId } = data;

            wss.clients.forEach(client => {
                if (client.playerId === playerId) {
                    client.send(JSON.stringify({ type: 'FORCE_RESET' }));
                }
            });

            connectedPlayers.delete(playerId);
            registeredPlayers.delete(playerId);
            scores.delete(playerId);
            broadcastPlayers();
            broadcastScores();
        }

        /**
         * MODIFICA: Auto-deregistrazione del player (pulsante "Entra come nuovo giocatore")
         * PLAYER → rimuove se stesso da registeredPlayers e connectedPlayers.
         * 
         * Senza questo handler, quando un player clicca "Entra come nuovo giocatore" e resetta
         * il localStorage, il server manteneva ancora il vecchio nome in registeredPlayers.
         * Risultato: se il player provava a rientrare con lo stesso nome, riceveva "Nome già presente".
         */
        if (data.type === 'PLAYER_UNREGISTER') {
            if (ws.playerId) {
                // Rimuoviamo il player sia dalla lista delle connessioni attive che dalle identità registrate
                connectedPlayers.delete(ws.playerId);
                registeredPlayers.delete(ws.playerId);
                scores.delete(ws.playerId);
                broadcastPlayers();
                broadcastScores();
                console.log(`🗑️ Player "${ws.playerName}" si è auto-deregistrato`);
            }
        }

        /**
         * MODIFICA: Reset generale del quiz (pulsante "RESET QUIZ" del conduttore)
         * ADMIN → azzera lo stato del buzzer e notifica tutti i client
         * 
         * Prima questo handler mancava completamente: il frontend inviava { type: 'RESET' }
         * ma il server non lo gestiva, quindi il reset del quiz non produceva alcun effetto.
         */
        if (data.type === 'RESET') {
            // Verifichiamo che solo l'admin possa eseguire il reset generale
            if (ws.role !== 'admin') {
                console.log('⛔ RESET QUIZ rifiutato (non admin)');
                return;
            }

            // Resettiamo lo stato del buzzer: il quiz può ripartire
            buzzerLocked = false;   // Sblocchiamo il buzzer: ora tutti i player abilitati potranno premere di nuovo
            firstPlayer = null;     // Azzeriamo il vincitore precedente

            console.log('🔄 RESET QUIZ eseguito dall\'admin');

            // Notifichiamo TUTTI i client connessi (player e admin) che il quiz è stato resettato.
            // I player riceveranno il messaggio RESET e azzeranno la variabile di stato "winner",
            // rendendo il pulsante BUZZ di nuovo visibile/premibile (se abilitato).
            broadcast({ type: 'RESET' });
        }

        /**
         * 🏆 ADMIN → aggiusta punteggio classifica
         */
        if (data.type === 'ADMIN_ADJUST_SCORE') {
            if (ws.role !== 'admin') return;

            const { playerId, delta } = data;
            const current = scores.get(playerId);
            if (current === undefined) return;

            scores.set(playerId, current + delta);
            broadcastScores();
        }

        /**
         * 🏆 ADMIN → rimuove un giocatore dalla classifica
         */
        if (data.type === 'ADMIN_REMOVE_SCORE') {
            if (ws.role !== 'admin') return;

            scores.delete(data.playerId);
            broadcastScores();
        }

        /**
         * 🏆 ADMIN → resetta tutti i punteggi
         */
        if (data.type === 'ADMIN_RESET_SCORES') {
            if (ws.role !== 'admin') return;

            for (const id of scores.keys()) {
                scores.set(id, 0);
            }
            broadcastScores();
            console.log('🏆 Classifica resettata dall\'admin');
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
 * 👥 Aggiornamento lista player
 */
function broadcastPlayers() {
    /*-------- OLD CODE /*-------- */
    // const players = Array.from(connectedPlayers.values());
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
    /*-------- END OLD CODE /*-------- */

    const players = Array.from(connectedPlayers.entries()).map(
        ([id, data]) => ({
            id,
            name: data.name,
            canBuzz: data.canBuzz
        })
    );

    broadcast({
        type: 'PLAYERS_UPDATE',
        players
    });
}

/**
 * 🏆 Invia la classifica dei punteggi a TUTTI i client
 */
function broadcastScores() {
    const scoreList = Array.from(scores.entries()).map(
        ([id, score]) => {
            const player = registeredPlayers.get(id);
            return {
                id,
                name: player ? player.name : 'Sconosciuto',
                score
            };
        }
    );

    broadcast({
        type: 'SCORES_UPDATE',
        scores: scoreList
    });
}

console.log(`🚀 Quiz server WebSocket in ascolto sulla porta 3000`);
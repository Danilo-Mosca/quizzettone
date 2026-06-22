import { useEffect, useRef } from 'react';
import { getOrCreatedPlayerId } from '../utils/playerIdentity';     // Importo la funzione getOrCreatedPlayerId() dal file "playerIdentity.js"

export function useQuizSocket(role, onMessage) {
    // useRef mantiene la stessa socket tra i render
    const socketRef = useRef(null);     // Senza useRef, ogni render creerebbe una nuova socket e chiuderebbe quella precedente
    // MODIFICA: Utilizziamo una coda di messaggi generica (non solo per HELLO)
    // per accumulare tutti i comandi inviati prima che la socket diventi OPEN.
    const messageQueueRef = useRef([]); // Coda dei messaggi da inviare appena la socket si apre

    // useEffect eseguito solo al montaggio del componente
    useEffect(() => {
        // Creiamo la connessione WebSocket
        const ws = new WebSocket('ws://192.168.1.86:3000');    // Crea la connessione al server WebSocket
        socketRef.current = ws;         // Salva la socket in socketRef.current così può essere riutilizzata fuori dall’useEffect.
        // socketRef.current conterrà sempre l’istanza attiva della socket



        /* Appena la connessione è aperta (onopen), inviamo tutti messaggi di HELLO al server. Questo serve al server per identificare ogni client */
        ws.onopen = () => {
            console.log('🔌 WebSocket aperta');
            // MODIFICA: Appena la socket è pronta, inviamo tutti i messaggi in coda (inclusi login admin e azioni dei player)
            while (messageQueueRef.current.length > 0) {
                const payload = messageQueueRef.current.shift();
                ws.send(JSON.stringify(payload));
            }
        };

        /**
         * Quando arriva un messaggio dal server
         */
        ws.onmessage = (event) => {
            // L'oggetto event ha alcune proprietà importanti: event.data -> contiene il contenuto del messaggio ricevuto dal server
            const data = JSON.parse(event.data);    //event.data può essere: una stringa (JSON, testo) come in questo caso, un Blob, un ArrayBuffer
            onMessage(data);        // Ogni volta che il server invia un messaggio, viene chiamata la callback onMessage.
        };

        /* Cleanup quando il componente si smonta */
        return () => ws.close();    // Quando il componente che usa l’hook si smonta, la connessione WebSocket viene chiusa automaticamente. Evita perdite di memoria o connessioni zombie.
    }, []);

    /**
     * 🛡️ FUNZIONE DI INVIO SICURO DEI MESSAGGI
     * Usato da TUTTI (player + admin)
     * Evita race condition:
     * - socket non ancora pronta
     * - socket chiusa
     * - click troppo veloci
     */
    function safeSend(payload) {
        const ws = socketRef.current;
        /* Se la socket non esiste o non è OPEN, non inviamo nulla.
        L'istruzione:
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
        è equivalente a quella di seguito: */
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket non pronta, messaggio messo in coda:', payload);
            // MODIFICA: Mettiamo in coda qualsiasi tipo di messaggio in modo da poterlo inviare automaticamente 
            // appena la connessione si apre, evitando la perdita di dati per race condition (ad esempio all'avvio dell'admin).
            messageQueueRef.current.push(payload);
            return;
        }
        // Se la socket esiste allora inviamo il messaggio!
        /* IMPORTANTE: DA QUESTA FUNZIONE (safeSend()) PASSERANNO "TUTTI" I MESSAGGI DA INVIARE AL SERVER, IN MODO DA CONTROLLARE PRIMA
           SE LA SOCKET ESISTA O MENO COSI' DA AVERE SEMPRE UN "INVIO SICURO".
           L'istruzione:
           socketRef.current.send(JSON.stringify(payload));
           è equivalente a quella di seguito: */
        ws.send(JSON.stringify(payload));
    }

    // Invia HELLO in modo sicuro (con retry se la socket non è pronta)
    function sendWelcome(playerName) {
        const playerId = getOrCreatedPlayerId();     // Creo il  nuovo UUID richiamando la funzione del file playerIdentity.js
        const payload = { type: 'HELLO', playerId, playerName, role };
        // Richiamo la funzione safeSend() (invio sicuro) così da controllare se la Socket esiste in modo da poter inviare un messaggio/oggetto 
        // al server con il nome del giocatore. Qui verrà inviato subito il nome del client associato a quello specifico utente. 
        // Questo serve al server per identificare ogni client:
        safeSend(payload);      // Se la socket non pronta, il payload va in coda
    };

    /**
     * Funzione che invia il BUZZ (pulsante schiacciato) al server
     */
    const buzz = () => {
        // Quando un giocatore preme il pulsante, invia un messaggio al server di tipo BUZZ. Non c’è gestione interna della concorrenza: il server decide
        // chi è il vincitore.
        // Richiamo la funzione safeSend() (invio sicuro: evita crash su click rapidi/rete lenta) così da controllare se la Socket esiste e in caso
        // affermativo, questa invierà l'oggetto payload al server:
        safeSend({
            type: 'BUZZ',
            // Il nome NON serve: il server lo ha già memorizzato al HELLO
            // non ho più necessità di inviare il nome del giocatore perchè il nome viene già passato in ws.onopen() 
            // quando il type === 'HELLO' e quindi il server ha già memorizzato il suo nome nella istanza creata 
            // per quel client al momento della connessione al server.
            // QUESTO GENERA MENO BYTE DI DATI TRASMESSI QUINDI PIU' SICUREZZA E SOPRATTUTTO MENO LATENZA
        });
    };

    /**
     * Reset del quiz (solo conduttore di solito)
     */
    const reset = () => {
        // Permette di inviare un comando di reset al server. Tipicamente usata dal conduttore per far ripartire il quiz
        // Richiamo la funzione safeSend() (invio sicuro) così da controllare se la Socket esiste e in caso affermativo, questa invierà l'oggetto payload
        // al server in modo sicuro:
        safeSend({
            type: 'RESET'
        });
    };

    /**
 * 🔓 ADMIN → abilita/disabilita il buzzer
 */
    const setPlayerCanBuzz = (playerId, canBuzz) => {
        safeSend({
            type: 'ADMIN_SET_CAN_BUZZ',
            playerId,
            canBuzz
        });
    };

    /**
     * 🧨 ADMIN → forza reset identità player
     */
    const forceResetPlayer = (playerId) => {
        safeSend({
            type: 'ADMIN_FORCE_RESET_PLAYER',
            playerId
        });
    };
    
    /**
     * MODIFICA: Funzione per autenticare l'admin inviando la password al server.
     * Questo assegna il ruolo 'admin' alla socket corrente lato backend.
     */
    function sendAdminLogin(password) {
        safeSend({
            type: 'ADMIN_LOGIN',
            password
        });
    }
    
    /**
     * MODIFICA: Auto-deregistrazione del player.
     * Invia un messaggio al server per rimuovere la propria identità da registeredPlayers e connectedPlayers.
     * Chiamata dal player PRIMA di resettare il localStorage con "Entra come nuovo giocatore",
     * per evitare che il vecchio nome rimanga bloccato sul server anche dopo il reset locale.
     */
    function selfUnregister() {
        safeSend({ type: 'PLAYER_UNREGISTER' });
    }

    /**
     * 🏆 ADMIN → incrementa/decrementa punteggio
     */
    function adjustScore(playerId, delta) {
        safeSend({ type: 'ADMIN_ADJUST_SCORE', playerId, delta });
    }

    /**
     * 🏆 ADMIN → rimuove un giocatore dalla classifica
     */
    function removeScore(playerId) {
        safeSend({ type: 'ADMIN_REMOVE_SCORE', playerId });
    }

    /**
     * 🏆 ADMIN → resetta tutti i punteggi
     */
    function resetScores() {
        safeSend({ type: 'ADMIN_RESET_SCORES' });
    }

    // Ritorna solo le funzioni per interagire con il server
    return {
        sendWelcome,
        buzz,
        reset,
        setPlayerCanBuzz,
        forceResetPlayer,
        sendAdminLogin, // MODIFICA: Esportiamo la funzione di login admin per essere usata nel componente Admin
        selfUnregister, // MODIFICA: Esportiamo la funzione di auto-deregistrazione per il player
        adjustScore,
        removeScore,
        resetScores,
        safeSend
    };
}
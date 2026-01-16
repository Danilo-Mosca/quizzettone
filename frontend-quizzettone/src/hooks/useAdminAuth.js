/**
 * Hook per gestire autenticazione Admin
 * Persistente tramite localStorage
 */
import { useState } from 'react';

const STORAGE_KEY = 'quiz_admin_logged';

export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem(STORAGE_KEY) === 'true');

    // Funzione login() che restituisce un valore booleano: true se l'utente ha inserito la password di admin corretta, false se l'utente inserisce una password errata
    function login(password) {
        // 🔐 Password hardcoded TEMPORANEA
        // (più avanti la spostiamo su server)
        if (password === 'quiz123') {
            localStorage.setItem(STORAGE_KEY, 'true');
            setIsAdmin(true);
            return true;
        }
        return false;
    }

    // Funzione logout() che rimuove dal local storage la chiave e il valore di STORAGE_KEY:
    function logout() {
        localStorage.removeItem(STORAGE_KEY);
        setIsAdmin(false);
    }

    return { isAdmin, login, logout };
}
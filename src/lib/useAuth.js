import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";

/**
 * Hook che tiene traccia della sessione utente corrente e la
 * aggiorna in automatico quando cambia (login, logout, refresh
 * del token). Ogni pagina che ha bisogno di sapere "chi sono"
 * o "sono loggato" usa questo hook, invece di interrogare
 * Supabase da più punti diversi.
 */
export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = ancora in caricamento
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nuovaSession) => {
      setSession(nuovaSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function registrati(email, password) {
    setErrore(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setErrore(tradduciErrore(error));
    return !error;
  }

  async function accedi(email, password) {
    setErrore(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrore(tradduciErrore(error));
    return !error;
  }

  async function esci() {
    await supabase.auth.signOut();
  }

  return {
    session,
    utente: session?.user ?? null,
    caricamento: session === undefined,
    errore,
    registrati,
    accedi,
    esci,
  };
}

// Messaggi Supabase in inglese -> italiano, solo per i casi più comuni
// che un utente reale incontra davvero (credenziali sbagliate, email
// già registrata). Per tutto il resto mostriamo il messaggio originale
// piuttosto che inventare una traduzione che potrebbe fuorviare.
function tradduciErrore(error) {
  const msg = error.message || "";
  if (msg.includes("Invalid login credentials")) return "Email o password non corrette.";
  if (msg.includes("User already registered")) return "Esiste già un account con questa email.";
  if (msg.includes("Password should be at least")) return "Password troppo corta.";
  return msg;
}

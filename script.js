const API_URL = "https://nexa-ia-pjza.onrender.com";

let utilisateur = null;
let conversationActuelle = null;
let conversations = [];
let persona = "";
let rechercheActive = false;
let stats = null;
let recognition = null;
let voiceRecording = false;
let speaking = false;
let voiceConversation = [];

const MESSAGES_ACCUEIL = {
    "mentor": ["Que puis-je vous enseigner aujourd'hui ?", "Prêt à apprendre ?", "Comment puis-je vous guider ?"],
    "ami": ["Salut ! On fait quoi aujourd'hui ?", "Hey ! Ça gaze ?", "Yo ! Une question ?"],
    "prof": ["Bonjour, quel est votre sujet d'étude ?", "Qu'allons-nous apprendre ?", "Posez votre question."],
    "coach": ["Allez, on avance !", "Prêt à progresser ?", "Quel est votre objectif ?"],
    "default": ["Comment puis-je vous aider ?", "Que puis-je faire pour vous ?", "Posez votre question."]
};

window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('nexa_user');
    if (!user) { window.location.href = 'login.html'; return; }
    utilisateur = JSON.parse(user);

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.innerText = utilisateur.nom;
    const userBioEl = document.getElementById('user-bio');
    if (userBioEl) userBioEl.innerText = utilisateur.bio || 'Free';

    if (utilisateur.avatar) {
        const avatarImg = document.getElementById('user-avatar-img');
        if (avatarImg) avatarImg.src = utilisateur.avatar;
    }

    if (localStorage.getItem('nexa_dark') === 'false') {
        document.body.classList.add('light');
    }
    const darkToggle = document.getElementById('toggle-dark');
    if (darkToggle) {
        if (!document.body.classList.contains('light')) darkToggle.classList.add('active');
        else darkToggle.classList.remove('active');
    }

    const notifToggle = document.getElementById('toggle-notif');
    if (notifToggle && Notification.permission === 'granted') {
        notifToggle.classList.add('active');
    }

    const accent = localStorage.getItem('nexa_accent') || '#667eea';
    document.documentElement.style.setProperty('--accent', accent);
    const preview = document.getElementById('color-preview');
    if (preview) preview.style.background = accent;
    const custom = document.getElementById('custom-color');
    if (custom) custom.value = accent;

    persona = localStorage.getItem('nexa_persona') || '';

    const langue = localStorage.getItem('nexa_langue') || 'fr';
    const langueSelect = document.getElementById('langue-select');
    if (langueSelect) langueSelect.value = langue;
    traduireInterface(langue);

    chargerConversations();
    chargerStats();
    mettreAJourMessageAccueil();
    initVoiceRecognition();
    initPWA();
    lucide.createIcons();
});

// ============ VOIX ============
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech Recognition non supporté');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        const el = document.getElementById('voice-transcript');
        if (el) el.innerText = transcript;
    };

    recognition.onend = () => {
        voiceRecording = false;
        const mic = document.getElementById('voice-mic');
        const orb = document.getElementById('voice-orb');
        if (mic) mic.classList.remove('recording');
        if (orb) orb.classList.remove('listening');
        
        // Envoyer automatiquement le message
        const transcript = document.getElementById('voice-transcript');
        if (transcript && transcript.innerText.trim()) {
            envoyerMessageVocal(transcript.innerText.trim());
        }
    };

    recognition.onerror = () => {
        voiceRecording = false;
        const mic = document.getElementById('voice-mic');
        if (mic) mic.classList.remove('recording');
    };
}

function ouvrirModeVocal() {
    const overlay = document.getElementById('voice-overlay');
    if (overlay) overlay.classList.add('show');
    const status = document.getElementById('voice-status');
    if (status) status.innerText = 'Appuyez sur le micro pour parler';
    const transcript = document.getElementById('voice-transcript');
    if (transcript) transcript.innerText = '';
    const response = document.getElementById('voice-response');
    if (response) response.innerText = '';
    voiceConversation = [];
    lucide.createIcons();
}

function fermerModeVocal() {
    if (voiceRecording && recognition) {
        try { recognition.stop(); } catch(e) {}
        voiceRecording = false;
    }
    if (speaking) {
        window.speechSynthesis.cancel();
        speaking = false;
    }
    const overlay = document.getElementById('voice-overlay');
    if (overlay) overlay.classList.remove('show');
}

function toggleVoiceRecording() {
    if (!recognition) {
        alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
        return;
    }
    const mic = document.getElementById('voice-mic');
    const orb = document.getElementById('voice-orb');
    const status = document.getElementById('voice-status');

    if (voiceRecording) {
        recognition.stop();
    } else {
        if (speaking) {
            window.speechSynthesis.cancel();
            speaking = false;
        }
        voiceRecording = true;
        recognition.start();
        if (mic) mic.classList.add('recording');
        if (orb) orb.classList.add('listening');
        if (status) status.innerText = 'Je vous écoute...';
        const transcript = document.getElementById('voice-transcript');
        if (transcript) transcript.innerText = '';
        const response = document.getElementById('voice-response');
        if (response) response.innerText = '';
    }
}

async function envoyerMessageVocal(message) {
    const status = document.getElementById('voice-status');
    const orb = document.getElementById('voice-orb');
    const response = document.getElementById('voice-response');

    if (status) status.innerText = 'Nexa réfléchit...';
    if (orb) {
        orb.classList.remove('listening');
        orb.classList.add('thinking');
    }

    try {
        const response_api = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                historique: voiceConversation.slice(-10),
                persona: persona
            })
        });
        const data = await response_api.json();

        if (response) response.innerText = data.reply;
        voiceConversation.push({ type: 'user', texte: message });
        voiceConversation.push({ type: 'bot', texte: data.reply });

        if (orb) {
            orb.classList.remove('thinking');
            orb.classList.add('speaking');
        }
        if (status) status.innerText = 'Nexa répond...';

        lireTexteVocal(data.reply, () => {
            if (orb) orb.classList.remove('speaking');
            if (status) status.innerText = 'Appuyez sur le micro pour parler';
            const transcript = document.getElementById('voice-transcript');
            if (transcript) transcript.innerText = '';
        });

        if (!conversationActuelle) creerConversation(message);
        conversationActuelle.messages.push({ texte: message, type: 'user', date: new Date().toISOString() });
        conversationActuelle.messages.push({ texte: data.reply, type: 'bot', date: new Date().toISOString(), markdown: true });
        sauvegarderConversations();

    } catch (e) {
        if (status) status.innerText = 'Erreur de connexion';
        if (orb) orb.classList.remove('thinking');
    }
}

function lireTexteVocal(texte, onEnd) {
    if (!('speechSynthesis' in window)) {
        if (onEnd) onEnd();
        return;
    }
    window.speechSynthesis.cancel();
    const textePropre = texte.replace(/[#*`>|]/g, '').replace(/\n/g, '. ');
    const utterance = new SpeechSynthesisUtterance(textePropre);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.onend = () => { speaking = false; if (onEnd) onEnd(); };
    utterance.onerror = () => { speaking = false; if (onEnd) onEnd(); };
    speaking = true;
    window.speechSynthesis.speak(utterance);
}

function lireTexte(texte, btnElement) {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
        window.speechSynthesis.cancel();
        speaking = false;
        document.querySelectorAll('.btn-speak').forEach(b => b.classList.remove('speaking'));
        return;
    }
    const textePropre = texte.replace(/[#*`>|]/g, '').replace(/\n/g, '. ');
    const utterance = new SpeechSynthesisUtterance(textePropre);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.onend = () => { speaking = false; if (btnElement) btnElement.classList.remove('speaking'); };
    speaking = true;
    if (btnElement) btnElement.classList.add('speaking');
    window.speechSynthesis.speak(utterance);
}

// ============ PWA ============
function initPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(err => console.log('SW:', err));
        });
    }

    const installBanner = document.getElementById('install-banner');
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        window.deferredPrompt = e;
        if (localStorage.getItem('nexa_install_dismissed') !== 'true') {
            if (installBanner) installBanner.classList.add('show');
        }
    });

    window.addEventListener('appinstalled', () => {
        if (installBanner) installBanner.classList.remove('show');
        localStorage.setItem('nexa_install_dismissed', 'true');
    });

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone && localStorage.getItem('nexa_install_dismissed') !== 'true') {
        setTimeout(() => {
            if (installBanner) installBanner.classList.add('show');
        }, 3000);
    }
}

function installerPWA() {
    const prompt = window.deferredPrompt;
    const installBanner = document.getElementById('install-banner');
    if (!prompt) {
        alert('Pour installer : Menu du navigateur → "Ajouter à l\'écran d\'accueil"');
        return;
    }
    prompt.prompt();
    prompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
            if (installBanner) installBanner.classList.remove('show');
        }
        window.deferredPrompt = null;
    });
}

function fermerBanniere() {
    const installBanner = document.getElementById('install-banner');
    if (installBanner) installBanner.classList.remove('show');
    localStorage.setItem('nexa_install_dismissed', 'true');
}

// ============ STATS ============
function chargerStats() {
    const cle = `nexa_stats_${utilisateur.email}`;
    stats = JSON.parse(localStorage.getItem(cle) || '{"quiz": [], "messages": 0}');
}

function sauvegarderStats() {
    const cle = `nexa_stats_${utilisateur.email}`;
    localStorage.setItem(cle, JSON.stringify(stats));
}

function enregistrerScoreQuiz(sujet, score, total) {
    if (!stats) stats = { quiz: [], messages: 0 };
    stats.quiz.push({ sujet, score, total, date: new Date().toISOString() });
    sauvegarderStats();
}

function ouvrirStats() {
    const container = document.getElementById('stats-content');
    if (!container) return;
    const totalConv = conversations.length;
    const totalMsg = conversations.reduce((sum, c) => sum + c.messages.length, 0);
    const totalQuiz = stats.quiz.length;
    const moyenne = totalQuiz > 0
        ? (stats.quiz.reduce((sum, q) => sum + (q.score / q.total * 20), 0) / totalQuiz).toFixed(1)
        : "0.0";

    let html = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${totalConv}</div><div class="stat-label">Conversations</div></div>
            <div class="stat-card"><div class="stat-value">${totalMsg}</div><div class="stat-label">Messages</div></div>
            <div class="stat-card"><div class="stat-value">${totalQuiz}</div><div class="stat-label">Quiz passés</div></div>
            <div class="stat-card"><div class="stat-value">${moyenne}</div><div class="stat-label">Moyenne /20</div></div>
        </div>
    `;

    if (totalQuiz > 0) {
        html += `<div class="stats-chart"><div class="stats-section-title">Évolution des scores</div><canvas id="chart-scores" height="150"></canvas></div>`;
        html += `<div style="margin-top:20px"><div class="stats-section-title">Derniers quiz</div>`;
        stats.quiz.slice(-5).reverse().forEach(q => {
            const note = (q.score / q.total * 20).toFixed(1);
            html += `<div class="recommandation"><span>${q.sujet}</span><span class="rec-score">${note}/20</span></div>`;
        });
        html += `</div>`;
    } else {
        html += `<p style="text-align:center; color:var(--text-dim); margin-top:20px; font-size:14px">Passez votre premier quiz pour voir vos statistiques.</p>`;
    }

    container.innerHTML = html;
    ouvrirModal('modal-stats');

    if (totalQuiz > 0) {
        setTimeout(() => {
            const ctx = document.getElementById('chart-scores');
            if (ctx && typeof Chart !== 'undefined') {
                const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#667eea';
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: stats.quiz.map((_, i) => `${i + 1}`),
                        datasets: [{
                            label: 'Score /20',
                            data: stats.quiz.map(q => parseFloat((q.score / q.total * 20).toFixed(1))),
                            borderColor: accentColor,
                            backgroundColor: accentColor + '20',
                            tension: 0.4, fill: true,
                            pointBackgroundColor: accentColor,
                            pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, max: 20, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                            x: { ticks: { color: '#888' }, grid: { display: false } }
                        }
                    }
                });
            }
        }, 100);
    }
}

// ============ MARKDOWN ============
function rendreMarkdown(texte) {
    if (typeof marked !== 'undefined') {
        try { return marked.parse(texte); }
        catch (e) { return texte.replace(/\n/g, '<br>'); }
    }
    return texte.replace(/\n/g, '<br>');
}

// ============ NOTIFICATIONS ============
function toggleNotifications() {
    if (!('Notification' in window)) { alert('Notifications non supportées'); return; }
    if (Notification.permission === 'granted') {
        localStorage.setItem('nexa_notif', 'false');
        const t = document.getElementById('toggle-notif');
        if (t) t.classList.remove('active');
    } else {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                localStorage.setItem('nexa_notif', 'true');
                const t = document.getElementById('toggle-notif');
                if (t) t.classList.add('active');
                envoyerNotification('Nexa AI', 'Notifications activées !');
            }
        });
    }
}

function envoyerNotification(titre, corps) {
    if (localStorage.getItem('nexa_notif') === 'false') return;
    if (Notification.permission === 'granted' && document.hidden) {
        new Notification(titre, { body: corps, icon: 'logo.png' });
    }
}

// ============ SIDEBAR ============
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar) return;
    sidebar.classList.toggle('hidden');
    const isMobile = window.innerWidth <= 768;
    if (overlay) {
        if (isMobile && !sidebar.classList.contains('hidden')) overlay.classList.add('show');
        else overlay.classList.remove('show');
    }
}

function toggleMenuProfil(event) {
    event.stopPropagation();
    document.getElementById('menu-profil').classList.toggle('show');
}

document.addEventListener('click', () => {
    const menu = document.getElementById('menu-profil');
    if (menu) menu.classList.remove('show');
});

// ============ ACCUEIL ============
function mettreAJourMessageAccueil() {
    const el = document.getElementById('welcome-message');
    if (!el) return;
    let categorie = "default";
    const p = (persona || "").toLowerCase();
    if (p.includes("mentor")) categorie = "mentor";
    else if (p.includes("ami")) categorie = "ami";
    else if (p.includes("prof") || p.includes("strict")) categorie = "prof";
    else if (p.includes("coach")) categorie = "coach";
    const liste = MESSAGES_ACCUEIL[categorie];
    el.innerText = liste[Math.floor(Math.random() * liste.length)];
}

// ============ HISTORIQUE ============
function chargerConversations() {
    const cle = `nexa_conversations_${utilisateur.email}`;
    conversations = JSON.parse(localStorage.getItem(cle) || '[]');
    afficherHistorique();
    if (conversations.length > 0) ouvrirConversation(conversations[0].id);
}

function sauvegarderConversations() {
    const cle = `nexa_conversations_${utilisateur.email}`;
    localStorage.setItem(cle, JSON.stringify(conversations));
}

function afficherHistorique() {
    const container = document.getElementById('historique');
    if (!container) return;
    container.innerHTML = '';
    const triees = [...conversations].sort((a, b) => {
        if (a.epingle && !b.epingle) return -1;
        if (!a.epingle && b.epingle) return 1;
        return b.id - a.id;
    });

    triees.forEach(conv => {
        const div = document.createElement('div');
        div.className = 'history-item';
        if (conv.epingle) div.classList.add('epingle');
        if (conversationActuelle && conv.id === conversationActuelle.id) div.classList.add('active');
        const texte = document.createElement('span');
        texte.className = 'history-text';
        texte.innerText = conv.titre || 'Nouvelle conversation';
        div.appendChild(texte);
        const actions = document.createElement('div');
        actions.className = 'history-actions';
        const btnEpingler = document.createElement('button');
        btnEpingler.innerHTML = conv.epingle ? '<i data-lucide="pin-off"></i>' : '<i data-lucide="pin"></i>';
        btnEpingler.onclick = (e) => { e.stopPropagation(); toggleEpingler(conv.id); };
        actions.appendChild(btnEpingler);
        const btnSuppr = document.createElement('button');
        btnSuppr.innerHTML = '<i data-lucide="trash-2"></i>';
        btnSuppr.onclick = (e) => { e.stopPropagation(); supprimerConversation(conv.id); };
        actions.appendChild(btnSuppr);
        div.appendChild(actions);
        div.onclick = () => ouvrirConversation(conv.id);
        container.appendChild(div);
    });
    lucide.createIcons();
}

function toggleEpingler(id) {
    const conv = conversations.find(c => c.id === id);
    if (conv) { conv.epingle = !conv.epingle; sauvegarderConversations(); afficherHistorique(); }
}

function supprimerConversation(id) {
    if (!confirm("Supprimer cette conversation ?")) return;
    conversations = conversations.filter(c => c.id !== id);
    sauvegarderConversations();
    if (conversationActuelle && conversationActuelle.id === id) nouveauChat();
    else afficherHistorique();
}

function nouveauChat() {
    conversationActuelle = null;
    document.getElementById('chat').innerHTML = `
        <div class="welcome">
            <div class="welcome-logo"><img src="logo.png" alt="Nexa AI"></div>
            <h1 id="welcome-message"></h1>
            <div class="welcome-suggestions">
                <button onclick="suggestionRapide('Fais-moi un quiz sur les fractions')"><i data-lucide="list-checks"></i> Quiz</button>
                <button onclick="suggestionRapide('Crée une fiche sur la Révolution française')"><i data-lucide="book-open"></i> Fiche</button>
                <button onclick="suggestionRapide('Génère mon CV')"><i data-lucide="file-text"></i> CV</button>
                <button onclick="suggestionRapide('Crée un document Word sur les fractions')"><i data-lucide="file-type"></i> Word</button>
            </div>
        </div>
    `;
    mettreAJourMessageAccueil();
    afficherHistorique();
    lucide.createIcons();
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('hidden');
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.remove('show');
    }
}

function suggestionRapide(texte) {
    document.getElementById('message').value = texte;
    document.getElementById('message').focus();
}

function ouvrirConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conversationActuelle = conv;
    const chat = document.getElementById('chat');
    chat.innerHTML = '';
    conv.messages.forEach(msg => {
        if (msg.markdown) afficherMessage(msg.texte, msg.type, false, true);
        else afficherMessage(msg.texte, msg.type, false);
    });
    afficherHistorique();
    chat.scrollTop = chat.scrollHeight;
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('hidden');
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.remove('show');
    }
}

function creerConversation(premierMessage) {
    const nouvelle = {
        id: Date.now(),
        titre: premierMessage.substring(0, 30) + (premierMessage.length > 30 ? '...' : ''),
        date: new Date().toISOString(),
        messages: [],
        epingle: false
    };
    conversations.unshift(nouvelle);
    conversationActuelle = nouvelle;
    sauvegarderConversations();
    afficherHistorique();
    return nouvelle;
}

// ============ DÉTECTION ============
function detecterTypeDemande(message) {
    const msg = message.toLowerCase();
    if (msg.includes("document word") || msg.includes("fichier word") || msg.includes("génère un word") || msg.includes("crée un word") || msg.includes("word sur") || msg.includes(".docx")) {
        let sujet = message.replace(/.*(?:word|document word|fichier word)[\s:]*/i, '').replace(/sur/i, '').trim();
        return { type: "word", sujet: sujet || "document" };
    }
    if (msg.includes("tableau excel") || msg.includes("fichier excel") || msg.includes("génère un excel") || msg.includes("excel sur") || msg.includes(".xlsx")) {
        let sujet = message.replace(/.*(?:excel|tableau excel|fichier excel)[\s:]*/i, '').replace(/sur/i, '').trim();
        return { type: "excel", sujet: sujet || "données" };
    }
    if (msg.includes("présentation") || msg.includes("powerpoint") || msg.includes("slides") || msg.includes(".pptx")) {
        let sujet = message.replace(/.*(?:présentation|powerpoint|slides)[\s:]*/i, '').replace(/sur/i, '').trim();
        return { type: "pptx", sujet: sujet || "présentation" };
    }
    if (msg.includes("pdf") || msg.includes(".pdf")) {
        let sujet = message.replace(/.*(?:pdf)[\s:]*/i, '').replace(/sur/i, '').trim();
        return { type: "pdf", sujet: sujet || "document" };
    }
    if (msg.includes("génère une image") || msg.includes("crée une image") || msg.includes("dessine") || msg.includes("image de")) {
        let sujet = message.replace(/.*(?:image|dessine)[\s:]*/i, '').replace(/de/i, '').trim();
        return { type: "image", sujet: sujet || "image" };
    }
    if (msg.includes("quiz") || msg.includes("qcm")) {
        let sujet = message.replace(/.*(?:quiz|qcm)[\s:]*/i, '').replace(/sur/i, '').trim();
        const nbMatch = msg.match(/(\d+)\s*(questions?|qcm)/);
        const nb = nbMatch ? parseInt(nbMatch[1]) : 5;
        return { type: "quiz", sujet: sujet || "culture générale", nb };
    }
    if (msg.includes("fiche") || msg.includes("révision") || msg.includes("résumé")) {
        let sujet = message.replace(/.*(?:fiche|révision|résumé)[\s:]*/i, '').replace(/sur/i, '').trim();
        return { type: "fiche", sujet: sujet || "sujet" };
    }
    if (msg.includes("cv") || msg.includes("curriculum")) return { type: "cv" };
    if (msg.includes("corrige") || msg.includes("correction")) {
        let texte = message.replace(/.*(?:corrige|correction)[\s:]*/i, '').trim();
        return { type: "correction", texte: texte || message };
    }
    return { type: "chat" };
}

// ============ ENVOI MESSAGE ============
async function envoyerMessage() {
    const input = document.getElementById('message');
    const message = input.value.trim();
    if (!message) return;
    const chat = document.getElementById('chat');
    if (chat.querySelector('.welcome')) chat.innerHTML = '';
    if (!conversationActuelle) creerConversation(message);
    conversationActuelle.messages.push({ texte: message, type: 'user', date: new Date().toISOString() });
    afficherMessage(message, 'user', true);
    sauvegarderConversations();
    input.value = '';
    input.disabled = true;
    const loadingId = afficherLoading();

    try {
        const demande = detecterTypeDemande(message);
        if (["word", "excel", "pptx", "pdf"].includes(demande.type)) {
            supprimerLoading(loadingId);
            await telechargerDocument(demande.type, demande.sujet);
            input.disabled = false; input.focus(); return;
        }
        if (demande.type === "image") {
            supprimerLoading(loadingId);
            await genererImage(demande.sujet);
            input.disabled = false; input.focus(); return;
        }

        let endpoint = "/chat";
        let body = { message, historique: conversationActuelle.messages.slice(-20), persona, recherche: rechercheActive };
        if (rechercheActive) {
            rechercheActive = false;
            const btn = document.getElementById('btn-recherche');
            if (btn) btn.classList.remove('active');
        }
        if (demande.type === "quiz") { endpoint = "/quiz"; body = { sujet: demande.sujet, nb: demande.nb || 5 }; }
        else if (demande.type === "fiche") { endpoint = "/fiche"; body = { sujet: demande.sujet }; }
        else if (demande.type === "cv") { endpoint = "/cv"; body = { infos: message }; }
        else if (demande.type === "correction") { endpoint = "/corriger"; body = { texte: demande.texte }; }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        supprimerLoading(loadingId);

        if (demande.type === "quiz") {
            afficherQuiz(data.quiz || data.reply, demande.sujet);
            conversationActuelle.messages.push({ texte: "Quiz généré", type: 'bot', date: new Date().toISOString() });
        } else {
            afficherMessage(data.reply, 'bot', true, true);
            conversationActuelle.messages.push({ texte: data.reply, type: 'bot', date: new Date().toISOString(), markdown: true });
        }
        sauvegarderConversations();
        envoyerNotification('Nexa AI', 'Réponse prête !');
    } catch (error) {
        supprimerLoading(loadingId);
        afficherMessage("Erreur de connexion.", 'bot', true);
    }
    input.disabled = false;
    input.focus();
}

// ============ LOADING ============
function afficherLoading() {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    const id = 'loading-' + Date.now();
    div.id = id;
    div.className = 'message bot';
    div.innerHTML = `
        <div class="avatar"><img src="logo.png" alt="Nexa"></div>
        <div class="content">
            <div class="loading-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return id;
}

function supprimerLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ============ AFFICHAGE MESSAGE ============
function afficherMessage(texte, type, scroll = true, markdown = false) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    const id = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    div.id = id;
    div.className = `message ${type}`;

    let avatar;
    if (type === 'user') {
        avatar = utilisateur.avatar ? `<img src="${utilisateur.avatar}" alt="">` : utilisateur.nom[0].toUpperCase();
    } else {
        avatar = `<img src="logo.png" alt="Nexa">`;
    }

    const contenu = (markdown && type === 'bot' && texte) ? rendreMarkdown(texte) : texte;
    let actionsHtml = '';
    if (type === 'bot' && texte && texte !== '...') {
        const texteEchappe = texte.replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/\\/g, '\\\\');
        actionsHtml = `
            <div class="msg-actions">
                <button class="btn-copy" onclick="copierTexte(\`${texteEchappe}\`, this)">
                    <i data-lucide="copy"></i> Copier
                </button>
                <button class="btn-speak" onclick="lireTexte(\`${texteEchappe}\`, this)">
                    <i data-lucide="volume-2"></i> Écouter
                </button>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="content">${contenu}${actionsHtml}</div>
    `;
    chat.appendChild(div);
    if (scroll) chat.scrollTop = chat.scrollHeight;
    lucide.createIcons();
    return id;
}

// ============ COPIER ============
function copierTexte(texte, btn) {
    navigator.clipboard.writeText(texte).then(() => {
        if (btn) {
            btn.classList.add('copied');
            btn.innerHTML = '<i data-lucide="check"></i> Copié !';
            lucide.createIcons();
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i data-lucide="copy"></i> Copier';
                lucide.createIcons();
            }, 2000);
        }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = texte;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

// ============ QUIZ ============
function afficherQuiz(contenu, sujet = "Quiz") {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    const id = 'quiz-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    div.id = id;
    div.className = 'message bot';
    const questions = parserQuiz(contenu);
    window[`quiz_data_${id}`] = { questions, sujet };

    let html = `
        <div class="avatar"><img src="logo.png" alt="Nexa"></div>
        <div class="content">
            <div class="quiz-container">
                <div class="quiz-title">Quiz interactif</div>
    `;
    questions.forEach((q, i) => {
        html += `<div class="quiz-question" data-question="${i}"><div class="quiz-question-title">${i + 1}. ${q.question}</div>`;
        if (q.options && q.options.length > 0) {
            q.options.forEach((opt, j) => {
                html += `
                    <div class="quiz-option" onclick="selectionnerOption(${i}, ${j}, '${id}')">
                        <input type="radio" name="q${i}-${id}" value="${j}">
                        <label>${opt}</label>
                    </div>
                `;
            });
        } else {
            html += `<textarea class="quiz-input" id="input-${id}-${i}" placeholder="Votre réponse..."></textarea>`;
        }
        html += `</div>`;
    });
    html += `
                <div class="quiz-actions">
                    <button class="btn-quiz-validate" onclick="validerQuiz('${id}')">Valider mes réponses</button>
                </div>
                <div id="feedback-${id}"></div>
            </div>
        </div>
    `;
    div.innerHTML = html;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    lucide.createIcons();
    return id;
}

function parserQuiz(texte) {
    const questions = [];
    const lignes = texte.split('\n').filter(l => l.trim());
    let questionActuelle = null;
    lignes.forEach(ligne => {
        ligne = ligne.trim();
        const matchQuestion = ligne.match(/^(?:\*\*)?(?:Question\s*)?(\d+)\s*[:.)]\s*(.+?)(?:\*\*)?$/i);
        const matchQuestionSimple = ligne.match(/^(\d+)\.\s*(.+)$/);
        if (matchQuestion && !ligne.match(/^[A-D]\)/)) {
            if (questionActuelle) questions.push(questionActuelle);
            questionActuelle = { question: matchQuestion[2].replace(/\*\*/g, ''), options: [], reponse: null };
            return;
        }
        if (matchQuestionSimple && !ligne.match(/^[A-D]\)/)) {
            if (questionActuelle) questions.push(questionActuelle);
            questionActuelle = { question: matchQuestionSimple[2].replace(/\*\*/g, ''), options: [], reponse: null };
            return;
        }
        const matchOption = ligne.match(/^([A-D])\)\s*(.+)$/);
        if (matchOption && questionActuelle) { questionActuelle.options.push(`${matchOption[1]}) ${matchOption[2]}`); return; }
        const matchReponse = ligne.match(/(?:Réponse correcte|Answer|Réponse)\s*:\s*([A-D])/i);
        if (matchReponse && questionActuelle) { questionActuelle.reponse = matchReponse[1].charCodeAt(0) - 65; }
    });
    if (questionActuelle) questions.push(questionActuelle);
    return questions;
}

function selectionnerOption(qIndex, oIndex, quizId) {
    const quizDiv = document.getElementById(quizId);
    const questionDiv = quizDiv.querySelector(`[data-question="${qIndex}"]`);
    const options = questionDiv.querySelectorAll('.quiz-option');
    options.forEach(o => o.classList.remove('selected'));
    options[oIndex].classList.add('selected');
    options[oIndex].querySelector('input').checked = true;
}

function validerQuiz(quizId) {
    const quizDiv = document.getElementById(quizId);
    const data = window[`quiz_data_${quizId}`];
    if (!data) return;
    const { questions, sujet } = data;
    let bonnes = 0;
    let total = questions.length;
    questions.forEach((q, i) => {
        const questionDiv = quizDiv.querySelector(`[data-question="${i}"]`);
        if (q.options && q.options.length > 0) {
            const selected = questionDiv.querySelector('.quiz-option.selected');
            const options = questionDiv.querySelectorAll('.quiz-option');
            options.forEach((opt, j) => { if (j === q.reponse) opt.classList.add('correct'); });
            if (selected) {
                const selectedIndex = Array.from(options).indexOf(selected);
                if (selectedIndex === q.reponse) bonnes++;
                else selected.classList.add('incorrect');
            }
        }
    });
    const feedback = document.getElementById(`feedback-${quizId}`);
    if (feedback) {
        const note = total > 0 ? Math.round((bonnes / total) * 20) : 0;
        feedback.innerHTML = `<div class="quiz-feedback success">Score : ${bonnes}/${total} — Note : ${note}/20</div>`;
    }
    enregistrerScoreQuiz(sujet, bonnes, total);
    quizDiv.querySelectorAll('.quiz-option').forEach(o => o.style.pointerEvents = 'none');
    const btn = quizDiv.querySelector('.btn-quiz-validate');
    if (btn) btn.disabled = true;
}

function rechercherConversations() {
    const recherche = document.getElementById('search').value.toLowerCase();
    const container = document.getElementById('historique');
    container.innerHTML = '';
    conversations.filter(conv => conv.titre.toLowerCase().includes(recherche)).forEach(conv => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const span = document.createElement('span');
        span.className = 'history-text';
        span.innerText = conv.titre;
        div.appendChild(span);
        div.onclick = () => ouvrirConversation(conv.id);
        container.appendChild(div);
    });
}

// ============ MODALES ============
function ouvrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
    lucide.createIcons();
}
function fermerModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}
function ouvrirParametres() { ouvrirModal('modal-parametres'); }
function ouvrirAide() { ouvrirModal('modal-aide'); }

function personnaliserIA() {
    const input = document.getElementById('persona-input');
    if (input) input.value = persona;
    ouvrirModal('modal-ia');
}

function suggestionPersona(texte) {
    const input = document.getElementById('persona-input');
    if (input) input.value = texte;
}

function sauvegarderPersona() {
    const input = document.getElementById('persona-input');
    if (input) persona = input.value.trim();
    localStorage.setItem('nexa_persona', persona);
    fermerModal('modal-ia');
    mettreAJourMessageAccueil();
}

function modifierProfil() {
    const avatarEl = document.getElementById('edit-avatar');
    if (avatarEl) avatarEl.src = utilisateur.avatar || 'logo.png';
    const nameEl = document.getElementById('edit-name');
    if (nameEl) nameEl.value = utilisateur.nom || '';
    const bioEl = document.getElementById('edit-bio');
    if (bioEl) bioEl.value = utilisateur.bio || '';
    ouvrirModal('modal-profil');
}

function changerAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const avatarEl = document.getElementById('edit-avatar');
        if (avatarEl) avatarEl.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function sauvegarderProfil() {
    const nameEl = document.getElementById('edit-name');
    const bioEl = document.getElementById('edit-bio');
    const avatarEl = document.getElementById('edit-avatar');
    const nom = nameEl ? nameEl.value.trim() : '';
    const bio = bioEl ? bioEl.value.trim() : '';
    const avatar = avatarEl ? avatarEl.src : '';

    if (nom) {
        utilisateur.nom = nom;
        utilisateur.bio = bio;
        utilisateur.avatar = avatar;
        localStorage.setItem('nexa_user', JSON.stringify(utilisateur));

        const users = JSON.parse(localStorage.getItem('nexa_users') || '{}');
        if (users[utilisateur.email]) {
            users[utilisateur.email].nom = nom;
            users[utilisateur.email].bio = bio;
            users[utilisateur.email].avatar = avatar;
            localStorage.setItem('nexa_users', JSON.stringify(users));
        }

        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.innerText = nom;
        const userBioEl = document.getElementById('user-bio');
        if (userBioEl) userBioEl.innerText = bio || 'Free';
        const avatarImg = document.getElementById('user-avatar-img');
        if (avatarImg) avatarImg.src = avatar;
    }
    fermerModal('modal-profil');
}

// ============ PRÉFÉRENCES ============
function toggleDarkMode() {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('nexa_dark', !isLight);
    const toggle = document.getElementById('toggle-dark');
    if (toggle) {
        if (isLight) toggle.classList.remove('active');
        else toggle.classList.add('active');
    }
}

function setAccent(couleur, event) {
    document.documentElement.style.setProperty('--accent', couleur);
    localStorage.setItem('nexa_accent', couleur);
    const preview = document.getElementById('color-preview');
    if (preview) preview.style.background = couleur;
    const custom = document.getElementById('custom-color');
    if (custom) custom.value = couleur;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    if (event && event.target) event.target.classList.add('selected');
}

function appliquerCouleurPerso(input) { setAccent(input.value); }

function togglePalette() {
    const p = document.getElementById('color-palette');
    if (p) p.classList.toggle('show');
}

function changerLangue() {
    const langue = document.getElementById('langue-select').value;
    localStorage.setItem('nexa_langue', langue);
    traduireInterface(langue);
}

function traduireInterface(langue) {
    const t = {
        fr: { nouveauChat: "Nouveau chat", rechercher: "Rechercher...", recents: "Récents", poser: "Poser une question...", parametres: "Paramètres", stats: "Statistiques", profil: "Modifier le profil", personnaliser: "Personnaliser Nexa AI", aide: "Aide", deconnexion: "Déconnexion" },
        en: { nouveauChat: "New chat", rechercher: "Search...", recents: "Recent", poser: "Ask a question...", parametres: "Settings", stats: "Statistics", profil: "Edit profile", personnaliser: "Customize Nexa AI", aide: "Help", deconnexion: "Logout" },
        mg: { nouveauChat: "Resaka vaovao", rechercher: "Hikaroka...", recents: "Vao haingana", poser: "Mametraha fanontaniana...", parametres: "Kirakira", stats: "Statistika", profil: "Hanova mombamomba", personnaliser: "Hanamboatra an'i Nexa AI", aide: "Fanampiana", deconnexion: "Hiala" },
        es: { nouveauChat: "Nuevo chat", rechercher: "Buscar...", recents: "Recientes", poser: "Haz una pregunta...", parametres: "Ajustes", stats: "Estadísticas", profil: "Editar perfil", personnaliser: "Personalizar Nexa AI", aide: "Ayuda", deconnexion: "Cerrar sesión" },
        zh: { nouveauChat: "新聊天", rechercher: "搜索...", recents: "最近", poser: "提问...", parametres: "设置", stats: "统计", profil: "编辑个人资料", personnaliser: "自定义 Nexa AI", aide: "帮助", deconnexion: "退出" }
    }[langue] || { nouveauChat: "Nouveau chat", rechercher: "Rechercher...", recents: "Récents", poser: "Poser une question...", parametres: "Paramètres", stats: "Statistiques", profil: "Modifier le profil", personnaliser: "Personnaliser Nexa AI", aide: "Aide", deconnexion: "Déconnexion" };

    const btnNewChat = document.querySelector('.btn-new-chat span:last-child');
    if (btnNewChat) btnNewChat.innerText = t.nouveauChat;
    const search = document.getElementById('search');
    if (search) search.placeholder = t.rechercher;
    const ht = document.querySelector('.history-title');
    if (ht) ht.innerText = t.recents;
    const msg = document.getElementById('message');
    if (msg) msg.placeholder = t.poser;

    const btns = document.querySelectorAll('.menu-profil button');
    if (btns[0]) btns[0].innerHTML = `<i data-lucide="bar-chart-3"></i> ${t.stats}`;
    if (btns[1]) btns[1].innerHTML = `<i data-lucide="settings"></i> ${t.parametres}`;
    if (btns[2]) btns[2].innerHTML = `<i data-lucide="user"></i> ${t.profil}`;
    if (btns[3]) btns[3].innerHTML = `<i data-lucide="sparkles"></i> ${t.personnaliser}`;
    if (btns[4]) btns[4].innerHTML = `<i data-lucide="help-circle"></i> ${t.aide}`;
    if (btns[6]) btns[6].innerHTML = `<i data-lucide="log-out"></i> ${t.deconnexion}`;
    lucide.createIcons();
}

// ============ RECHERCHE ============
function toggleRecherche() {
    rechercheActive = !rechercheActive;
    const btn = document.getElementById('btn-recherche');
    if (btn) btn.classList.toggle('active');
}

// ============ ANALYSE FICHIER ============
async function analyserFichier(event) {
    const file = event.target.files[0];
    if (!file) return;
    const chat = document.getElementById('chat');
    if (chat.querySelector('.welcome')) chat.innerHTML = '';
    if (!conversationActuelle) creerConversation("Analyse de " + file.name);

    const fileDiv = document.createElement('div');
    fileDiv.className = 'message user';
    fileDiv.innerHTML = `
        <div class="avatar">${utilisateur.avatar ? `<img src="${utilisateur.avatar}" alt="">` : utilisateur.nom[0].toUpperCase()}</div>
        <div class="content"><div class="file-preview"><i data-lucide="file"></i> ${file.name}</div></div>
    `;
    chat.appendChild(fileDiv);
    lucide.createIcons();
    chat.scrollTop = chat.scrollHeight;
    const loadingId = afficherLoading();
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/analyser`, { method: 'POST', body: formData });
        const data = await response.json();
        supprimerLoading(loadingId);
        afficherMessage(data.reply, 'bot', true, true);
        conversationActuelle.messages.push({ texte: file.name, type: 'user', date: new Date().toISOString() });
        conversationActuelle.messages.push({ texte: data.reply, type: 'bot', date: new Date().toISOString(), markdown: true });
        sauvegarderConversations();
    } catch (e) {
        supprimerLoading(loadingId);
        afficherMessage("Erreur d'analyse.", 'bot', true);
    }
    event.target.value = '';
}

// ============ GÉNÉRATION DOCUMENT ============
async function telechargerDocument(type, sujet) {
    const chat = document.getElementById('chat');
    const loadingId = afficherLoading();
    const labels = {
        word: { name: "Document Word", type: "DOCX", icon: "W" },
        excel: { name: "Tableau Excel", type: "XLSX", icon: "X" },
        pptx: { name: "Présentation", type: "PPTX", icon: "P" },
        pdf: { name: "Document PDF", type: "PDF", icon: "PDF" }
    };
    const info = labels[type] || { name: "Fichier", type: type.toUpperCase(), icon: "?" };

    try {
        const response = await fetch(`${API_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sujet: sujet })
        });
        if (!response.ok) throw new Error("Erreur API");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const ext = type === 'word' ? 'docx' : type === 'excel' ? 'xlsx' : type === 'pptx' ? 'pptx' : 'pdf';
        const filename = `nexa_${type}_${Date.now()}.${ext}`;
        supprimerLoading(loadingId);

        const div = document.createElement('div');
        div.className = 'message bot';
        div.innerHTML = `
            <div class="avatar"><img src="logo.png" alt="Nexa"></div>
            <div class="content">
                <div class="file-card">
                    <div class="file-icon ${type}">${info.icon}</div>
                    <div class="file-info">
                        <div class="file-name">${sujet || 'Document'}</div>
                        <div class="file-type">${info.name} · ${info.type}</div>
                    </div>
                    <a href="${url}" download="${filename}" class="file-download">
                        <i data-lucide="download"></i> Télécharger
                    </a>
                </div>
            </div>
        `;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
        lucide.createIcons();
    } catch (e) {
        supprimerLoading(loadingId);
        afficherMessage("Erreur de génération.", 'bot', true);
    }
}

// ============ GÉNÉRATION IMAGE ============
async function genererImage(prompt) {
    const chat = document.getElementById('chat');
    const loadingId = afficherLoading();
    try {
        const response = await fetch(`${API_URL}/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        const data = await response.json();
        supprimerLoading(loadingId);
        const div = document.createElement('div');
        div.className = 'message bot';
        div.innerHTML = `
            <div class="avatar"><img src="logo.png" alt="Nexa"></div>
            <div class="content">
                <div class="generated-image-container">
                    <img src="${data.url}" class="generated-image" alt="${prompt}">
                    <div class="image-actions">
                        <a href="${data.url}" download="nexa_image_${Date.now()}.jpg" class="file-download">
                            <i data-lucide="download"></i> Télécharger
                        </a>
                    </div>
                </div>
            </div>
        `;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
        lucide.createIcons();
    } catch (e) {
        supprimerLoading(loadingId);
        afficherMessage("Erreur de génération d'image.", 'bot', true);
    }
}

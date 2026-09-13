const API_URL = "https://nexa-ia-pjza.onrender.com";

let utilisateur = null;
let conversationActuelle = null;
let conversations = [];
let persona = "";
let rechercheActive = false;

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

    document.getElementById('user-name').innerText = utilisateur.nom;
    document.getElementById('user-bio').innerText = utilisateur.bio || 'Free';

    if (utilisateur.avatar) {
        document.getElementById('user-avatar-img').src = utilisateur.avatar;
    }

    if (localStorage.getItem('nexa_dark') === 'false') {
        document.body.classList.add('light');
        document.getElementById('toggle-dark').checked = true;
    }
    const accent = localStorage.getItem('nexa_accent');
    if (accent) document.documentElement.style.setProperty('--accent', accent);

    persona = localStorage.getItem('nexa_persona') || '';

    const langue = localStorage.getItem('nexa_langue') || 'fr';
    document.getElementById('langue-select').value = langue;
    traduireInterface(langue);

    chargerConversations();
    mettreAJourMessageAccueil();
    lucide.createIcons();
});

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

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('hidden'); }

function toggleMenuProfil(event) {
    event.stopPropagation();
    document.getElementById('menu-profil').classList.toggle('show');
}

document.addEventListener('click', () => {
    const menu = document.getElementById('menu-profil');
    if (menu) menu.classList.remove('show');
});

// === HISTORIQUE ===
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
        btnEpingler.title = conv.epingle ? "Désépingler" : "Épingler";
        btnEpingler.innerHTML = conv.epingle ? '<i data-lucide="pin-off"></i>' : '<i data-lucide="pin"></i>';
        btnEpingler.onclick = (e) => { e.stopPropagation(); toggleEpingler(conv.id); };
        actions.appendChild(btnEpingler);

        const btnSuppr = document.createElement('button');
        btnSuppr.title = "Supprimer";
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
    if (conv) {
        conv.epingle = !conv.epingle;
        sauvegarderConversations();
        afficherHistorique();
    }
}

function supprimerConversation(id) {
    if (!confirm("Supprimer cette conversation ?")) return;
    conversations = conversations.filter(c => c.id !== id);
    sauvegarderConversations();
    if (conversationActuelle && conversationActuelle.id === id) {
        nouveauChat();
    } else {
        afficherHistorique();
    }
}

function nouveauChat() {
    conversationActuelle = null;
    document.getElementById('chat').innerHTML = `
        <div class="welcome">
            <div class="welcome-logo"><img src="logo.png" alt="Nexa AI"></div>
            <h1 id="welcome-message"></h1>
            <div class="welcome-suggestions">
                <button onclick="suggestionRapide('Fais-moi un quiz sur les fractions')">📝 Quiz</button>
                <button onclick="suggestionRapide('Crée une fiche sur la Révolution française')">📚 Fiche</button>
                <button onclick="suggestionRapide('Génère mon CV')">📄 CV</button>
                <button onclick="suggestionRapide('Corrige ce texte : ')">✅ Corriger</button>
            </div>
        </div>
    `;
    mettreAJourMessageAccueil();
    afficherHistorique();
    lucide.createIcons();
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
    conv.messages.forEach(msg => afficherMessage(msg.texte, msg.type, false));
    afficherHistorique();
    chat.scrollTop = chat.scrollHeight;
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

// === DÉTECTION TYPE DEMANDE ===
function detecterTypeDemande(message) {
    const msg = message.toLowerCase();

    if (msg.includes("document word") || msg.includes("fichier word") || msg.includes("génère un word") || msg.includes("crée un word") || msg.includes(".docx")) {
        let sujet = message.replace(/.*(?:word|document word|fichier word)[\s:]*/i, '').trim();
        return { type: "word", sujet: sujet || "document" };
    }

    if (msg.includes("tableau excel") || msg.includes("fichier excel") || msg.includes("génère un excel") || msg.includes(".xlsx")) {
        let sujet = message.replace(/.*(?:excel|tableau excel|fichier excel)[\s:]*/i, '').trim();
        return { type: "excel", sujet: sujet || "données" };
    }

    if (msg.includes("présentation") || msg.includes("powerpoint") || msg.includes("slides") || msg.includes(".pptx")) {
        let sujet = message.replace(/.*(?:présentation|powerpoint|slides)[\s:]*/i, '').replace(/sur/i, '').trim();
        return { type: "pptx", sujet: sujet || "présentation" };
    }

    if (msg.includes("pdf") || msg.includes(".pdf")) {
        let sujet = message.replace(/.*(?:pdf)[\s:]*/i, '').trim();
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

    if (msg.includes("cv") || msg.includes("curriculum")) {
        return { type: "cv" };
    }

    if (msg.includes("corrige") || msg.includes("correction")) {
        let texte = message.replace(/.*(?:corrige|correction)[\s:]*/i, '').trim();
        return { type: "correction", texte: texte || message };
    }

    return { type: "chat" };
}

// === ENVOI MESSAGE ===
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

    const loadingId = afficherMessage('...', 'bot', true);

    try {
        const demande = detecterTypeDemande(message);

        // Documents
        if (demande.type === "word" || demande.type === "excel" || demande.type === "pptx" || demande.type === "pdf") {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            await telechargerDocument(demande.type, demande.sujet);
            input.disabled = false;
            input.focus();
            return;
        }

        // Image
        if (demande.type === "image") {
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            await genererImage(demande.sujet);
            input.disabled = false;
            input.focus();
            return;
        }

        let endpoint = "/chat";
        let body = {
            message: message,
            historique: conversationActuelle.messages.slice(-20),
            persona: persona,
            recherche: rechercheActive
        };

        if (rechercheActive) {
            rechercheActive = false;
            document.getElementById('btn-recherche').classList.remove('active');
        }

        if (demande.type === "quiz") {
            endpoint = "/quiz";
            body = { sujet: demande.sujet, nb: demande.nb || 5 };
        } else if (demande.type === "fiche") {
            endpoint = "/fiche";
            body = { sujet: demande.sujet };
        } else if (demande.type === "cv") {
            endpoint = "/cv";
            body = { infos: message };
        } else if (demande.type === "correction") {
            endpoint = "/corriger";
            body = { texte: demande.texte };
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (demande.type === "quiz") {
            afficherQuiz(data.quiz || data.reply);
            conversationActuelle.messages.push({
                texte: "Quiz généré",
                type: 'bot',
                date: new Date().toISOString()
            });
        } else {
            afficherMessage(data.reply, 'bot', true);
            conversationActuelle.messages.push({
                texte: data.reply,
                type: 'bot',
                date: new Date().toISOString()
            });
        }
        sauvegarderConversations();

    } catch (error) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            if (contentEl) contentEl.innerText = "❌ Erreur de connexion.";
        }
    }

    input.disabled = false;
    input.focus();
}

// === QUIZ INTERACTIF ===
function afficherQuiz(contenu) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    const id = 'quiz-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    div.id = id;
    div.className = 'message bot';

    const questions = parserQuiz(contenu);

    let html = `
        <div class="avatar"><img src="logo.png" alt="Nexa"></div>
        <div class="content">
            <div class="quiz-container">
                <div class="quiz-title">📝 Quiz interactif</div>
    `;

    questions.forEach((q, i) => {
        html += `
            <div class="quiz-question" data-question="${i}">
                <div class="quiz-question-title">${i + 1}. ${q.question}</div>
        `;

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
                    <button class="btn-quiz-validate" onclick="validerQuiz('${id}')">✅ Valider mes réponses</button>
                </div>
                <div id="feedback-${id}"></div>
            </div>
        </div>
    `;

    div.innerHTML = html;
    div.dataset.questions = JSON.stringify(questions);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
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
            questionActuelle = { question: matchQuestion[2], options: [], reponse: null };
            return;
        }
        if (matchQuestionSimple && !ligne.match(/^[A-D]\)/)) {
            if (questionActuelle) questions.push(questionActuelle);
            questionActuelle = { question: matchQuestionSimple[2], options: [], reponse: null };
            return;
        }

        const matchOption = ligne.match(/^([A-D])\)\s*(.+)$/);
        if (matchOption && questionActuelle) {
            questionActuelle.options.push(`${matchOption[1]}) ${matchOption[2]}`);
            return;
        }

        const matchReponse = ligne.match(/(?:Réponse correcte|Answer|Réponse)\s*:\s*([A-D])/i);
        if (matchReponse && questionActuelle) {
            questionActuelle.reponse = matchReponse[1].charCodeAt(0) - 65;
        }
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
    const questions = JSON.parse(quizDiv.dataset.questions);
    let bonnes = 0;
    let total = questions.length;

    questions.forEach((q, i) => {
        const questionDiv = quizDiv.querySelector(`[data-question="${i}"]`);

        if (q.options && q.options.length > 0) {
            const selected = questionDiv.querySelector('.quiz-option.selected');
            const options = questionDiv.querySelectorAll('.quiz-option');

            options.forEach((opt, j) => {
                if (j === q.reponse) opt.classList.add('correct');
            });

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
        feedback.innerHTML = `
            <div class="quiz-feedback success">
                ✅ Score : ${bonnes}/${total} — Note : ${note}/20
            </div>
        `;
    }

    quizDiv.querySelectorAll('.quiz-option').forEach(o => o.style.pointerEvents = 'none');
    const btn = quizDiv.querySelector('.btn-quiz-validate');
    if (btn) btn.disabled = true;
}

function afficherMessage(texte, type, scroll = true) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    const id = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    div.id = id;
    div.className = `message ${type}`;

    let avatar;
    if (type === 'user') {
        avatar = utilisateur.avatar
            ? `<img src="${utilisateur.avatar}" alt="">`
            : utilisateur.nom[0].toUpperCase();
    } else {
        avatar = `<img src="logo.png" alt="Nexa">`;
    }

    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="content">${texte}</div>
    `;
    chat.appendChild(div);
    if (scroll) chat.scrollTop = chat.scrollHeight;
    return id;
}

function rechercherConversations() {
    const recherche = document.getElementById('search').value.toLowerCase();
    const container = document.getElementById('historique');
    container.innerHTML = '';
    conversations
        .filter(conv => conv.titre.toLowerCase().includes(recherche))
        .forEach(conv => {
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

// === MODALES ===
function ouvrirModal(id) { document.getElementById(id).classList.add('show'); lucide.createIcons(); }
function fermerModal(id) { document.getElementById(id).classList.remove('show'); }
function ouvrirParametres() { ouvrirModal('modal-parametres'); }
function ouvrirAide() { ouvrirModal('modal-aide'); }

function personnaliserIA() {
    document.getElementById('persona-input').value = persona;
    ouvrirModal('modal-ia');
}

function suggestionPersona(texte) { document.getElementById('persona-input').value = texte; }

function sauvegarderPersona() {
    persona = document.getElementById('persona-input').value.trim();
    localStorage.setItem('nexa_persona', persona);
    fermerModal('modal-ia');
    mettreAJourMessageAccueil();
}

function modifierProfil() {
    document.getElementById('edit-avatar').src = utilisateur.avatar || 'logo.png';
    document.getElementById('edit-name').value = utilisateur.nom || '';
    document.getElementById('edit-bio').value = utilisateur.bio || '';
    ouvrirModal('modal-profil');
}

function changerAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { document.getElementById('edit-avatar').src = e.target.result; };
    reader.readAsDataURL(file);
}

function sauvegarderProfil() {
    const nom = document.getElementById('edit-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const avatar = document.getElementById('edit-avatar').src;

    if (nom) {
        utilisateur.nom = nom;
        utilisateur.bio = bio;
        utilisateur.avatar = avatar;
        localStorage.setItem('nexa_user', JSON.stringify(utilisateur));

        document.getElementById('user-name').innerText = nom;
        document.getElementById('user-bio').innerText = bio || 'Free';
        document.getElementById('user-avatar-img').src = avatar;
    }
    fermerModal('modal-profil');
}

// === PRÉFÉRENCES ===
function toggleDarkMode() {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('nexa_dark', !isLight);
}

function setAccent(couleur) {
    document.documentElement.style.setProperty('--accent', couleur);
    localStorage.setItem('nexa_accent', couleur);
}

function changerLangue() {
    const langue = document.getElementById('langue-select').value;
    localStorage.setItem('nexa_langue', langue);
    traduireInterface(langue);
}

function traduireInterface(langue) {
    const t = {
        fr: { nouveauChat: "Nouveau chat", rechercher: "Rechercher...", recents: "Récents", poser: "Poser une question...", parametres: "Paramètres", profil: "Modifier le profil", personnaliser: "Personnaliser Nexa AI", aide: "Aide", deconnexion: "Déconnexion" },
        en: { nouveauChat: "New chat", rechercher: "Search...", recents: "Recent", poser: "Ask a question...", parametres: "Settings", profil: "Edit profile", personnaliser: "Customize Nexa AI", aide: "Help", deconnexion: "Logout" },
        mg: { nouveauChat: "Resaka vaovao", rechercher: "Hikaroka...", recents: "Vao haingana", poser: "Mametraha fanontaniana...", parametres: "Kirakira", profil: "Hanova mombamomba", personnaliser: "Hanamboatra an'i Nexa AI", aide: "Fanampiana", deconnexion: "Hiala" },
        es: { nouveauChat: "Nuevo chat", rechercher: "Buscar...", recents: "Recientes", poser: "Haz una pregunta...", parametres: "Ajustes", profil: "Editar perfil", personnaliser: "Personalizar Nexa AI", aide: "Ayuda", deconnexion: "Cerrar sesión" },
        zh: { nouveauChat: "新聊天", rechercher: "搜索...", recents: "最近", poser: "提问...", parametres: "设置", profil: "编辑个人资料", personnaliser: "自定义 Nexa AI", aide: "帮助", deconnexion: "退出" }
    }[langue] || { nouveauChat: "Nouveau chat", rechercher: "Rechercher...", recents: "Récents", poser: "Poser une question...", parametres: "Paramètres", profil: "Modifier le profil", personnaliser: "Personnaliser Nexa AI", aide: "Aide", deconnexion: "Déconnexion" };

    const btnNewChat = document.querySelector('.btn-new-chat span:last-child');
    if (btnNewChat) btnNewChat.innerText = t.nouveauChat;
    const search = document.getElementById('search');
    if (search) search.placeholder = t.rechercher;
    const ht = document.querySelector('.history-title');
    if (ht) ht.innerText = t.recents;
    const msg = document.getElementById('message');
    if (msg) msg.placeholder = t.poser;

    const btns = document.querySelectorAll('.menu-profil button');
    if (btns[0]) btns[0].innerHTML = `<i data-lucide="settings"></i> ${t.parametres}`;
    if (btns[1]) btns[1].innerHTML = `<i data-lucide="user"></i> ${t.profil}`;
    if (btns[2]) btns[2].innerHTML = `<i data-lucide="sparkles"></i> ${t.personnaliser}`;
    if (btns[3]) btns[3].innerHTML = `<i data-lucide="help-circle"></i> ${t.aide}`;
    if (btns[5]) btns[5].innerHTML = `<i data-lucide="log-out"></i> ${t.deconnexion}`;

    lucide.createIcons();
}

// === RECHERCHE ===
function toggleRecherche() {
    rechercheActive = !rechercheActive;
    document.getElementById('btn-recherche').classList.toggle('active');
}

// === ANALYSE FICHIER ===
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
        <div class="content">
            <div class="file-preview"><i data-lucide="file"></i> ${file.name}</div>
        </div>
    `;
    chat.appendChild(fileDiv);
    lucide.createIcons();

    const loadingId = afficherMessage('...', 'bot', true);

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/analyser`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            if (contentEl) contentEl.innerText = data.reply;
        }

        conversationActuelle.messages.push({ texte: file.name, type: 'user', date: new Date().toISOString() });
        conversationActuelle.messages.push({ texte: data.reply, type: 'bot', date: new Date().toISOString() });
        sauvegarderConversations();
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            if (contentEl) contentEl.innerText = "❌ Erreur d'analyse.";
        }
    }

    event.target.value = '';
}

// === GÉNÉRATION DOCUMENT ===
async function telechargerDocument(type, sujet) {
    const loadingId = afficherMessage(`⏳ Génération du ${type}...`, 'bot', true);

    try {
        const response = await fetch(`${API_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sujet: sujet })
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const ext = type === 'word' ? 'docx' : type === 'excel' ? 'xlsx' : type === 'pptx' ? 'pptx' : 'pdf';

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            contentEl.innerHTML = `
                ✅ Votre fichier ${type} est prêt !<br>
                <a href="${url}" download="nexa_${type}_${Date.now()}.${ext}" class="download-btn">
                    <i data-lucide="download"></i> Télécharger
                </a>
            `;
            lucide.createIcons();
        }
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            if (contentEl) contentEl.innerText = "❌ Erreur de génération.";
        }
    }
}

// === GÉNÉRATION IMAGE ===
async function genererImage(prompt) {
    const loadingId = afficherMessage('⏳ Génération de l\'image...', 'bot', true);

    try {
        const response = await fetch(`${API_URL}/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });
        const data = await response.json();

        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            contentEl.innerHTML = `
                🖼️ Image générée :<br>
                <img src="${data.url}" class="generated-image" alt="${prompt}">
            `;
        }
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            const contentEl = loadingEl.querySelector('.content');
            if (contentEl) contentEl.innerText = "❌ Erreur de génération.";
        }
    }
}
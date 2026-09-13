// ============ HASHAGE DU MOT DE PASSE ============
async function hasher(texte) {
    const buffer = new TextEncoder().encode(texte);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ============ BASCULER ENTRE CONNEXION ET INSCRIPTION ============
function basculerFormulaire(event) {
    if (event) event.preventDefault();

    const formConnexion = document.getElementById('form-connexion');
    const formInscription = document.getElementById('form-inscription');
    const subtitle = document.getElementById('login-subtitle');
    const texteBascule = document.getElementById('texte-bascule');
    const lienBascule = document.getElementById('lien-bascule');

    if (formConnexion.style.display === 'none') {
        // Afficher CONNEXION
        formConnexion.style.display = 'flex';
        formInscription.style.display = 'none';
        subtitle.innerText = 'Connectez-vous pour continuer';
        texteBascule.innerText = 'Pas de compte ?';
        lienBascule.innerText = "S'inscrire";
    } else {
        // Afficher INSCRIPTION
        formConnexion.style.display = 'none';
        formInscription.style.display = 'flex';
        subtitle.innerText = 'Créez votre compte';
        texteBascule.innerText = 'Déjà un compte ?';
        lienBascule.innerText = 'Se connecter';
    }
}

// ============ VÉRIFICATION AU CHARGEMENT ============
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('login')) return;

    const user = localStorage.getItem('nexa_user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
});

// ============ CONNEXION ============
async function connexion(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Remplissez tous les champs.");
        return;
    }

    const users = JSON.parse(localStorage.getItem('nexa_users') || '{}');

    if (!users[email]) {
        alert("Compte inexistant. Inscrivez-vous d'abord.");
        return;
    }

    const hash = await hasher(password);

    if (users[email].password !== hash) {
        alert("Mot de passe incorrect.");
        return;
    }

    localStorage.setItem('nexa_user', JSON.stringify({
        email: email,
        nom: users[email].nom
    }));

    window.location.href = 'index.html';
}

// ============ INSCRIPTION ============
async function inscription(event) {
    event.preventDefault();

    const email = document.getElementById('ins-email').value.trim().toLowerCase();
    const nom = document.getElementById('ins-nom').value.trim();
    const password = document.getElementById('ins-password').value;
    const password2 = document.getElementById('ins-password2').value;

    if (!email || !nom || !password || !password2) {
        alert("Remplissez tous les champs.");
        return;
    }

    if (password.length < 6) {
        alert("Le mot de passe doit faire au moins 6 caractères.");
        return;
    }

    if (password !== password2) {
        alert("Les mots de passe ne correspondent pas.");
        return;
    }

    const users = JSON.parse(localStorage.getItem('nexa_users') || '{}');

    if (users[email]) {
        alert("Cet email est déjà utilisé.");
        return;
    }

    const hash = await hasher(password);

    users[email] = { nom: nom, password: hash };
    localStorage.setItem('nexa_users', JSON.stringify(users));

    localStorage.setItem('nexa_user', JSON.stringify({
        email: email,
        nom: nom
    }));

    alert("Compte créé avec succès !");
    window.location.href = 'index.html';
}

// ============ DÉCONNEXION ============
function deconnexion() {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
        localStorage.removeItem('nexa_user');
        window.location.href = 'login.html';
    }
}

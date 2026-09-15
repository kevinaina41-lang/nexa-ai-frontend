// ============ HASHAGE ============
async function hasher(texte) {
    const buffer = new TextEncoder().encode(texte);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ============ BASCULER FORMULAIRE ============
function basculerFormulaire(event) {
    if (event) event.preventDefault();
    const formConnexion = document.getElementById('form-connexion');
    const formInscription = document.getElementById('form-inscription');
    const subtitle = document.getElementById('login-subtitle');
    const texteBascule = document.getElementById('texte-bascule');
    const lienBascule = document.getElementById('lien-bascule');

    if (formConnexion.style.display === 'none') {
        formConnexion.style.display = 'flex';
        formInscription.style.display = 'none';
        subtitle.innerText = 'Connectez-vous pour continuer';
        texteBascule.innerText = 'Pas de compte ?';
        lienBascule.innerText = "S'inscrire";
    } else {
        formConnexion.style.display = 'none';
        formInscription.style.display = 'flex';
        subtitle.innerText = 'Créez votre compte';
        texteBascule.innerText = 'Déjà un compte ?';
        lienBascule.innerText = 'Se connecter';
    }
}

// ============ REDIRECTION SI DÉJÀ CONNECTÉ ============
// Si on est sur login.html et qu'on a une session → rediriger vers index
window.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.includes('login');
    
    if (isLoginPage) {
        // Sur la page login : si déjà connecté → index.html
        const user = localStorage.getItem('nexa_user');
        if (user) {
            try {
                const u = JSON.parse(user);
                if (u && u.email) {
                    console.log('Session existante → redirection vers index');
                    window.location.href = 'index.html';
                    return;
                }
            } catch(e) {
                localStorage.removeItem('nexa_user');
            }
        }
    } else {
        // Sur une autre page : si pas connecté → login.html
        const user = localStorage.getItem('nexa_user');
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        try {
            const u = JSON.parse(user);
            if (!u || !u.email) {
                localStorage.removeItem('nexa_user');
                window.location.href = 'login.html';
                return;
            }
        } catch(e) {
            localStorage.removeItem('nexa_user');
            window.location.href = 'login.html';
            return;
        }
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

    // ============ SESSION PERSISTANTE (1 AN) ============
    const session = {
        email: email,
        nom: users[email].nom,
        bio: users[email].bio || 'Free',
        avatar: users[email].avatar || null,
        date_connexion: new Date().toISOString(),
        expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem('nexa_user', JSON.stringify(session));
    console.log('Session créée, redirection vers index');
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

    users[email] = { nom: nom, password: hash, bio: 'Free', avatar: null };
    localStorage.setItem('nexa_users', JSON.stringify(users));

    // ============ SESSION PERSISTANTE (1 AN) ============
    const session = {
        email: email,
        nom: nom,
        bio: 'Free',
        avatar: null,
        date_connexion: new Date().toISOString(),
        expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem('nexa_user', JSON.stringify(session));
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

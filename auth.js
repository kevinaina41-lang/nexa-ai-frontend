// Vérifier au chargement
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('login')) return;

    const user = localStorage.getItem('nexa_user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
});

// Connexion
function connexion(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
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

    if (users[email].password !== password) {
        alert("Mot de passe incorrect.");
        return;
    }

    localStorage.setItem('nexa_user', JSON.stringify({
        email: email,
        nom: users[email].nom
    }));

    window.location.href = 'index.html';
}

// Inscription
function inscription(event) {
    if (event) event.preventDefault();
    
    const email = prompt("Entrez votre email :");
    if (!email) return;

    const nom = prompt("Entrez votre nom :");
    if (!nom) return;

    const password = prompt("Choisissez un mot de passe :");
    if (!password) return;

    const users = JSON.parse(localStorage.getItem('nexa_users') || '{}');

    if (users[email]) {
        alert("Cet email est déjà utilisé.");
        return;
    }

    users[email] = { nom: nom, password: password };
    localStorage.setItem('nexa_users', JSON.stringify(users));

    localStorage.setItem('nexa_user', JSON.stringify({
        email: email,
        nom: nom
    }));

    alert("Compte créé avec succès !");
    window.location.href = 'index.html';
}

// Déconnexion
function deconnexion() {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
        localStorage.removeItem('nexa_user');
        window.location.href = 'login.html';
    }
}
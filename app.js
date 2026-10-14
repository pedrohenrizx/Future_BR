// Initialize Parse SDK with Back4App App ID and JS Key
Parse.initialize("hzR1u3XZWsudZqAkL1sqKQhmO6XMx22EExOEXS7h", "zfIpqOpls6H5Kn8QqlKzSQVlF42v95v5zhQyqurI");
Parse.serverURL = 'https://parseapi.back4app.com/';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const postForm = document.getElementById('post-form');
const postError = document.getElementById('post-error');
const feedStream = document.getElementById('feed-stream');

// --- Authentication Functions ---

// Register User
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const user = new Parse.User();
        user.set("username", username);
        user.set("password", password);
        user.set("email", email);

        try {
            await user.signUp();
            registerError.classList.add('hidden');
            // Redirect to feed
            window.location.href = 'feed.html';
        } catch (error) {
            registerError.textContent = "Erro ao cadastrar: " + error.message;
            registerError.classList.remove('hidden');
        }
    });
}

// Login User
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            await Parse.User.logIn(username, password);
            loginError.classList.add('hidden');
            // Redirect to feed
            window.location.href = 'feed.html';
        } catch (error) {
            loginError.textContent = "Erro ao entrar: Usuário ou senha incorretos.";
            loginError.classList.remove('hidden');
        }
    });
}

// Logout User
async function logout() {
    try {
        await Parse.User.logOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    }
}

// Check Authentication and setup Feed Page
function checkAuth() {
    const currentUser = Parse.User.current();
    if (currentUser) {
        // User is logged in
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Olá, ${currentUser.get('username')}!`;
        }
        loadPosts();
    } else {
        // Not logged in, redirect to login page
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
             window.location.href = 'index.html';
        }
    }
}


// --- Feed Functions ---

// Create Post
if (postForm) {
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('post-content').value;
        const currentUser = Parse.User.current();

        if (!currentUser) {
            postError.textContent = "Você precisa estar logado para postar.";
            postError.classList.remove('hidden');
            return;
        }

        if (!content.trim()) {
            postError.textContent = "A postagem não pode estar vazia.";
            postError.classList.remove('hidden');
            return;
        }

        const Post = Parse.Object.extend("Post");
        const newPost = new Post();

        newPost.set("content", content);
        newPost.set("author", currentUser);

        try {
            await newPost.save();
            document.getElementById('post-content').value = ''; // clear textarea
            postError.classList.add('hidden');
            loadPosts(); // Reload feed
        } catch (error) {
            postError.textContent = "Erro ao publicar: " + error.message;
            postError.classList.remove('hidden');
        }
    });
}

// Load Posts
async function loadPosts() {
    if (!feedStream) return;

    const Post = Parse.Object.extend("Post");
    const query = new Parse.Query(Post);
    query.include("author"); // fetch author details
    query.descending("createdAt"); // newest first
    query.limit(20);

    try {
        const results = await query.find();

        // Remove spinner
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
             spinner.remove();
        }

        feedStream.innerHTML = ''; // Clear current stream

        if (results.length === 0) {
            feedStream.innerHTML = '<p class="text-center text-gray-500">Nenhuma publicação ainda. Seja o primeiro a apoiar a campanha!</p>';
            return;
        }

        results.forEach(post => {
            const content = post.get("content");
            const author = post.get("author");
            const authorName = author ? author.get("username") : "Usuário Desconhecido";
            const createdAt = post.createdAt;

            // Format time using moment.js if available, else fallback
            let timeAgo = '';
            if (typeof moment !== 'undefined') {
                moment.locale('pt-br');
                timeAgo = moment(createdAt).fromNow();
            } else {
                timeAgo = new Date(createdAt).toLocaleString('pt-BR');
            }

            const postElement = document.createElement('div');
            postElement.className = 'bg-white p-6 rounded-lg shadow-sm border border-gray-100';
            postElement.innerHTML = `
                <div class="flex items-center mb-4">
                    <div class="bg-green-600 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold mr-3 uppercase">
                        ${escapeHTML(authorName.charAt(0))}
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-800">${escapeHTML(authorName)}</h3>
                        <p class="text-xs text-gray-500">${timeAgo}</p>
                    </div>
                </div>
                <p class="text-gray-700 whitespace-pre-wrap">${escapeHTML(content)}</p>
            `;
            feedStream.appendChild(postElement);
        });
    } catch (error) {
        console.error("Erro ao carregar publicações: ", error);
        feedStream.innerHTML = `<p class="text-center text-red-500">Erro ao carregar o feed. Tente novamente mais tarde.</p>`;
    }
}

// Utility to escape HTML to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Initial Auth Check if on index page (to redirect to feed if already logged in)
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    const currentUser = Parse.User.current();
    if (currentUser) {
        window.location.href = 'feed.html';
    }
}

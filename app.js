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
        const username = currentUser.get('username');
        const initial = username ? username.charAt(0).toUpperCase() : 'U';

        const navUserName = document.getElementById('nav-user-name');
        const navUserInitial = document.getElementById('nav-user-initial');
        const composeUserInitial = document.getElementById('compose-user-initial');

        if (navUserName) navUserName.textContent = username;
        if (navUserInitial) navUserInitial.textContent = initial;
        if (composeUserInitial) composeUserInitial.textContent = initial;

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
            const authorHandle = authorName.toLowerCase().replace(/\s+/g, '');
            const initial = escapeHTML(authorName.charAt(0).toUpperCase());
            const createdAt = post.createdAt;

            // Format time using moment.js if available, else fallback
            let timeAgo = '';
            if (typeof moment !== 'undefined') {
                moment.locale('pt-br');
                timeAgo = moment(createdAt).fromNow(true); // e.g. "2 hours" instead of "2 hours ago"
                timeAgo = timeAgo.replace('horas', 'h').replace('minutos', 'm').replace('segundos', 's').replace('hora', 'h').replace('minuto', 'm').replace('segundo', 's');
            } else {
                timeAgo = new Date(createdAt).toLocaleDateString('pt-BR');
            }

            const postElement = document.createElement('article');
            postElement.className = 'p-4 border-b border-gray-200 hover:bg-gray-50 transition duration-200 cursor-pointer flex gap-3';
            postElement.innerHTML = `
                <div class="bg-yellow-400 text-black rounded-full h-10 w-10 flex items-center justify-center font-bold uppercase shrink-0">
                    ${initial}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1 text-sm mb-1">
                        <span class="font-bold text-gray-900 truncate hover:underline">${escapeHTML(authorName)}</span>
                        <span class="text-gray-500 truncate">@${escapeHTML(authorHandle)}</span>
                        <span class="text-gray-500">·</span>
                        <span class="text-gray-500 hover:underline">${timeAgo}</span>
                    </div>
                    <p class="text-gray-900 text-[15px] whitespace-pre-wrap mb-3">${escapeHTML(content)}</p>

                    <!-- Action Buttons -->
                    <div class="flex justify-between text-gray-500 max-w-md">
                        <div class="flex items-center gap-2 group hover:text-green-600 transition duration-200">
                            <div class="p-2 group-hover:bg-green-50 rounded-full transition duration-200">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 group hover:text-green-600 transition duration-200">
                            <div class="p-2 group-hover:bg-green-50 rounded-full transition duration-200">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 group hover:text-yellow-500 transition duration-200">
                            <div class="p-2 group-hover:bg-yellow-50 rounded-full transition duration-200">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 group hover:text-green-600 transition duration-200">
                            <div class="p-2 group-hover:bg-green-50 rounded-full transition duration-200">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>
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

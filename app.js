// === अपनी असली Supabase Keys यहाँ पेस्ट करें ===
const SUPABASE_URL = 'https://pebyjktrdedywsmjcfmq.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_bZR0YBgOCr-H_MknxgCwCg_07bz3NOU';
const ADMIN_EMAIL = 'amitrky177@gmail.com';

let sb = null;
try {
  if (SUPABASE_URL.startsWith('http')) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('Supabase Init Error:', e);
}

let allArticles = [];
let currentCategory = 'All';

// 1. Create a Clean Login Modal Dynamically (Works on all browsers & phones)
const loginModalHTML = `
  <div id="login-modal" class="modal hidden">
    <div class="modal-card" style="max-width:400px;">
      <div class="modal-header">
        <h2>Admin Sign In</h2>
        <button id="close-login" class="close-btn">×</button>
      </div>
      <form id="login-form" style="display:flex; flex-direction:column; gap:12px;">
        <input type="email" id="login-email" placeholder="Admin Email" value="amitrky177@gmail.com" required style="padding:10px; border:1px solid var(--border); border-radius:6px; background:var(--surface); color:var(--text);" />
        <input type="password" id="login-pass" placeholder="Enter Password" required style="padding:10px; border:1px solid var(--border); border-radius:6px; background:var(--surface); color:var(--text);" />
        <button type="submit" id="login-submit-btn" class="btn-primary">Sign In</button>
      </form>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', loginModalHTML);

document.getElementById('close-login').onclick = () => document.getElementById('login-modal').classList.add('hidden');

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  if (!sb) {
    alert('Error: Please add your real SUPABASE_URL and SUPABASE_ANON_KEY in app.js first!');
    return;
  }
  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true; btn.textContent = 'Signing in...';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login Failed: ' + error.message);
    btn.disabled = false; btn.textContent = 'Sign In';
  } else {
    document.getElementById('login-modal').classList.add('hidden');
    location.reload();
  }
};

// 2. Check User Auth Status
async function checkUser() {
  const authBtn = document.getElementById('auth-btn');
  const fab = document.getElementById('admin-fab');

  // Default click action so button ALWAYS responds
  authBtn.onclick = () => {
    if (!sb) {
      alert('Supabase Keys missing in app.js! Please paste your Project URL and Anon Key.');
      return;
    }
    document.getElementById('login-modal').classList.remove('hidden');
  };

  if (!sb) return;

  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    authBtn.textContent = 'Sign Out';
    authBtn.onclick = async () => {
      await sb.auth.signOut();
      location.reload();
    };
    if (user.email === ADMIN_EMAIL) {
      fab.classList.remove('hidden');
    } else {
      fab.classList.add('hidden');
    }
  } else {
    authBtn.textContent = 'Sign In';
    fab.classList.add('hidden');
  }
}

// 3. Load Live Articles from Supabase
async function loadArticles() {
  if (!sb) return;
  const { data, error } = await sb.from('articles').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Load Error:', error);
    return;
  }
  allArticles = data || [];
  renderArticles();
}

function renderArticles(searchQuery = '') {
  const hero = document.getElementById('hero-section');
  const grid = document.getElementById('articles-grid');

  let filtered = allArticles.filter(art => {
    const matchCat = currentCategory === 'All' || art.category === currentCategory;
    const matchSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    hero.innerHTML = '';
    grid.innerHTML = '<p style="color:var(--muted);">No articles published yet. Sign in as admin and click + to publish your first article!</p>';
    return;
  }

  if (currentCategory === 'All' && !searchQuery) {
    const main = filtered;
    const side = filtered.slice(1, 3);
    hero.innerHTML = `
      <div class="card hero-main" onclick="openArticle('${main.id}')">
        <img src="${main.cover_image_url}" alt="${main.title}">
        <div class="card-body">
          <span class="badge">${main.category}</span>
          <h2>${main.title}</h2>
          <p class="meta">${new Date(main.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${calcReadTime(main.content)} min read</p>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${side.map(a => createCardHTML(a)).join('')}
      </div>
    `;
    grid.innerHTML = filtered.slice(3).map(a => createCardHTML(a)).join('');
  } else {
    hero.innerHTML = '';
    grid.innerHTML = filtered.map(a => createCardHTML(a)).join('');
  }
}

function createCardHTML(art) {
  return `
    <div class="card" onclick="openArticle('${art.id}')">
      <img src="${art.cover_image_url}" alt="${art.title}">
      <div class="card-body">
        <span class="badge">${art.category}</span>
        <h3>${art.title}</h3>
        <p class="meta">${new Date(art.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${calcReadTime(art.content)} min read</p>
      </div>
    </div>
  `;
}

function calcReadTime(text) {
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function openArticle(id) {
  const art = allArticles.find(a => a.id === id);
  if (!art) return;

  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('static-page-view').classList.add('hidden');
  document.getElementById('article-view').classList.remove('hidden');

  document.getElementById('meta-title').textContent = `${art.title} | Aivizex`;
  document.getElementById('meta-desc').setAttribute('content', art.content.replace(/<[^>]*>/g, '').slice(0, 155));

  document.getElementById('article-content-box').innerHTML = `
    <span class="badge">${art.category}</span>
    <h1 style="font-size:2rem; margin:10px 0;">${art.title}</h1>
    <p class="meta">Published on ${new Date(art.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • ${calcReadTime(art.content)} min read</p>
    <img src="${art.cover_image_url}" alt="${art.title}">
    <div class="article-body">${art.content}</div>
  `;
  window.scrollTo(0, 0);
}

function resetHome() {
  document.getElementById('article-view').classList.add('hidden');
  document.getElementById('static-page-view').classList.add('hidden');
  document.getElementById('home-view').classList.remove('hidden');
  document.getElementById('meta-title').textContent = 'Aivizex — AI, Finance, Insurance, Health & Remote Work Insights';
}

// 4. Publish New Article + Image Upload
document.getElementById('admin-fab').onclick = () => document.getElementById('editor-modal').classList.remove('hidden');
document.getElementById('close-modal').onclick = () => document.getElementById('editor-modal').classList.add('hidden');

function insertTag(openTag, closeTag) {
  const ta = document.getElementById('post-content');
  const start = ta.selectionStart, end = ta.selectionEnd;
  const selected = ta.value.substring(start, end);
  ta.value = ta.value.substring(0, start) + openTag + selected + closeTag + ta.value.substring(end);
}

document.getElementById('article-form').onsubmit = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('publish-btn');
  btn.disabled = true; btn.textContent = 'Uploading & Publishing...';

  const title = document.getElementById('post-title').value;
  const category = document.getElementById('post-category').value;
  const content = document.getElementById('post-content').value;
  const file = document.getElementById('post-image').files;

  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { error: uploadErr } = await sb.storage.from('article-images').upload(fileName, file);
  if (uploadErr) {
    alert('Image upload failed: ' + uploadErr.message);
    btn.disabled = false; btn.textContent = 'Publish Live Now';
    return;
  }

  const { data: { publicUrl } } = sb.storage.from('article-images').getPublicUrl(fileName);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const { error: insertErr } = await sb.from('articles').insert([{ title, slug, category, content, cover_image_url: publicUrl }]);
  if (insertErr) {
    alert('Publish failed: ' + insertErr.message);
    btn.disabled = false; btn.textContent = 'Publish Live Now';
    return;
  }

  document.getElementById('article-form').reset();
  document.getElementById('editor-modal').classList.add('hidden');
  btn.disabled = false; btn.textContent = 'Publish Live Now';
  loadArticles();
};

// Category & Search Listeners
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    document.getElementById('feed-title').textContent = currentCategory === 'All' ? 'Latest Articles' : currentCategory;
    resetHome();
    renderArticles(document.getElementById('search-input').value);
  };
});

document.getElementById('search-input').oninput = (e) => renderArticles(e.target.value);
document.getElementById('theme-toggle').onclick = () => document.body.classList.toggle('dark');

function openStaticPage(page) {

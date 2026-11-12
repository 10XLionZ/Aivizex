// === अपनी Supabase Keys यहाँ पेस्ट करें ===
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';
const ADMIN_EMAIL = 'amitrky177@gmail.com';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let allArticles = [];
let currentCategory = 'All';

// 1. Auth Check & Strict '+' Button Visibility
// 1. Direct Email + Password Admin Login (No Google Cloud Needed)
async function checkUser() {
  const { data: { user } } = await sb.auth.getUser();
  const authBtn = document.getElementById('auth-btn');
  const fab = document.getElementById('admin-fab');

  if (user) {
    authBtn.textContent = 'Sign Out';
    authBtn.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    if (user.email === ADMIN_EMAIL) {
      fab.classList.remove('hidden');
    } else {
      fab.classList.add('hidden');
    }
  } else {
    authBtn.textContent = 'Admin Login';
    authBtn.onclick = async () => {
      const email = prompt('Enter Admin Email:');
      if (!email) return;
      const password = prompt('Enter Admin Password:');
      if (!password) return;

      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Login Failed: ' + error.message);
      } else {
        location.reload();
      }
    };
    fab.classList.add('hidden');
  }
}


// 2. Fetch Real Articles from Supabase
async function loadArticles() {
  const { data, error } = await sb.from('articles').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
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

  // Hero Section (Latest Featured + Side Articles)
  if (currentCategory === 'All' && !searchQuery) {
    const main = filtered[0];
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

// 3. Open Full Article View + Dynamic SEO Meta Tags
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
  const file = document.getElementById('post-image').files[0];

  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { error: uploadErr } = await sb.storage.from('article-images').upload(fileName, file);
  if (uploadErr) { alert('Image upload failed: ' + uploadErr.message); btn.disabled = false; return; }

  const { data: { publicUrl } } = sb.storage.from('article-images').getPublicUrl(fileName);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const { error: insertErr } = await sb.from('articles').insert([{ title, slug, category, content, cover_image_url: publicUrl }]);
  if (insertErr) { alert('Publish failed: ' + insertErr.message); btn.disabled = false; return; }

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

// Static Pages for AdSense Approval
function openStaticPage(page) {
  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('article-view').classList.add('hidden');
  document.getElementById('static-page-view').classList.remove('hidden');
  const pages = {
    about: '<h1>About Aivizex</h1><p>Aivizex is an independent digital publication providing actionable, well-researched insights on AI & Tech, Personal Finance, Insurance, Health, and Remote Work for readers worldwide.</p>',
    contact: '<h1>Contact Us</h1><p>Have questions, feedback, or partnership inquiries? Reach out to our editorial team at: <b>contact@aivizex.com</b> (or amitrky177@gmail.com).</p>',
    privacy: '<h1>Privacy Policy</h1><p>At Aivizex, we respect your privacy. We use standard cookies and third-party advertising partners like Google AdSense to serve relevant ads based on user visits.</p>',
    disclaimer: '<h1>Disclaimer</h1><p>The content published on Aivizex regarding Finance, Insurance, and Health is for informational and educational purposes only and does not constitute professional financial or medical advice.</p>'
  };
  document.getElementById('static-page-content').innerHTML = pages[page];
  window.scrollTo(0, 0);
}

checkUser();
loadArticles();

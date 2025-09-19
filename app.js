(function() {
  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn));

  const state = {
    quotes: [
      'Inhale courage, exhale doubt.',
      'Where the breath goes, the mind follows.',
      'Let your breath anchor your presence.',
      'Move with intention, arrive with ease.',
      'Peace is found between each inhale and exhale.',
      'Slow is smooth. Smooth is calm.',
    ],
  };

  function qs(sel, el = document) { return el.querySelector(sel); }
  function qsa(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }

  function getUsers() { return JSON.parse(localStorage.getItem('bs_users') || '[]'); }
  function saveUsers(users) { localStorage.setItem('bs_users', JSON.stringify(users)); }
  function setSession(email) { localStorage.setItem('bs_session', email || ''); }
  function getSession() { return localStorage.getItem('bs_session') || ''; }
  function getBookings() { return JSON.parse(localStorage.getItem('bs_bookings') || '[]'); }
  function saveBookings(b) { localStorage.setItem('bs_bookings', JSON.stringify(b)); }

  function updateAuthUI() {
    const email = getSession();
    const login = qs('#nav-login');
    const signup = qs('#nav-signup');
    const logout = qs('#nav-logout');
    if (login && signup && logout) {
      const isLogged = !!email;
      login.classList.toggle('hidden', isLogged);
      signup.classList.toggle('hidden', isLogged);
      logout.classList.toggle('hidden', !isLogged);
      logout.onclick = () => { setSession(''); location.reload(); };
    }
  }

  function setupNavToggle() {
    const toggle = qs('#navToggle');
    const nav = qs('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  function setupYear() {
    const y = qs('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function setupRandomQuote() {
    const el = qs('#quote');
    if (!el) return;
    const pick = state.quotes[Math.floor(Math.random() * state.quotes.length)];
    el.textContent = pick;
  }

  function drawOrbs() {
    const canvas = qs('#bgOrbs');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h; let orbs = [];
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = Math.max(500, window.innerHeight * 0.9); }
    function makeOrbs() {
      orbs = new Array(18).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 40 + Math.random() * 120,
        hue: 165 + Math.random() * 30,
        a: Math.random() * Math.PI * 2,
        v: 0.001 + Math.random() * 0.003,
      }));
    }
    function step(t) {
      ctx.clearRect(0, 0, w, h);
      orbs.forEach(o => {
        o.a += o.v;
        const ox = Math.cos(o.a) * 20; const oy = Math.sin(o.a) * 20;
        ctx.beginPath();
        const grd = ctx.createRadialGradient(o.x + ox, o.y + oy, 0, o.x + ox, o.y + oy, o.r);
        grd.addColorStop(0, `hsla(${o.hue}, 60%, 70%, 0.10)`);
        grd.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = grd;
        ctx.arc(o.x + ox, o.y + oy, o.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(step);
    }
    resize(); makeOrbs(); step();
    window.addEventListener('resize', () => { resize(); makeOrbs(); });
  }

  // Auth: Signup
  function setupSignup() {
    const form = qs('#signupForm');
    if (!form) return;
    const err = qs('#signupError');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = qs('#suName').value.trim();
      const email = qs('#suEmail').value.trim().toLowerCase();
      const password = qs('#suPassword').value;
      err.textContent = '';
      if (!name || !email || !password) { err.textContent = 'Please fill in all fields.'; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; return; }
      if (password.length < 6) { err.textContent = 'Password must be at least 6 characters.'; return; }
      const users = getUsers();
      if (users.some(u => u.email === email)) { err.textContent = 'Email already registered. Try logging in.'; return; }
      users.push({ name, email, password });
      saveUsers(users);
      setSession(email);
      location.href = 'schedule.html';
    });
  }

  // Auth: Login
  function setupLogin() {
    const form = qs('#loginForm');
    if (!form) return;
    const err = qs('#loginError');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = qs('#liEmail').value.trim().toLowerCase();
      const password = qs('#liPassword').value;
      err.textContent = '';
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) { err.textContent = 'Invalid email or password.'; return; }
      setSession(email);
      location.href = 'schedule.html';
    });
  }

  // Schedule + Booking
  function setupSchedule() {
    const grid = qs('#timetableGrid');
    if (!grid) return;
    const classSelect = qs('#classSelect');
    const dateInput = qs('#dateInput');
    const timeInput = qs('#timeInput');
    const bookBtn = qs('#bookBtn');
    const confirmEl = qs('#bookingConfirm');
    const listEl = qs('#bookingList');

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const defaultSlots = ['07:00', '09:00', '12:00', '17:30', '19:00'];
    const classTypes = ['Vinyasa Flow', 'Hatha Basics', 'Yin Restore', 'Power Yoga', 'Breath & Stillness'];

    // Render cells
    days.forEach((d, dayIdx) => {
      const cell = document.createElement('div');
      cell.className = 'timetable-cell';
      defaultSlots.forEach((t, idx) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        const cls = classTypes[(dayIdx + idx) % classTypes.length];
        slot.dataset.time = t;
        slot.dataset.class = cls;
        slot.textContent = `${t} • ${cls}`;
        slot.addEventListener('click', () => {
          if (slot.classList.contains('booked')) return;
          classSelect.value = cls;
          timeInput.value = t;
          // Pick date: nearest upcoming for this weekday
          const today = new Date();
          const todayWeekday = (today.getDay() + 6) % 7; // make Monday=0
          let delta = dayIdx - todayWeekday;
          if (delta < 0) delta += 7;
          const selected = new Date(today);
          selected.setDate(today.getDate() + delta);
          dateInput.value = selected.toISOString().slice(0, 10);
          confirmEl.textContent = '';
        });
        cell.appendChild(slot);
      });
      grid.appendChild(cell);
    });

    function hydrateBookedUI() {
      const bookings = getBookings();
      const email = getSession();
      qsa('.slot', grid).forEach(el => {
        const found = bookings.find(b => b.date && b.time === el.dataset.time && b.className === el.dataset.class);
        el.classList.toggle('booked', !!found);
        el.title = el.classList.contains('booked') ? 'Already booked' : 'Click to book';
      });
      // Render list
      if (listEl) {
        listEl.innerHTML = '';
        const mine = bookings.filter(b => !email || b.email === email);
        mine.forEach(b => {
          const item = document.createElement('div');
          item.className = 'booking-item';
          item.textContent = `${b.date} • ${b.time} • ${b.className} (${b.name || b.email || 'Guest'})`;
          listEl.appendChild(item);
        });
        if (mine.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'muted';
          empty.textContent = 'No bookings yet.';
          listEl.appendChild(empty);
        }
      }
    }

    bookBtn.addEventListener('click', () => {
      const className = classSelect.value;
      const date = dateInput.value;
      const time = timeInput.value;
      if (!className || !date || !time) { confirmEl.textContent = 'Select class, date, and time.'; return; }
      const email = getSession();
      const users = getUsers();
      const user = users.find(u => u.email === email);
      const name = user ? user.name : 'Guest';
      const bookings = getBookings();
      if (bookings.some(b => b.date === date && b.time === time && b.className === className)) {
        confirmEl.textContent = 'That slot is already booked.';
        return;
      }
      bookings.push({ className, date, time, email, name, createdAt: Date.now() });
      saveBookings(bookings);
      confirmEl.textContent = 'Booking confirmed! See you on the mat.';
      hydrateBookedUI();
    });

    hydrateBookedUI();
  }

  ready(() => {
    setupNavToggle();
    setupYear();
    setupRandomQuote();
    drawOrbs();
    updateAuthUI();
    setupSignup();
    setupLogin();
    setupSchedule();
  });
})();




// Защита от копирования (ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ОТЛАДКИ)
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('selectstart', function(e) { e.preventDefault(); });
document.addEventListener('keydown', function(e) {
     if (e.key === 'F12' || (e.ctrlKey && ['u','U','s','S','p','P'].includes(e.key)) || (e.ctrlKey && e.shiftKey && ['i','I','j','J','c','C'].includes(e.key))) { e.preventDefault(); }
});
document.querySelectorAll('img').forEach(img => { img.addEventListener('dragstart', function(e) { e.preventDefault(); }); });

// GeoTrainer PRO v1.0 | © 2026 Vadim | License: proprietary
const _gt_signature = "GeoTrainer-PRO-2026-Vadim-a9000235187";
const _gt_build = "2026.10.13-stats-final";
const _gt_verify = function() { return _gt_signature.length === 38; };

// === ИНИЦИАЛИЗАЦИЯ SUPABASE ===
const supabaseUrl = 'https://owvzrvyzsphsyoijeqru.supabase.co';
const supabaseKey = 'sb_publishable_9qwHtMdkEGc6Z_i8bgqN4w_wTLIg5DG';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase клиент инициализирован:", sb);

let currentUser = null;
let currentList = [...countriesData];
let currentIndex = 0;
let currentMode = 'cards';
let userProgress = { learned: [], lastStudied: null };
let resendInterval = null;

function updateFilteredCountries() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const regionFilter = document.getElementById('regionFilter').value;
    const hideLearned = document.getElementById('hideLearnedCheckbox')?.checked || false;
    
    let filtered = countriesData.filter(country => {
        const matchesSearch = country.name.toLowerCase().includes(searchText);
        const matchesRegion = regionFilter === 'all' || country.region === regionFilter;
        
        // Если включен фильтр "скрыть выученные" и пользователь авторизован
        if (hideLearned && currentUser) {
            const isLearned = (userProgress.learned || []).includes(country.code);
            if (isLearned) return false;
        }
        
        return matchesSearch && matchesRegion;
    });
    
    if (!currentUser) {
        currentList = filtered.filter(country => isDemoCountry(country.code));
    } else {
        currentList = filtered;
    }
    
    currentIndex = 0;
    renderCountry();
    updateLearnedButton();
    updateProgressStats(); // Обновляем статистику при каждом фильтре
}

function renderCountry() {
    if (currentList.length === 0) { 
        document.getElementById('counter').textContent = 'Ничего не найдено';
        document.getElementById('flagContainer').innerHTML = '';
        document.getElementById('countryName').textContent = '';
        document.getElementById('capital').textContent = '';
        document.getElementById('location').textContent = '';
        document.getElementById('government').textContent = '';
        document.getElementById('admin').textContent = '';
        document.getElementById('orgs').textContent = '';
        document.getElementById('detailsBlock').classList.add('hidden');
        document.getElementById('quizAnswer').style.display = 'none';
        return; 
    }
    const country = currentList[currentIndex];
    
    document.getElementById('counter').textContent = currentIndex + 1 + ' из ' + currentList.length;
    document.getElementById('prevBtn').disabled = (currentIndex === 0);
    document.getElementById('nextBtn').disabled = (currentIndex === currentList.length - 1);
    document.getElementById('prevBtn2').disabled = (currentIndex === 0);
    document.getElementById('nextBtn2').disabled = (currentIndex === currentList.length - 1);

    if (currentMode === 'cards') {
        const learnedList = userProgress.learned || [];
        const isLearned = learnedList.includes(country.code);
        const borderStyle = isLearned ? 'border:4px solid #27ae60; box-shadow:0 0 10px rgba(39,174,96,0.5);' : 'border:2px solid #ccc;';
        document.getElementById('flagContainer').innerHTML = '<img src="' + country.code + '.svg" alt="Флаг ' + country.name + '" style="' + borderStyle + '">';
        document.getElementById('countryName').textContent = country.name;
        document.getElementById('countryName').classList.add('hidden');
        document.getElementById('capital').textContent = country.capital;
        document.getElementById('location').textContent = country.location;
        document.getElementById('government').textContent = country.government;
        document.getElementById('admin').textContent = country.admin;
        document.getElementById('orgs').textContent = country.orgs;
        
        const noteLine = document.getElementById('noteLine');
        if (country.note) {
            noteLine.textContent = country.note;
            noteLine.style.display = 'block';
        } else {
            noteLine.style.display = 'none';
        }
        
        document.getElementById('detailsBlock').classList.add('hidden');
        document.getElementById('detailsBtn').textContent = 'Показать детали';
    } else {
        document.getElementById('quizCapital').textContent = country.capital;
        document.getElementById('quizGov').textContent = country.government;
        document.getElementById('quizAdmin').textContent = country.admin;
        document.getElementById('quizOrgs').textContent = country.orgs;
        document.getElementById('quizAnswer').innerHTML = '<img src="' + country.code + '.svg" style="max-height:80px; border:2px solid #ccc; border-radius:4px; margin-bottom:10px;"><br><div style="font-size:18px;">' + country.name + '</div><div style="font-weight:normal; font-size:14px; margin-top:5px;">' + country.location + '</div>';
        document.getElementById('quizAnswer').style.display = 'none';
        document.getElementById('answerBtn').textContent = 'Показать ответ';
    }
}

function changeCountry(direction) { currentIndex += direction; renderCountry(); updateLearnedButton(); }

function toggleDetails() {
    const details = document.getElementById('detailsBlock');
    const btn = document.getElementById('detailsBtn');
    const nameEl = document.getElementById('countryName');
    if (details.classList.contains('hidden')) { 
        details.classList.remove('hidden'); 
        nameEl.classList.remove('hidden'); 
        btn.textContent = 'Скрыть детали'; 
    } else { 
        details.classList.add('hidden'); 
        nameEl.classList.add('hidden'); 
        btn.textContent = 'Показать детали'; 
    }
}

function showAnswer() {
    const answerDiv = document.getElementById('quizAnswer');
    const btn = document.getElementById('answerBtn');
    if (answerDiv.style.display === 'none') { 
        answerDiv.style.display = 'block'; 
        btn.textContent = 'Скрыть ответ'; 
    } else { 
        answerDiv.style.display = 'none'; 
        btn.textContent = 'Показать ответ'; 
    }
}

function toggleMode() {
    const cardsMode = document.getElementById('cardsMode');
    const quizMode = document.getElementById('quizMode');
    const modeBtn = document.getElementById('modeBtn');
    const modeLabel = document.getElementById('modeLabel');
    if (currentMode === 'cards') { 
        currentMode = 'quiz'; 
        cardsMode.classList.add('hidden'); 
        quizMode.classList.remove('hidden'); 
        modeBtn.textContent = 'Переключить в режим КАРТОЧКИ'; 
        modeLabel.textContent = 'РЕЖИМ: ТЕСТ'; 
        modeLabel.className = 'mode-label mode-quiz'; 
    } else { 
        currentMode = 'cards'; 
        cardsMode.classList.remove('hidden'); 
        quizMode.classList.add('hidden'); 
        modeBtn.textContent = 'Переключить в режим ТЕСТ'; 
        modeLabel.textContent = 'РЕЖИМ: КАРТОЧКИ'; 
        modeLabel.className = 'mode-label mode-cards'; 
    }
    renderCountry();
    updateLearnedButton();
}

function showRandom() { 
    if (currentList.length > 0) { 
        currentIndex = Math.floor(Math.random() * currentList.length); 
        renderCountry();
        updateLearnedButton();
    } 
}

document.getElementById('prevBtn').addEventListener('click', () => changeCountry(-1));
document.getElementById('nextBtn').addEventListener('click', () => changeCountry(1));
document.getElementById('prevBtn2').addEventListener('click', () => changeCountry(-1));
document.getElementById('nextBtn2').addEventListener('click', () => changeCountry(1));
document.getElementById('detailsBtn').addEventListener('click', toggleDetails);
document.getElementById('answerBtn').addEventListener('click', showAnswer);
document.getElementById('modeBtn').addEventListener('click', toggleMode);
document.getElementById('randomBtn').addEventListener('click', showRandom);

const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearSearch');
searchInput.addEventListener('input', function() {
    clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
    updateFilteredCountries();
});
clearBtn.addEventListener('click', function() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    updateFilteredCountries();
    searchInput.focus();
});

document.getElementById('regionFilter').addEventListener('change', updateFilteredCountries);

document.getElementById('closeModalBtn').addEventListener('click', function() {
    document.getElementById('lockedModal').style.display = 'none';
});

document.getElementById('unlockBtn').addEventListener('click', function() {
    alert('Полный доступ скоро будет доступен! Следите за обновлениями.');
});

document.getElementById('feedbackBtn').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Автозаполнение для авторизованных пользователей
    if (currentUser) {
        document.getElementById('feedbackName').value = currentUser.email.split('@')[0];
        document.getElementById('feedbackEmail').value = currentUser.email;
    } else {
        document.getElementById('feedbackName').value = '';
        document.getElementById('feedbackEmail').value = '';
    }
    
    document.getElementById('feedbackModal').style.display = 'flex';
    document.getElementById('feedbackModal').classList.remove('hidden');
});

document.getElementById('closeFeedbackBtn').addEventListener('click', function() {
    document.getElementById('feedbackModal').style.display = 'none';
    document.getElementById('feedbackModal').classList.add('hidden');
});

document.getElementById('feedbackModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
        this.classList.add('hidden');
    }
});

// === АВТОРИЗАЦИЯ SUPABASE ===
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');

authBtn.addEventListener('click', function() {
    authModal.style.display = 'flex';
    authModal.classList.remove('hidden');
    // Сброс форм при открытии
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    document.getElementById('emailSentScreen').style.display = 'none';
    authMessage.textContent = '';
});

document.getElementById('closeAuthBtn').addEventListener('click', function() {
    authModal.style.display = 'none';
    authModal.classList.add('hidden');
    authMessage.textContent = '';
    if (resendInterval) clearInterval(resendInterval);
});

document.getElementById('showRegister').addEventListener('click', function(e) {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    authMessage.textContent = '';
});

document.getElementById('showLogin').addEventListener('click', function(e) {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    authMessage.textContent = '';
});

document.getElementById('loginSubmit').addEventListener('click', async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        authMessage.textContent = 'Заполните все поля';
        authMessage.style.color = '#e74c3c';
        return;
    }
    
    authMessage.textContent = 'Входим...';
    authMessage.style.color = '#3498db';
    
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    
    if (error) {
        authMessage.textContent = 'Ошибка: ' + error.message;
        authMessage.style.color = '#e74c3c';
    } else {
        authMessage.textContent = 'Успешный вход!';
        authMessage.style.color = '#27ae60';
        setTimeout(() => {
            authModal.style.display = 'none';
            authModal.classList.add('hidden');
        }, 1000);
    }
});

document.getElementById('registerSubmit').addEventListener('click', async function() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!email || !password) {
        authMessage.textContent = 'Заполните все поля';
        authMessage.style.color = '#e74c3c';
        return;
    }
    
    if (password.length < 6) {
        authMessage.textContent = 'Пароль должен быть минимум 6 символов';
        authMessage.style.color = '#e74c3c';
        return;
    }
    
    authMessage.textContent = 'Регистрируем...';
    authMessage.style.color = '#3498db';
    
    const { data, error } = await sb.auth.signUp({ email, password });
    
    if (error) {
        authMessage.textContent = 'Ошибка: ' + error.message;
        authMessage.style.color = '#e74c3c';
    } else {
        // Показываем экран "Письмо отправлено"
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        document.getElementById('emailSentScreen').style.display = 'block';
        document.getElementById('sentEmailDisplay').textContent = email;
        authMessage.textContent = '';
        
        // Запускаем таймер
        startResendTimer(email);
    }
});

// Функция таймера
function startResendTimer(email) {
    let seconds = 60;
    const timerEl = document.getElementById('resendTimer');
    const btn = document.getElementById('resendBtn');
    
    timerEl.textContent = seconds;
    btn.disabled = true;
    btn.style.background = '#95a5a6';
    btn.style.cursor = 'not-allowed';
    btn.textContent = 'Отправить повторно (' + seconds + ')';
    
    if (resendInterval) clearInterval(resendInterval);
    
    resendInterval = setInterval(() => {
        seconds--;
        timerEl.textContent = seconds;
        btn.textContent = 'Отправить повторно (' + seconds + ')';
        
        if (seconds <= 0) {
            clearInterval(resendInterval);
            timerEl.textContent = '0';
            btn.disabled = false;
            btn.style.background = '#3498db';
            btn.style.cursor = 'pointer';
            btn.textContent = 'Отправить повторно';
        }
    }, 1000);
}

// Обработчик кнопки "Отправить повторно"
document.getElementById('resendBtn').addEventListener('click', async function() {
    const email = document.getElementById('sentEmailDisplay').textContent;
    this.textContent = 'Отправляем...';
    this.disabled = true;
    
    try {
        await sb.auth.signUp({ email, password: 'dummy' }); 
    } catch (e) {
        console.log('Resend attempt:', e);
    }
    
    setTimeout(() => {
        alert('Запрос на повторную отправку выполнен. Проверьте почту (включая спам).');
        startResendTimer(email);
    }, 1000);
});

// Возврат к форме входа
document.getElementById('backToLoginFromSent').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('emailSentScreen').style.display = 'none';
    loginForm.style.display = 'block';
    if (resendInterval) clearInterval(resendInterval);
});

logoutBtn.addEventListener('click', async function() {
    await sb.auth.signOut();
});

// === СИСТЕМА ПРОГРЕССА ===
async function loadUserProgress() {
    if (!currentUser) return;
    
    console.log('Загрузка прогресса для пользователя:', currentUser.id);
    
    const { data, error } = await sb
        .from('profiles')
        .select('progress')
        .eq('id', currentUser.id)
        .single();
    
    if (error) {
        console.error('Ошибка загрузки прогресса:', error);
        userProgress = { learned: [], lastStudied: null };
        updateFilteredCountries();
        return;
    }
    
    console.log('Полученный прогресс:', data);
    
    if (data && data.progress) {
        userProgress = data.progress;
        if (!userProgress.learned) {
            userProgress.learned = [];
        }
    } else {
        userProgress = { learned: [], lastStudied: null };
    }
    
    console.log('Выученные страны:', userProgress.learned);
    
    updateFilteredCountries();
    updateLearnedButton();
    updateProgressStats(); // ← ОБЯЗАТЕЛЬНО ВЫЗЫВАЕМ ЗДЕСЬ
}

async function saveUserProgress() {
    if (!currentUser) return;
    
    userProgress.lastStudied = new Date().toISOString();
    
    console.log('Сохранение прогресса:', userProgress);
    
    const { error } = await sb
        .from('profiles')
        .update({ progress: userProgress, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);
    
    if (error) {
        console.error('Ошибка сохранения прогресса:', error);
    } else {
        console.log('Прогресс успешно сохранён');
    }
}

document.getElementById('learnedBtn').addEventListener('click', async function() {
    if (currentList.length === 0) return;
    
    const country = currentList[currentIndex];
    const countryCode = country.code;
    
    if (!userProgress.learned) {
        userProgress.learned = [];
    }
    
    if (userProgress.learned.includes(countryCode)) {
        userProgress.learned = userProgress.learned.filter(code => code !== countryCode);
        this.textContent = '✓ Выучил';
        this.style.background = '#27ae60';
    } else {
        userProgress.learned.push(countryCode);
        this.textContent = '✗ Не выучил';
        this.style.background = '#95a5a6';
    }
    
    await saveUserProgress();
    renderCountry();
    updateLearnedButton();
    updateProgressStats(); // ← ОБЯЗАТЕЛЬНО ОБНОВЛЯЕМ СТАТИСТИКУ
});

function updateLearnedButton() {
    const learnedBtn = document.getElementById('learnedBtn');
    
    if (!currentUser || currentList.length === 0) {
        learnedBtn.style.display = 'none';
        return;
    }
    
    learnedBtn.style.display = 'block';
    const country = currentList[currentIndex];
    
    const learnedList = userProgress.learned || [];
    
    if (learnedList.includes(country.code)) {
        learnedBtn.textContent = '✗ Не выучил';
        learnedBtn.style.background = '#95a5a6';
    } else {
        learnedBtn.textContent = '✓ Выучил';
        learnedBtn.style.background = '#27ae60';
    }
}

// === НОВАЯ ФУНКЦИЯ: ОБНОВЛЕНИЕ СТАТИСТИКИ ===
function updateProgressStats() {
    const statsBlock = document.getElementById('progressStats');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const learnedCount = document.getElementById('learnedCount');
    
    if (!currentUser) {
        if (statsBlock) statsBlock.style.display = 'none';
        return;
    }
    
    if (statsBlock) statsBlock.style.display = 'block';
    
    const totalCountries = 196;
    const learned = userProgress.learned ? userProgress.learned.length : 0;
    const percent = Math.round((learned / totalCountries) * 100);
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = percent + '%';
    if (learnedCount) learnedCount.textContent = learned;
    
    // Меняем цвет прогресс-бара в зависимости от процента
    let color = '#e74c3c'; // Красный
    if (percent >= 30 && percent < 70) color = '#f39c12'; // Оранжевый
    if (percent >= 70) color = '#27ae60'; // Зеленый
    
    if (progressBar) progressBar.style.background = color;
}

sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        currentUser = session.user;
        authBtn.style.display = 'none';
        userName.style.display = 'inline';
        userName.textContent = session.user.email;
        logoutBtn.style.display = 'inline-block';
        loadUserProgress();
    } else {
        currentUser = null;
        userProgress = { learned: [], lastStudied: null };
        authBtn.style.display = 'inline-block';
        userName.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
    updateFilteredCountries();
});

// Очищаем поле поиска, если в URL есть параметры от Supabase
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('type') || urlParams.has('token')) {
    document.getElementById('searchInput').value = '';
    window.history.replaceState({}, '', window.location.pathname);
}

// Обработчик чекбокса "Показать только невыученные"
document.getElementById('hideLearnedCheckbox').addEventListener('change', function() {
    updateFilteredCountries();
});

updateFilteredCountries();
/* =============================================================================
 * THE DAILY TRACKER — app.js (refactored)
 * Fixes applied:
 *   - Single/double tap & click disambiguation (no more double-marking)
 *   - Lazy todayStr (no longer stale after midnight)
 *   - Consolidated URL param handling
 *   - Mobile nav parity (added Today button)
 *   - Ctrl+Z no longer fires inside textareas/inputs
 *   - Event delegation on calendar (cuts ~3000 listeners to 6)
 *   - Removed dead code (resetBtn, unused reduced-motion fns, bnav-top, etc.)
 *   - Merged addSeenMilestone + checkMilestoneHaptic
 *   - Added --color-slip usage
 *   - showToast replaces alert()
 *   - Canvas DPI scaling
 *   - Null-guards on element refs
 *   - loadData backs up corrupted localStorage
 *   - importData preserves notes in all branches
 *   - Multi-year switcher
 *   - Reset all data option
 *   - SW update notification
 *   - Keyboard a11y for day cells (Enter/Space)
 *   - aria-labels on day cells
 * ========================================================================== */

const LOCAL_STORAGE_KEY   = 'cal_cases_data';
const THEME_STORAGE_KEY   = 'cal_theme_pref';
const NOTES_STORAGE_KEY   = 'cal_notes_data';
const MILESTONES_SEEN_KEY = 'cal_milestones_seen';

const BACKUP_KEY          = 'cal_data_backup';
const MOOD_STORAGE_KEY    = 'cal_mood_data';          // Feature 31: mood 1-5
const ENERGY_STORAGE_KEY  = 'cal_energy_data';        // Feature 32: energy 1-5
const SLEEP_STORAGE_KEY   = 'cal_sleep_data';         // Feature 33: sleep 1-5
const TEMPLATES_STORAGE_KEY   = 'cal_note_templates'; // Feature 35: note templates
const ACHIEVEMENTS_SEEN_KEY   = 'cal_achievements';   // Feature 21: unlocked achievements

// Slip color, sourced from CSS variable (single source of truth)
let _slipColor = null;
const getSlipColor = () => {
    if (!_slipColor) {
        _slipColor = getComputedStyle(document.documentElement).getPropertyValue('--color-slip').trim() || '#D4783F';
    }
    return _slipColor;
};

// Magic numbers (named for clarity)
const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_MS = 500;
const MAX_TEMPLATES = 20;
const MAX_AUTOCOMPLETE = 8;

let casesData = {};
let notesData = {};
let moodData = {};            // { [dateStr]: 1..5 }
let energyData = {};          // { [dateStr]: 1..5 }
let sleepData = {};           // { [dateStr]: 1..5 }
let noteTemplates = [];       // string[]
let unlockedAchievements = new Set();
let currentYear = new Date().getFullYear();
let notesSearchQuery = '';
let activeNotesTag = 'all';
let notesDateFrom = '';
let notesDateTo = '';
let undoSnapshot = null;
let isDragging = false;
let dragState = null;
let dragVisitedCount = 0;

// ---- Lazy "today" so the app stays correct after midnight -----------------
const getTodayStr = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const getTodayDate = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
};

// ---- Element refs (all null-guarded) --------------------------------------
const calendarGrid     = document.getElementById('calendar-grid');
const streakVal        = document.getElementById('streak-val');
const bestVal          = document.getElementById('best-val');
const successVal       = document.getElementById('success-val');
const failVal          = document.getElementById('fail-val');
const streakValLg      = document.getElementById('streak-val-lg');
const successValLg     = document.getElementById('success-val-lg');
const failValLg        = document.getElementById('fail-val-lg');
const bestStreakVal    = document.getElementById('best-streak-val');
const currentYearTitle = document.getElementById('current-year');
const exportBtn        = document.getElementById('export-btn');
const importFile       = document.getElementById('import-file');

const noteModal        = document.getElementById('note-modal');
const modalTitle       = document.getElementById('modal-date-title');
const noteTextarea     = document.getElementById('note-textarea');
const modalCloseBtn    = document.getElementById('modal-x-close');
const modalSaveBtn     = document.getElementById('modal-save-btn');
let activeNoteDate = null;

const mobileToggle     = document.getElementById('mobile-menu-toggle');
const statsOverlay     = document.getElementById('stats-overlay');

const sparklineCanvas  = document.getElementById('sparkline-canvas');
const yearTrendCanvas  = document.getElementById('year-trend-canvas');

// ---- Toast (replaces alert) -----------------------------------------------
const showToast = (msg, type = 'info', duration = 3500) => {
    const toast = document.createElement('div');
    toast.className = `pwa-toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 100);
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 500);
    }, duration);
};

// ---- Constants ------------------------------------------------------------
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS_OF_WEEK = ['M','T','W','T','F','S','S'];

const TAG_CATEGORIES = {
    clean:   ['Workout', 'Good Sleep', 'Meditated', 'Social Win', 'Read'],
    relapse: ['Stress', 'Boredom', 'Social Media', 'Insomnia', 'Hangover']
};
const TAG_SUGGESTIONS = [...TAG_CATEGORIES.clean, ...TAG_CATEGORIES.relapse];

const MILESTONES = { 7:'VII', 14:'XIV', 30:'XXX', 60:'LX', 90:'XC', 100:'C', 365:'CCCLXV' };

// Feature 22: Levels — based on best streak
const LEVELS = [
    { name: 'None',      threshold: 0,   color: 'var(--text-dim)',  symbol: '' },
    { name: 'Bronze',    threshold: 7,   color: '#CD7F32',          symbol: 'B' },
    { name: 'Silver',    threshold: 30,  color: '#C0C0C0',          symbol: 'S' },
    { name: 'Gold',      threshold: 90,  color: 'var(--color-gold)', symbol: 'G' },
    { name: 'Platinum',  threshold: 180, color: '#E5E4E2',          symbol: 'P' },
    { name: 'Diamond',   threshold: 365, color: '#B9F2FF',          symbol: 'D' }
];

// Feature 21: Achievements — 35 badges across 5 tiers
const ACHIEVEMENT_TIERS = {
    bronze:   { name: 'Bronze',   color: '#CD7F32', gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)' },
    silver:   { name: 'Silver',   color: '#C0C0C0', gradient: 'linear-gradient(135deg, #E8E8E8 0%, #9C9C9C 100%)' },
    gold:     { name: 'Gold',     color: 'var(--color-gold)', gradient: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)' },
    platinum: { name: 'Platinum', color: '#E5E4E2', gradient: 'linear-gradient(135deg, #F5F5F5 0%, #A9A9A9 100%)' },
    diamond:  { name: 'Diamond',  color: '#B9F2FF', gradient: 'linear-gradient(135deg, #B9F2FF 0%, #4FC3F7 100%)' }
};

const ACHIEVEMENTS = [
    // ---- BRONZE (Beginner) ----
    { id: 'first_mark',     name: 'First Mark',       desc: 'Mark your first day',                       icon: '1',  tier: 'bronze' },
    { id: 'first_week',     name: 'First Week',       desc: '7-day streak',                              icon: '7',  tier: 'bronze' },
    { id: 'two_weeks',      name: 'Two Weeks',        desc: '14-day streak',                             icon: '14', tier: 'bronze' },
    { id: 'kept_3',         name: '3 Kept',           desc: '3 clean days total',                        icon: '3',  tier: 'bronze' },
    { id: 'kept_10',        name: '10 Kept',          desc: '10 clean days total',                       icon: '10', tier: 'bronze' },
    { id: 'first_note',     name: 'First Note',       desc: 'Write your first note',                     icon: '\u270E', tier: 'bronze' },
    { id: 'tagged',         name: 'Tagged',           desc: 'Use your first #tag',                       icon: '#',  tier: 'bronze' },

    // ---- SILVER (Intermediate) ----
    { id: 'month_one',      name: 'Month One',        desc: '30-day streak',                             icon: '30', tier: 'silver' },
    { id: 'kept_25',        name: '25 Kept',          desc: '25 clean days total',                       icon: '25', tier: 'silver' },
    { id: 'perfect_week',   name: 'Perfect Week',     desc: 'Every day of a clean calendar week',        icon: '\u2713', tier: 'silver' },
    { id: 'comeback',       name: 'The Comeback',     desc: 'Reset after 14+ day streak, then 7+ clean', icon: '\u21bb', tier: 'silver' },
    { id: 'trigger_aware',  name: 'Trigger Aware',    desc: 'Use 5+ unique trigger tags',                icon: '\u26A0', tier: 'silver' },
    { id: 'storyteller',    name: 'Storyteller',      desc: 'Write 25 notes',                            icon: '\u270D', tier: 'silver' },
    { id: 'tag_master',     name: 'Tag Master',       desc: 'Use 10+ unique tags',                       icon: '\u2756', tier: 'silver' },

    // ---- GOLD (Advanced) ----
    { id: 'two_months',     name: 'Two Months',       desc: '60-day streak',                             icon: '60', tier: 'gold' },
    { id: 'quarter_master', name: 'Quarter Master',   desc: '90-day streak',                             icon: '90', tier: 'gold' },
    { id: 'century',        name: 'Century',          desc: '100-day streak',                            icon: 'C',  tier: 'gold' },
    { id: 'kept_50',        name: '50 Kept',          desc: '50 clean days total',                       icon: '50', tier: 'gold' },
    { id: 'resilient',      name: 'Resilient',        desc: 'Reset 5+ times and kept going',             icon: '\u2691', tier: 'gold' },
    { id: 'iron_will',      name: 'Iron Will',        desc: '30 days without a single slip',             icon: '\u2694', tier: 'gold' },
    { id: 'weekend_warrior',name: 'Weekend Warrior',  desc: '4 clean weekends in a row',                 icon: 'W',  tier: 'gold' },
    { id: 'unstoppable',    name: 'Unstoppable',      desc: 'Current streak beats previous best',        icon: '\u2191', tier: 'gold' },
    { id: 'climbing',       name: 'Climbing',         desc: '3 streaks in a row, each longer than last', icon: '\u25B2', tier: 'gold' },

    // ---- PLATINUM (Elite) ----
    { id: 'half_year',      name: 'Half Year',        desc: '180-day streak',                            icon: '\u00BD', tier: 'platinum' },
    { id: 'kept_100',       name: '100 Kept',         desc: '100 clean days total',                      icon: '100',tier: 'platinum' },
    { id: 'perfect_month',  name: 'Perfect Month',    desc: 'Clean every day of a calendar month',       icon: '\u25C9', tier: 'platinum' },
    { id: 'phoenix',        name: 'Phoenix Rising',   desc: 'Recover from 30+ relapse to 30+ streak',    icon: '\u2698', tier: 'platinum' },
    { id: 'zero_slip',      name: 'Zero Slip Zone',   desc: '90 days with zero slips',                   icon: '\u2205', tier: 'platinum' },
    { id: 'bounce_master',  name: 'Bounce Back Master',desc: '10 successful bounce-backs after relapse', icon: '\u21BA', tier: 'platinum' },
    { id: 'plateau',        name: 'Plateau Breaker',  desc: 'Broke a 30+ day plateau',                   icon: '\u2261', tier: 'platinum' },

    // ---- DIAMOND (Legendary) ----
    { id: 'year_one',       name: 'Year One',         desc: '365-day streak',                            icon: '\u2726', tier: 'diamond' },
    { id: 'kept_250',       name: '250 Kept',         desc: '250 clean days total',                      icon: '250',tier: 'diamond' },
    { id: 'reflective',     name: 'Reflective',       desc: 'Wrote a note every day for 14 days',        icon: '\u270E', tier: 'diamond' },
    { id: 'reset_survivor', name: 'Reset Survivor',   desc: 'Relapsed 10+ times but kept going 90+ days',icon: '\u271D', tier: 'diamond' },
    { id: 'archivist',      name: 'Archivist',        desc: 'Tracked for 365 days total (any state)',    icon: '\u229E', tier: 'diamond' }
];

// Feature 45: Auto-suggest tags based on note content (keyword → tag)
const TAG_KEYWORD_MAP = {
    'tired': '#Insomnia', 'exhausted': '#Insomnia', 'sleepy': '#Insomnia', 'awake': '#Insomnia', 'insomnia': '#Insomnia', 'could not sleep': '#Insomnia',
    'stressed': '#Stress', 'anxious': '#Stress', 'overwhelmed': '#Stress', 'worried': '#Stress', 'pressure': '#Stress', 'panic': '#Stress',
    'bored': '#Boredom', 'boring': '#Boredom', 'nothing to do': '#Boredom', 'idle': '#Boredom',
    'instagram': '#SocialMedia', 'tiktok': '#SocialMedia', 'youtube': '#SocialMedia', 'twitter': '#SocialMedia', 'facebook': '#SocialMedia', 'reddit': '#SocialMedia', 'scrolling': '#SocialMedia',
    'drunk': '#Hangover', 'hungover': '#Hangover', 'alcohol': '#Hangover', 'beer': '#Hangover', 'wine': '#Hangover', 'hangover': '#Hangover',
    'gym': '#Workout', 'workout': '#Workout', 'exercise': '#Workout', 'ran': '#Workout', 'lifted': '#Workout', 'run': '#Workout', 'jogging': '#Workout',
    'meditated': '#Meditated', 'meditation': '#Meditated', 'mindful': '#Meditated', 'mindfulness': '#Meditated',
    'slept well': '#GoodSleep', 'rested': '#GoodSleep', 'good sleep': '#GoodSleep', 'slept great': '#GoodSleep',
    'friends': '#SocialWin', 'party': '#SocialWin', 'family': '#SocialWin', 'socialized': '#SocialWin', 'hung out': '#SocialWin',
    'read': '#Read', 'book': '#Read', 'reading': '#Read'
};

// ---- Date helpers ---------------------------------------------------------
const getDaysInMonth = (monthIndex, year) => new Date(year, monthIndex + 1, 0).getDate();

const getFirstDayOfMonth = (monthIndex, year) => {
    const day = new Date(year, monthIndex, 1).getDay();
    return day === 0 ? 6 : day - 1;
};

const parseDateStr = (str) => {
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatDateStr = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

const addDaysToDateStr = (dateStr, days) => {
    const d = parseDateStr(dateStr);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    return formatDateStr(d);
};

// ---- Theme ----------------------------------------------------------------
const syncThemeToggleLabels = (theme) => {
    // Preserve SVG icon — only update the text span
    document.querySelectorAll('.theme-toggle-label').forEach(el => {
        el.textContent = theme === 'light' ? 'Dark' : 'Light';
    });
};

const loadTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    let theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
        theme = savedTheme;
    } else {
        theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeToggleLabels(theme);
};

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    syncThemeToggleLabels(newTheme);
    // Redraw canvas charts with new theme colors
    drawSparkline();
    drawYearTrend();
};

// ---- App badge ------------------------------------------------------------
const updateAppBadge = () => {
    if (!('setAppBadge' in navigator)) return;
    const stats = calculateStatsValues();
    if (stats.currentStreak > 0) {
        navigator.setAppBadge(stats.currentStreak).catch(() => {});
    } else {
        navigator.clearAppBadge().catch(() => {});
    }
};

// ---- Note helpers ---------------------------------------------------------
const extractNoteTags = (text) => {
    const matches = text.match(/#[A-Za-z0-9_-]+/g) || [];
    const seen = new Set();
    return matches.filter((tag) => {
        const n = tag.toLowerCase();
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
    });
};

const getSortedNoteEntries = () =>
    Object.entries(notesData).filter(([_, val]) => val && val.trim()).sort((a, b) => b[0].localeCompare(a[0]));

const getFilteredNoteEntries = (noteEntries) => {
    const query = notesSearchQuery.trim().toLowerCase();
    return noteEntries.filter(([dateStr, text]) => {
        const tags = extractNoteTags(text);
        const matchesTag = activeNotesTag === 'all' || tags.some((tag) => tag.toLowerCase() === activeNotesTag);
        const matchesQuery = !query
            || text.toLowerCase().includes(query)
            || dateStr.includes(query)
            || tags.some((tag) => tag.toLowerCase().includes(query));
        const matchesDateRange = (!notesDateFrom || dateStr >= notesDateFrom) && (!notesDateTo || dateStr <= notesDateTo);
        return matchesTag && matchesQuery && matchesDateRange;
    });
};

// ---- Milestones (merged addSeen + haptic) ---------------------------------
const getSeenMilestones = () => {
    try { return new Set(JSON.parse(localStorage.getItem(MILESTONES_SEEN_KEY) || '[]')); }
    catch { return new Set(); }
};

const markMilestoneSeen = (value, withHaptic = false) => {
    const seen = getSeenMilestones();
    if (seen.has(value)) return;
    seen.add(value);
    localStorage.setItem(MILESTONES_SEEN_KEY, JSON.stringify([...seen]));
    if (withHaptic && navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 60]);
};

// ---- Tag suggestions / autocomplete ---------------------------------------
const getAllTagNames = () => {
    const all = new Set(TAG_SUGGESTIONS);
    for (const text of Object.values(notesData)) {
        if (text) extractNoteTags(text).forEach(t => all.add(t.replace(/^#/, '')));
    }
    return [...all].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
};

const setupAutocomplete = () => {
    if (!noteTextarea) return;
    const dd = document.getElementById('autocomplete-dropdown');
    if (!dd) return;
    let selectedIdx = -1;
    let currentMatch = null;

    const hide = () => { dd.classList.remove('active'); dd.innerHTML = ''; selectedIdx = -1; currentMatch = null; };

    const getWordBeforeCursor = () => {
        const val = noteTextarea.value;
        const pos = noteTextarea.selectionStart;
        const before = val.slice(0, pos);
        const match = before.match(/#(\w*)$/);
        return match ? { query: match[1].toLowerCase(), start: pos - match[0].length, end: pos } : null;
    };

    const insertTag = (tag, start, end) => {
        const before = noteTextarea.value.slice(0, start);
        const after = noteTextarea.value.slice(end);
        noteTextarea.value = before + '#' + tag + ' ' + after;
        const newPos = start + tag.length + 2;
        noteTextarea.setSelectionRange(newPos, newPos);
        noteTextarea.focus();
        hide();
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const render = (match) => {
        currentMatch = match;
        if (!match) { hide(); return; }
        const filtered = getAllTagNames()
            .filter(t => t.toLowerCase().includes(match.query))
            .slice(0, MAX_AUTOCOMPLETE);
        if (filtered.length === 0) { hide(); return; }
        dd.textContent = '';
        const frag = document.createDocumentFragment();
        filtered.forEach((tag, idx) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item' + (idx === 0 ? ' selected' : '');
            item.dataset.tag = tag;
            item.innerHTML = `<span class="ac-label">#${tag}</span><span class="ac-hint">insert tag</span>`;
            frag.appendChild(item);
        });
        dd.appendChild(frag);
        selectedIdx = 0;
        dd.classList.add('active');
    };

    // Delegated click on autocomplete dropdown
    dd.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (!item || !currentMatch) return;
        const tag = item.dataset.tag;
        if (tag) insertTag(tag, currentMatch.start, currentMatch.end);
    });
    dd.addEventListener('mouseenter', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (!item) return;
        dd.querySelectorAll('.autocomplete-item').forEach((el) => el.classList.toggle('selected', el === item));
        selectedIdx = [...dd.children].indexOf(item);
    }, true);

    noteTextarea.addEventListener('input', () => render(getWordBeforeCursor()));
    noteTextarea.addEventListener('keydown', (e) => {
        if (!dd.classList.contains('active')) return;
        const items = dd.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
            items.forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
            items[selectedIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIdx = Math.max(selectedIdx - 1, 0);
            items.forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
            items[selectedIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (selectedIdx >= 0 && selectedIdx < items.length && currentMatch) {
                e.preventDefault();
                const tag = items[selectedIdx].querySelector('.ac-label')?.textContent?.replace(/^#/, '');
                if (tag) insertTag(tag, currentMatch.start, currentMatch.end);
            }
        } else if (e.key === 'Escape') {
            hide();
        }
    });
    noteTextarea.addEventListener('blur', () => setTimeout(hide, 200));
    noteTextarea.addEventListener('click', () => render(getWordBeforeCursor()));
};

// ---- Sidebar notes rendering ----------------------------------------------
const renderSidebarTagRail = (noteEntries) => {
    const tagRail = document.getElementById('sidebar-tag-rail');
    if (!tagRail) return;
    tagRail.textContent = '';
    const tagCounts = new Map();
    noteEntries.forEach(([_, text]) => {
        extractNoteTags(text).forEach((tag) => {
            const n = tag.toLowerCase();
            if (!tagCounts.has(n)) tagCounts.set(n, { label: tag, count: 0 });
            tagCounts.get(n).count += 1;
        });
    });
    const frag = document.createDocumentFragment();
    [...tagCounts.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
        .slice(0, 12)
        .forEach(([normalized, meta]) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'sidebar-tag-chip' + (activeNotesTag === normalized ? ' active' : '');
            chip.textContent = `${meta.label} \u00b7 ${meta.count}`;
            chip.dataset.tag = normalized;
            frag.appendChild(chip);
        });
    tagRail.appendChild(frag);
};

const renderSidebarNotes = () => {
    const list = document.getElementById('sidebar-notes-list');
    const empty = document.getElementById('sidebar-empty');
    const countEl = document.getElementById('sidebar-note-count');
    const filterLabel = document.getElementById('sidebar-filter-label');
    const searchInput = document.getElementById('sidebar-search');
    const clearBtn = document.getElementById('sidebar-clear-filters');
    if (!list || !empty) return;
    list.innerHTML = '';
    if (searchInput && searchInput.value !== notesSearchQuery) searchInput.value = notesSearchQuery;

    const noteEntries = getSortedNoteEntries();
    const filteredEntries = getFilteredNoteEntries(noteEntries);
    const hasActiveFilter = notesSearchQuery.trim() || activeNotesTag !== 'all' || notesDateFrom || notesDateTo;
    renderSidebarTagRail(noteEntries);
    if (countEl) countEl.textContent = noteEntries.length;
    if (filterLabel) {
        const count = filteredEntries.length;
        filterLabel.textContent = hasActiveFilter
            ? (count === 1 ? '1 entry found' : count + ' entries found')
            : (noteEntries.length === 1 ? '1 entry' : noteEntries.length + ' entries');
    }
    if (clearBtn) clearBtn.style.visibility = hasActiveFilter ? 'visible' : 'hidden';

    if (noteEntries.length === 0) {
        empty.innerHTML = '<div class="sidebar-empty-icon" aria-hidden="true">&#10000;</div><p class="sidebar-empty-text">No entries yet</p><p class="sidebar-hint">Double-tap a day to leave a note</p>';
        empty.style.display = 'block';
        return;
    }
    if (filteredEntries.length === 0) {
        empty.innerHTML = '<div class="sidebar-empty-icon" aria-hidden="true">&#10022;</div><p class="sidebar-empty-text">No notes match this filter</p><p class="sidebar-hint">Try another phrase or clear the active tag</p>';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    const frag = document.createDocumentFragment();
    filteredEntries.forEach(([dateStr, text]) => {
        const card = document.createElement('div');
        card.className = 'sidebar-note-card';
        card.dataset.date = dateStr;
        const dateParts = dateStr.split('-');
        const monthName = MONTHS[parseInt(dateParts[1]) - 1];
        const dayNum = parseInt(dateParts[2]);
        const dateEl = document.createElement('div');
        dateEl.className = 'sidebar-note-date';
        const d = parseDateStr(dateStr);
        const dow = d ? DAYS_OF_WEEK[d.getDay()] : '';
        dateEl.innerHTML = monthName + ' ' + dayNum + (dow ? ' <span class="note-day-of-week">' + dow + '</span>' : '');
        const textEl = document.createElement('div');
        textEl.className = 'sidebar-note-text';
        textEl.textContent = text;
        const tags = extractNoteTags(text);
        card.appendChild(dateEl);
        card.appendChild(textEl);
        if (tags.length > 0) {
            const tagList = document.createElement('div');
            tagList.className = 'sidebar-note-tags';
            const tagFrag = document.createDocumentFragment();
            tags.forEach((tag) => {
                const tagEl = document.createElement('span');
                tagEl.className = 'sidebar-note-tag';
                tagEl.textContent = tag;
                tagFrag.appendChild(tagEl);
            });
            tagList.appendChild(tagFrag);
            card.appendChild(tagList);
        }
        frag.appendChild(card);
    });
    list.appendChild(frag);
};

// ---- Data load / save -----------------------------------------------------
const loadData = () => {
    const savedCases       = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedNotes       = localStorage.getItem(NOTES_STORAGE_KEY);
    const savedMood        = localStorage.getItem(MOOD_STORAGE_KEY);
    const savedEnergy      = localStorage.getItem(ENERGY_STORAGE_KEY);
    const savedSleep       = localStorage.getItem(SLEEP_STORAGE_KEY);
    const savedTemplates   = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const savedAchievements= localStorage.getItem(ACHIEVEMENTS_SEEN_KEY);

    const safeParseObj = (raw, fallback) => {
        try { return JSON.parse(raw) || fallback; }
        catch (e) {
            try {
                localStorage.setItem(BACKUP_KEY, JSON.stringify({
                    raw, timestamp: new Date().toISOString(), error: String(e)
                }));
            } catch {}
            showToast('Saved data was corrupted — backed up. Previous data reset.', 'info', 6000);
            return fallback;
        }
    };
    const safeParseArr = (raw) => {
        try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
        catch { return []; }
    };

    casesData              = savedCases       ? safeParseObj(savedCases, {}) : {};
    notesData              = savedNotes       ? safeParseObj(savedNotes, {}) : {};
    moodData               = savedMood        ? safeParseObj(savedMood, {}) : {};
    energyData             = savedEnergy      ? safeParseObj(savedEnergy, {}) : {};
    sleepData              = savedSleep       ? safeParseObj(savedSleep, {}) : {};
    noteTemplates          = safeParseArr(savedTemplates);
    unlockedAchievements   = new Set(safeParseArr(savedAchievements));
};

const saveData = () => {
    // Auto-escalate consecutive slips to relapse
    const sortedSlip = Object.keys(casesData).filter(d => casesData[d] === 2).sort();
    for (let i = 1; i < sortedSlip.length; i++) {
        const prev = parseDateStr(sortedSlip[i - 1]);
        const curr = parseDateStr(sortedSlip[i]);
        if (!prev || !curr) continue;
        const diff = Math.round((curr - prev) / 86400000);
        if (diff === 1) casesData[sortedSlip[i]] = 3;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(casesData));
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesData));
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(moodData));
    localStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(energyData));
    localStorage.setItem(SLEEP_STORAGE_KEY, JSON.stringify(sleepData));
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(noteTemplates));
    localStorage.setItem(ACHIEVEMENTS_SEEN_KEY, JSON.stringify([...unlockedAchievements]));
    updateStats();
    checkAchievements();        // Feature 21: detect newly unlocked
    drawSparkline();
    drawYearTrend();
    updateAppBadge();
    renderSidebarNotes();
    updateCalendarCells();   // incremental — no full re-render
};

// ---- Stats ----------------------------------------------------------------
const getSortedDates = () =>
    Object.keys(casesData).filter(k => casesData[k] !== undefined).sort();

const getAllStreakLengths = () => {
    const dates = getSortedDates();
    const lengths = [];
    let temp = 0;
    let prev = null;
    for (const d of dates) {
        const state = casesData[d];
        if (state === 1 || state === 2) {
            const dt = parseDateStr(d);
            if (prev) {
                const diff = Math.round((dt - prev) / 86400000);
                if (diff === 1) temp++;
                else { if (temp > 0) lengths.push(temp); temp = 1; }
            } else { temp = 1; }
            prev = dt;
        } else if (state === 3) {
            if (temp > 0) lengths.push(temp);
            temp = 0;
            prev = null;
        } else {
            if (temp > 0) lengths.push(temp);
            temp = 0;
            prev = null;
        }
    }
    if (temp > 0) lengths.push(temp);
    return lengths;
};

const getBestStreak = () => {
    const lengths = getAllStreakLengths();
    return lengths.length > 0 ? Math.max(...lengths) : 0;
};

// Feature 2: Streak velocity — avg clean/slip days gained per week over last 4 weeks
const getStreakVelocity = () => {
    let count = 0;
    const today = getTodayDate();
    for (let i = 0; i < 28; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = formatDateStr(d);
        if (casesData[dStr] === 1 || casesData[dStr] === 2) count++;
    }
    return count / 4; // avg per week
};

// Feature 5: Streak distribution — bucket streak lengths
const getStreakDistribution = () => {
    const lengths = getAllStreakLengths();
    const buckets = { '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '31+': 0 };
    lengths.forEach(len => {
        if (len <= 3) buckets['1-3']++;
        else if (len <= 7) buckets['4-7']++;
        else if (len <= 14) buckets['8-14']++;
        else if (len <= 30) buckets['15-30']++;
        else buckets['31+']++;
    });
    return { buckets, total: lengths.length };
};

// Feature 11: This month vs last month stats
const getMonthComparison = () => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastDate = new Date(thisYear, thisMonth - 1, 1);
    const lastMonth = lastDate.getMonth();
    const lastYear = lastDate.getFullYear();

    const countMonth = (m, y) => {
        const days = getDaysInMonth(m, y);
        let clean = 0, slip = 0, relapse = 0;
        for (let d = 1; d <= days; d++) {
            const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const st = casesData[dStr];
            if (st === 1) clean++;
            else if (st === 2) slip++;
            else if (st === 3) relapse++;
        }
        const total = clean + slip + relapse;
        const cleanPct = total > 0 ? Math.round((clean / total) * 100) : 0;
        return { clean, slip, relapse, total, cleanPct, days };
    };

    return {
        thisMonth: countMonth(thisMonth, thisYear),
        lastMonth: countMonth(lastMonth, lastYear),
        thisMonthName: MONTHS[thisMonth],
        lastMonthName: MONTHS[lastMonth]
    };
};

// Feature 22: Level calculation based on best streak
const getCurrentLevel = (bestStreak) => {
    let current = LEVELS[0];
    let next = null;
    for (let i = 0; i < LEVELS.length; i++) {
        if (bestStreak >= LEVELS[i].threshold) {
            current = LEVELS[i];
            next = LEVELS[i + 1] || null;
        }
    }
    return { current, next };
};

// Feature 21: Achievement checking — returns array of newly unlocked IDs
const checkAchievements = () => {
    const stats = calculateStatsValues();
    const newlyUnlocked = [];

    const unlock = (id) => {
        if (!unlockedAchievements.has(id)) {
            unlockedAchievements.add(id);
            newlyUnlocked.push(id);
        }
    };

    const totalMarks = stats.successCount + stats.slipCount + stats.failCount;
    const lengths = getAllStreakLengths();
    const sortedLengths = [...lengths].sort((a, b) => b - a);
    const bestStreak = stats.bestStreak;
    const currentStreak = stats.currentStreak;
    const totalCleanDays = stats.successCount;

    // ---- BRONZE ----
    if (totalMarks >= 1) unlock('first_mark');
    if (bestStreak >= 7) unlock('first_week');
    if (bestStreak >= 14) unlock('two_weeks');
    if (totalCleanDays >= 3) unlock('kept_3');
    if (totalCleanDays >= 10) unlock('kept_10');
    if (Object.keys(notesData).length >= 1) unlock('first_note');
    {
        // Count unique tags used across all notes
        const allTags = new Set();
        for (const text of Object.values(notesData)) {
            if (text) extractNoteTags(text).forEach(t => allTags.add(t.toLowerCase()));
        }
        if (allTags.size >= 1) unlock('tagged');
        // SILVER: tag_master
        if (allTags.size >= 10) unlock('tag_master');
        // SILVER: trigger_aware — 5+ unique tags on slip/relapse days
        const triggerTags = new Set();
        for (const dateStr in notesData) {
            if (casesData[dateStr] === 2 || casesData[dateStr] === 3) {
                extractNoteTags(notesData[dateStr]).forEach(t => triggerTags.add(t.toLowerCase()));
            }
        }
        if (triggerTags.size >= 5) unlock('trigger_aware');
    }

    // ---- SILVER ----
    if (bestStreak >= 30) unlock('month_one');
    if (totalCleanDays >= 25) unlock('kept_25');
    if (Object.keys(notesData).length >= 25) unlock('storyteller');

    // Perfect Week — every day of a clean calendar week (Mon-Sun)
    {
        const checkPerfectWeek = (weeksBack) => {
            const today = getTodayDate();
            const ref = new Date(today);
            ref.setDate(ref.getDate() - weeksBack * 7);
            // Find Monday of that week
            const refDay = ref.getDay();
            const daysSinceMon = (refDay === 0 ? 6 : refDay - 1);
            const monday = new Date(ref);
            monday.setDate(monday.getDate() - daysSinceMon);
            if (monday > today) return false;
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(d.getDate() + i);
                if (d > today) return false;
                const dStr = formatDateStr(d);
                if (casesData[dStr] !== 1) return false;
            }
            return true;
        };
        for (let w = 0; w < 52; w++) {
            if (checkPerfectWeek(w)) { unlock('perfect_week'); break; }
        }
    }

    // The Comeback — Reset after 14+ day streak, then 7+ days clean
    {
        const dates = getSortedDates();
        let prevStreakLen = 0;
        let tempStreak = 0;
        let prev = null;
        let i = 0;
        while (i < dates.length) {
            const d = dates[i];
            const state = casesData[d];
            if (state === 1 || state === 2) {
                const dt = parseDateStr(d);
                if (prev) {
                    const diff = Math.round((dt - prev) / 86400000);
                    if (diff === 1) tempStreak++;
                    else { if (tempStreak > prevStreakLen) prevStreakLen = tempStreak; tempStreak = 1; }
                } else { tempStreak = 1; }
                prev = dt;
            } else if (state === 3) {
                if (tempStreak > prevStreakLen) prevStreakLen = tempStreak;
                tempStreak = 0;
                prev = parseDateStr(d);
                // Now check if 7+ clean days follow AND prevStreakLen >= 14
                if (prevStreakLen >= 14) {
                    let recoveryDays = 0;
                    for (let j = i + 1; j < dates.length; j++) {
                        const st = casesData[dates[j]];
                        if (st === 1 || st === 2) recoveryDays++;
                        else break;
                    }
                    if (recoveryDays >= 7) { unlock('comeback'); break; }
                }
            }
            i++;
        }
    }

    // ---- GOLD ----
    if (bestStreak >= 60) unlock('two_months');
    if (bestStreak >= 90) unlock('quarter_master');
    if (bestStreak >= 100) unlock('century');
    if (totalCleanDays >= 50) unlock('kept_50');

    // Resilient — 5+ relapses AND each followed by 7+ clean days
    {
        const dates = getSortedDates();
        let bounceBacks = 0;
        for (let i = 0; i < dates.length; i++) {
            if (casesData[dates[i]] === 3) {
                let recoveryDays = 0;
                for (let j = i + 1; j < dates.length; j++) {
                    const st = casesData[dates[j]];
                    if (st === 1 || st === 2) recoveryDays++;
                    else break;
                }
                if (recoveryDays >= 7) bounceBacks++;
            }
        }
        if (bounceBacks >= 5) unlock('resilient');
        // PLATINUM: bounce_master — 10 successful bounce-backs
        if (bounceBacks >= 10) unlock('bounce_master');

        // Count total relapses for reset_survivor (DIAMOND)
        let totalRelapses = 0;
        for (const d of dates) if (casesData[d] === 3) totalRelapses++;
        if (totalRelapses >= 10 && totalMarks >= 90) unlock('reset_survivor');
    }

    // Iron Will — 30 days without a slip (current streak ≥ 30 with zero slips in last 30 days)
    {
        let noSlip30 = true;
        const today = getTodayDate();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (casesData[formatDateStr(d)] === 2) { noSlip30 = false; break; }
        }
        if (noSlip30 && currentStreak >= 30) unlock('iron_will');

        // Zero Slip Zone — 90 days with zero slips (any streak context)
        if (currentStreak >= 90) {
            let noSlip90 = true;
            for (let i = 0; i < 90; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                if (casesData[formatDateStr(d)] === 2) { noSlip90 = false; break; }
            }
            if (noSlip90) unlock('zero_slip');
        }
    }

    // Weekend Warrior — 4 consecutive clean weekends
    {
        const today = getTodayDate();
        const checkWeekend = (weeksBack) => {
            const ref = new Date(today);
            ref.setDate(ref.getDate() - weeksBack * 7);
            const refDay = ref.getDay();
            const daysSinceSat = (refDay - 6 + 7) % 7;
            const sat = new Date(ref);
            sat.setDate(sat.getDate() - daysSinceSat);
            if (sat > today) return false;
            const satStr = formatDateStr(sat);
            const sunStr = formatDateStr(new Date(sat.getTime() + 86400000));
            const satOk = casesData[satStr] === 1 || casesData[satStr] === 2;
            const sunOk = casesData[sunStr] === 1 || casesData[sunStr] === 2;
            return satOk && sunOk;
        };
        let weekendOk = true;
        for (let w = 0; w < 4; w++) {
            if (!checkWeekend(w)) { weekendOk = false; break; }
        }
        if (weekendOk) unlock('weekend_warrior');
    }

    // Unstoppable — current streak beats previous best
    if (sortedLengths.length >= 2 && currentStreak > 0) {
        const previousBest = sortedLengths[1] || 0;
        if (currentStreak > previousBest && previousBest > 0) unlock('unstoppable');
    }

    // Climbing — 3 streaks in a row, each longer than the last
    if (lengths.length >= 3) {
        let climbing = true;
        for (let i = lengths.length - 3; i < lengths.length - 1; i++) {
            if (lengths[i] >= lengths[i + 1]) { climbing = false; break; }
        }
        if (climbing) unlock('climbing');
    }

    // ---- PLATINUM ----
    if (bestStreak >= 180) unlock('half_year');
    if (totalCleanDays >= 100) unlock('kept_100');

    // Perfect Month — clean every day of a calendar month
    {
        const today = getTodayDate();
        for (let monthsBack = 0; monthsBack < 24; monthsBack++) {
            const ref = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
            if (ref > today) continue;
            const daysInMon = getDaysInMonth(ref.getMonth(), ref.getFullYear());
            let allClean = true;
            for (let d = 1; d <= daysInMon; d++) {
                const dStr = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (casesData[dStr] !== 1) { allClean = false; break; }
                // Don't count future days in current month
                const cellDate = parseDateStr(dStr);
                if (cellDate > today) { allClean = false; break; }
            }
            if (allClean) { unlock('perfect_month'); break; }
        }
    }

    // Phoenix Rising — Recover from 30+ relapse to 30+ streak
    {
        const dates = getSortedDates();
        let hadRelapse = false;
        for (let i = 0; i < dates.length; i++) {
            if (casesData[dates[i]] === 3) {
                // Check if this is a 30+ day relapse period (consecutive relapse days)
                let relapseLen = 1;
                for (let j = i + 1; j < dates.length; j++) {
                    const dt1 = parseDateStr(dates[j - 1]);
                    const dt2 = parseDateStr(dates[j]);
                    if (Math.round((dt2 - dt1) / 86400000) === 1 && casesData[dates[j]] === 3) relapseLen++;
                    else break;
                }
                if (relapseLen >= 30) hadRelapse = true;
            }
        }
        if (hadRelapse && bestStreak >= 30) unlock('phoenix');
    }

    // Plateau Breaker — broke a 30+ day plateau (current streak > 30 AND previous best was between 30-60 and now streak is significantly higher)
    if (sortedLengths.length >= 2 && currentStreak >= 30) {
        const prevBest = sortedLengths[1] || 0;
        if (prevBest >= 30 && currentStreak > prevBest + 30) unlock('plateau');
    }

    // ---- DIAMOND ----
    if (bestStreak >= 365) unlock('year_one');
    if (totalCleanDays >= 250) unlock('kept_250');

    // Reflective — wrote a note every day for 14 consecutive days
    {
        const noteDates = Object.keys(notesData).filter(d => notesData[d] && notesData[d].trim()).sort();
        if (noteDates.length >= 14) {
            // Check most recent 14-day window
            const today = getTodayDate();
            let reflective = true;
            for (let i = 0; i < 14; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dStr = formatDateStr(d);
                if (!notesData[dStr] || !notesData[dStr].trim()) { reflective = false; break; }
            }
            if (reflective) unlock('reflective');
        }
    }

    // Archivist — tracked for 365 days total (any state)
    if (totalMarks >= 365) unlock('archivist');

    // Persist + toast newly unlocked
    if (newlyUnlocked.length > 0) {
        localStorage.setItem(ACHIEVEMENTS_SEEN_KEY, JSON.stringify([...unlockedAchievements]));
        newlyUnlocked.forEach(id => {
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            if (ach) showToast(`\u2605 ${ach.name} unlocked!`, 'success', 5000);
        });
    }
    return newlyUnlocked;
};

// Feature 45: Auto-suggest tags from note content (keyword → tag)
const getAutoSuggestedTags = (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const suggestions = new Set();
    const existingTags = new Set(extractNoteTags(text).map(t => t.toLowerCase()));
    for (const [keyword, tag] of Object.entries(TAG_KEYWORD_MAP)) {
        if (lower.includes(keyword) && !existingTags.has(tag.toLowerCase())) {
            suggestions.add(tag);
        }
    }
    return [...suggestions];
};

const getBounceBackTimes = () => {
    const dates = getSortedDates();
    const times = [];
    let lastRelapseDate = null;
    for (const d of dates) {
        const state = casesData[d];
        if (state === 1 || state === 2) {
            if (lastRelapseDate) {
                const dt = parseDateStr(d);
                const diff = Math.round((dt - lastRelapseDate) / 86400000);
                times.push(diff);
                lastRelapseDate = null;
            }
        } else if (state === 3) {
            lastRelapseDate = parseDateStr(d);
        }
    }
    return times;
};

const getMonthPercentages = (year) =>
    MONTHS.map((_, mIndex) => {
        const daysInMon = getDaysInMonth(mIndex, year);
        let clean = 0;
        for (let d = 1; d <= daysInMon; d++) {
            const dStr = `${year}-${String(mIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (casesData[dStr] === 1) clean++;
        }
        return daysInMon > 0 ? Math.round((clean / daysInMon) * 100) : 0;
    });

const calculateStatsValues = () => {
    let successCount = 0, failCount = 0, slipCount = 0;
    for (const date in casesData) {
        if (casesData[date] === 1) successCount++;
        else if (casesData[date] === 3) failCount++;
        else if (casesData[date] === 2) slipCount++;
    }

    let currentStreak = 0;
    const todayDate = getTodayDate();
    let checkDate = new Date(todayDate);
    let streakActive = true;
    while (streakActive) {
        const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        const state = casesData[dStr];
        if (dStr === getTodayStr() && !state) { checkDate.setDate(checkDate.getDate() - 1); continue; }
        if (state === 1 || state === 2) { currentStreak++; checkDate.setDate(checkDate.getDate() - 1); }
        else streakActive = false;
    }

    const lengths = getAllStreakLengths();
    const avgStreak = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const sorted = [...lengths].sort((a, b) => a - b);
    const medianStreak = sorted.length > 0
        ? sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)]
        : 0;

    const bounces = getBounceBackTimes();
    const bounceBack = bounces.length > 0 ? bounces.reduce((a, b) => a + b, 0) / bounces.length : 0;
    const streakVsAvg = avgStreak > 0 ? Math.round(((currentStreak - avgStreak) / avgStreak) * 100) : 0;

    let daysSinceRelapse = null;
    const allDatesSorted = getSortedDates().reverse();
    const todayMs = getTodayDate().getTime();
    for (const d of allDatesSorted) {
        if (casesData[d] === 3) {
            const relDate = parseDateStr(d);
            if (relDate) daysSinceRelapse = Math.round((todayMs - relDate.getTime()) / 86400000);
            break;
        }
    }

    let longestGap = 0;
    let currentGap = 0;
    const chrono = getSortedDates();
    for (const d of chrono) {
        if (casesData[d] === 3) {
            if (currentGap > longestGap) longestGap = currentGap;
            currentGap = 0;
        } else if (casesData[d] === 1 || casesData[d] === 2) {
            currentGap++;
        }
    }
    if (currentGap > longestGap) longestGap = currentGap;

    const totalInputs = successCount + slipCount + failCount;
    const cleanRatio = totalInputs > 0 ? Math.round((successCount / totalInputs) * 100) : 0;
    const slipFrequency = slipCount > 0 && successCount > 0 ? Math.round(successCount / slipCount) : 0;

    const getWeekPct = (weekOffset) => {
        let clean = 0, total = 0;
        const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); d.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setDate(end.getDate() + 7);
        const todayDate = getTodayDate();
        while (d < end && d <= todayDate) {
            const ds = formatDateStr(d);
            const st = casesData[ds];
            if (st === 1) clean++;
            if (st === 1 || st === 2 || st === 3) total++;
            d.setDate(d.getDate() + 1);
        }
        return total > 0 ? Math.round((clean / total) * 100) : 0;
    };

    return {
        successCount, failCount, slipCount, currentStreak, totalInputs,
        avgStreak, medianStreak, bounceBack, streakVsAvg,
        daysSinceRelapse, longestGap, cleanRatio, slipFrequency,
        currentWeekPct: getWeekPct(0), lastWeekPct: getWeekPct(-1),
        bestStreak: getBestStreak()
    };
};

// ---- Export / Import ------------------------------------------------------
const exportData = () => {
    const exportObject = {
        cases: casesData,
        notes: notesData,
        mood: moodData,            // Feature 31
        energy: energyData,        // Feature 32
        sleep: sleepData,          // Feature 33
        templates: noteTemplates,  // Feature 35
        achievements: [...unlockedAchievements], // Feature 21
        exportedAt: new Date().toISOString(),
        version: 3
    };
    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_tracker_${currentYear}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archive exported', 'success');
};

const exportCSV = () => {
    const rows = [['date', 'state', 'note']];
    const allDates = new Set([...Object.keys(casesData), ...Object.keys(notesData)]);
    [...allDates].sort().forEach(d => {
        const state = casesData[d] || 0;
        const stateLabel = state === 1 ? 'clean' : state === 2 ? 'slip' : state === 3 ? 'relapse' : 'unmarked';
        const note = (notesData[d] || '').replace(/"/g, '""');
        rows.push([d, stateLabel, note ? `"${note}"` : '']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_tracker_${currentYear}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
};

const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (typeof parsed !== 'object' || parsed === null) {
                showToast('Invalid JSON structure.', 'info');
                return;
            }
            // Snapshot for undo
            undoSnapshot = JSON.parse(JSON.stringify(casesData));
            // v2/v3 format: { cases, notes, mood, energy, sleep, templates, achievements }
            if (parsed.cases || parsed.notes) {
                if (parsed.cases)       Object.assign(casesData, parsed.cases);
                if (parsed.notes)       Object.assign(notesData, parsed.notes);
                if (parsed.mood)        Object.assign(moodData, parsed.mood);
                if (parsed.energy)      Object.assign(energyData, parsed.energy);
                if (parsed.sleep)       Object.assign(sleepData, parsed.sleep);
                if (Array.isArray(parsed.templates)) noteTemplates = [...new Set([...noteTemplates, ...parsed.templates])];
                if (Array.isArray(parsed.achievements)) parsed.achievements.forEach(id => unlockedAchievements.add(id));
            } else {
                // Legacy format — treat top-level object as cases
                Object.assign(casesData, parsed);
            }
            saveData();
            renderCalendar();
            showToast('Archive restored successfully.', 'success');
        } catch (err) {
            showToast('Failed to parse JSON file.', 'info');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

const resetAllData = () => {
    if (!confirm('This will permanently delete ALL marks, notes, ratings, templates, and achievements. Are you sure?')) return;
    if (!confirm('Last warning — this cannot be undone. Continue?')) return;
    casesData = {};
    notesData = {};
    moodData = {};
    energyData = {};
    sleepData = {};
    noteTemplates = [];
    unlockedAchievements = new Set();
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(NOTES_STORAGE_KEY);
    localStorage.removeItem(MOOD_STORAGE_KEY);
    localStorage.removeItem(ENERGY_STORAGE_KEY);
    localStorage.removeItem(SLEEP_STORAGE_KEY);
    localStorage.removeItem(TEMPLATES_STORAGE_KEY);
    localStorage.removeItem(ACHIEVEMENTS_SEEN_KEY);
    localStorage.removeItem(MILESTONES_SEEN_KEY);
    undoSnapshot = null;
    renderCalendar();
    updateStats(true);
    renderSidebarNotes();
    showToast('All data reset.', 'info');
};

// ---- Poster ---------------------------------------------------------------
const getMonthStats = (mIndex) => {
    const daysInMon = getDaysInMonth(mIndex, currentYear);
    let successCount = 0, failCount = 0;
    for (let d = 1; d <= daysInMon; d++) {
        const dStr = `${currentYear}-${String(mIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (casesData[dStr] === 1) successCount++;
        else if (casesData[dStr] === 2 || casesData[dStr] === 3) failCount++;
    }
    return { successCount, failCount, total: successCount + failCount, pct: Math.round((successCount / daysInMon) * 100) };
};

const renderMonthOnCanvas = (pCtx, t, mIndex, baseX, baseY, cellSize, labelWidth, includeNotes) => {
    const monthName = MONTHS[mIndex];
    pCtx.font = `italic 400 ${cellSize * 1.8}px "Instrument Serif", serif`;
    pCtx.fillStyle = t.text;
    pCtx.fillText(monthName, baseX, baseY);
    pCtx.font = `400 ${cellSize * 0.5}px Epilogue, sans-serif`;
    pCtx.fillStyle = t.dim;
    pCtx.textAlign = 'right';
    pCtx.fillText(`NO. ${(mIndex + 1).toString().padStart(2, '0')}`, baseX + labelWidth, baseY);
    pCtx.textAlign = 'left';
    const daysInMonth = getDaysInMonth(mIndex, currentYear);
    const firstDay = getFirstDayOfMonth(mIndex, currentYear);
    const gridYStart = baseY + cellSize * 1.4;
    for (let i = 0; i < 42; i++) {
        const gridRow = Math.floor(i / 7);
        const gridCol = i % 7;
        const cellX = baseX + (gridCol * cellSize) + (cellSize / 2);
        const cellY = gridYStart + (gridRow * cellSize) + (cellSize / 2);
        if (i >= firstDay && i < firstDay + daysInMonth) {
            const dayNum = i - firstDay + 1;
            const dateStr = `${currentYear}-${(mIndex + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            const state = casesData[dateStr] || 0;
            const radius = cellSize * 0.32;
            pCtx.beginPath();
            pCtx.arc(cellX, cellY, radius, 0, Math.PI * 2);
            if (state === 1) pCtx.fillStyle = t.success;
            else if (state === 2) pCtx.fillStyle = getSlipColor();
            else if (state === 3) pCtx.fillStyle = t.fail;
            else pCtx.fillStyle = t.neutral;
            pCtx.fill();
            if (includeNotes && notesData[dateStr]) {
                pCtx.beginPath();
                pCtx.arc(cellX + radius - 3, cellY - radius + 3, radius * 0.3, 0, Math.PI * 2);
                pCtx.fillStyle = (state === 1 || state === 2 || state === 3) ? '#fff' : t.dim;
                pCtx.fill();
            }
        }
    }
};

const exportPoster = (options = {}) => {
    const config = {
        theme: options.theme || 'archival',
        includeStats: options.includeStats !== false,
        includeNotes: options.includeNotes !== false,
        includeLegend: options.includeLegend !== false,
        monthIndex: options.monthIndex !== undefined ? options.monthIndex : -1
    };
    const pCanvas = document.getElementById('poster-canvas');
    if (!pCanvas) return;
    pCanvas.width = 2480;
    pCanvas.height = 3508;
    const pCtx = pCanvas.getContext('2d');
    const themes = {
        archival: { bg: '#181716', text: '#EAE6DF', dim: '#88837C', border: '#2F2E2C', success: '#205E41', fail: '#D64235', neutral: '#242220' },
        gallery:  { bg: '#FFFFFF', text: '#1A1A1A', dim: '#999999', border: '#EEEEEE', success: '#217346', fail: '#A4262C', neutral: '#F3F2F1' },
        solstice: { bg: '#163020', text: '#D4AF37', dim: '#8F9779', border: '#2D4B37', success: '#D4AF37', fail: '#C0392B', neutral: '#1F402B' }
    };
    const t = themes[config.theme] || themes.archival;
    pCtx.fillStyle = t.bg;
    pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
    const noiseCv = document.createElement('canvas');
    noiseCv.width = 100; noiseCv.height = 100;
    const nCtx = noiseCv.getContext('2d');
    for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) {
        if (Math.random() > 0.95) {
            nCtx.fillStyle = config.theme === 'gallery' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
            nCtx.fillRect(i, j, 1, 1);
        }
    }
    pCtx.fillStyle = pCtx.createPattern(noiseCv, 'repeat');
    pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);

    const marginX = 200;
    let cursorY = 300;
    pCtx.font = '500 32px Epilogue, sans-serif';
    pCtx.fillStyle = t.dim;
    pCtx.fillText(config.monthIndex >= 0 ? `${MONTHS[config.monthIndex].toUpperCase()} ${currentYear}` : 'A DAILY RECORD', marginX, cursorY);
    cursorY += 150;
    pCtx.font = 'italic 400 120px "Instrument Serif", serif';
    pCtx.fillStyle = t.dim;
    pCtx.fillText('NO.', marginX, cursorY);
    pCtx.font = '400 400px "Instrument Serif", serif';
    pCtx.fillStyle = t.text;
    pCtx.fillText(currentYear.toString(), marginX + 220, cursorY + 40);
    cursorY += 150;
    pCtx.beginPath();
    pCtx.moveTo(marginX, cursorY);
    pCtx.lineTo(pCanvas.width - marginX, cursorY);
    pCtx.strokeStyle = t.border;
    pCtx.lineWidth = 2;
    pCtx.stroke();
    cursorY += 200;

    if (config.monthIndex >= 0) {
        const mIdx = config.monthIndex;
        const availW = pCanvas.width - marginX * 2;
        const cellSize = Math.min(availW / 8, 120);
        const gridW = cellSize * 7;
        const offsetX = marginX + (availW - gridW) / 2;
        renderMonthOnCanvas(pCtx, t, mIdx, offsetX, cursorY, cellSize, gridW, config.includeNotes);
        if (config.includeStats) {
            const ms = getMonthStats(mIdx);
            cursorY += Math.ceil(42 / 7) * cellSize + cellSize * 2.5;
            pCtx.font = 'italic 400 64px "Instrument Serif", serif';
            pCtx.fillStyle = t.text;
            pCtx.textAlign = 'center';
            pCtx.fillText(`${ms.pct}% COMPLETE`, pCanvas.width / 2, cursorY);
            cursorY += 80;
            pCtx.font = '500 28px Epilogue, sans-serif';
            pCtx.fillStyle = t.dim;
            pCtx.fillText(`${ms.successCount} clean  \u00b7  ${ms.failCount} relapse`, pCanvas.width / 2, cursorY);
            pCtx.textAlign = 'left';
        }
    } else {
        const cols = 3;
        const colSpacing = 120;
        const cw = (pCanvas.width - (marginX * 2) - (colSpacing * (cols - 1))) / cols;
        const cellSize = cw / 7;
        MONTHS.forEach((monthName, mIndex) => {
            const row = Math.floor(mIndex / cols);
            const col = mIndex % cols;
            const mBaseX = marginX + (col * (cw + colSpacing));
            const mBaseY = cursorY + (row * 600);
            renderMonthOnCanvas(pCtx, t, mIndex, mBaseX, mBaseY, cellSize, cw, config.includeNotes);
        });
    }

    if (config.includeLegend) {
        let lx = marginX;
        let ly = pCanvas.height - 300;
        pCtx.font = '500 24px Epilogue, sans-serif';
        pCtx.fillStyle = t.dim;
        pCtx.fillText('LEGEND', lx, ly - 40);
        const items = [
            { label: 'CLEAN',   color: t.success },
            { label: 'SLIP',    color: getSlipColor() },
            { label: 'RELAPSE', color: t.fail },
            { label: 'NEUTRAL', color: t.neutral }
        ];
        items.forEach(item => {
            pCtx.beginPath();
            pCtx.arc(lx + 10, ly + 10, 10, 0, Math.PI * 2);
            pCtx.fillStyle = item.color;
            pCtx.fill();
            pCtx.fillStyle = t.text;
            pCtx.font = '600 20px Epilogue, sans-serif';
            pCtx.fillText(item.label, lx + 40, ly + 18);
            lx += 250;
        });
    }
    if (config.includeStats) {
        const statsValues = calculateStatsValues();
        let sx = pCanvas.width - marginX - 550;
        let sy = pCanvas.height - 450;
        pCtx.font = 'italic 400 60px "Instrument Serif", serif';
        pCtx.fillStyle = t.text;
        pCtx.fillText(`${statsValues.bestStreak} DAYS UNBROKEN`, sx, sy);
        sy += 80;
        pCtx.font = '500 24px Epilogue, sans-serif';
        pCtx.fillStyle = t.dim;
        pCtx.fillText(`TOTAL CLEAN: ${statsValues.successCount}`, sx, sy);
        sy += 40;
        const winRate = statsValues.totalInputs > 0 ? (statsValues.successCount / statsValues.totalInputs * 100).toFixed(1) : '0';
        pCtx.fillText(`SUCCESS RATE: ${winRate}%`, sx, sy);
    }
    pCtx.font = 'italic 400 32px "Instrument Serif", serif';
    pCtx.fillStyle = t.dim;
    pCtx.fillText(`GENERATED ON THE ARCHIVAL RECORD OF ${currentYear}.`, marginX, pCanvas.height - 100);

    pCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const monthSuffix = config.monthIndex >= 0 ? `_${MONTHS[config.monthIndex].toLowerCase()}` : '';
        link.download = `archive_record_${currentYear}${monthSuffix}_${config.theme}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
};

// ---- Day interaction ------------------------------------------------------
const handleDayInteraction = (cell, isPointerDown = false) => {
    if (cell.classList.contains('empty')) return;
    const dateStr = cell.getAttribute('data-date');
    if (!dateStr) return;
    if (isPointerDown && !undoSnapshot) undoSnapshot = JSON.parse(JSON.stringify(casesData));
    const currentState = casesData[dateStr] || 0;
    let newState;
    if (isPointerDown) { newState = (currentState + 1) % 4; dragState = newState; }
    else { if (dragState === null) return; newState = dragState; if (currentState === newState) return; }
    applyStateToCell(cell, dateStr, newState);
    if (isPointerDown && !isDragging) saveData();
};

const applyStateToCell = (cell, dateStr, newState) => {
    if (newState === 0) {
        delete casesData[dateStr];
        cell.classList.remove('success', 'fail', 'slip');
    } else if (newState === 1) {
        casesData[dateStr] = 1;
        cell.classList.remove('fail', 'slip');
        cell.classList.add('success');
    } else if (newState === 2) {
        const prevStr = addDaysToDateStr(dateStr, -1);
        if (prevStr && casesData[prevStr] === 2) {
            // Auto-escalate to relapse if yesterday was also a slip
            casesData[dateStr] = 3;
            cell.classList.remove('success', 'slip');
            cell.classList.add('fail');
        } else {
            casesData[dateStr] = 2;
            cell.classList.remove('success', 'fail');
            cell.classList.add('slip');
        }
    } else if (newState === 3) {
        casesData[dateStr] = 3;
        cell.classList.remove('success', 'slip');
        cell.classList.add('fail');
    }
    cell.classList.remove('animate-pop');
    void cell.offsetWidth; // reflow
    cell.classList.add('animate-pop');
    setTimeout(() => cell.classList.remove('animate-pop'), 500);
};

const getStreakAtDate = (dateStr) => {
    if (casesData[dateStr] !== 1 && casesData[dateStr] !== 2) return 0;
    let count = 0;
    const curr = parseDateStr(dateStr);
    if (!curr) return 0;
    const c = new Date(curr);
    while (true) {
        const s = formatDateStr(c);
        if (casesData[s] === 1 || casesData[s] === 2) {
            count++;
            c.setDate(c.getDate() - 1);
        } else break;
    }
    return count;
};

// ---- Undo -----------------------------------------------------------------
const undoLastAction = () => {
    if (!undoSnapshot) {
        showToast('Nothing to retract.', 'info', 2000);
        return;
    }
    casesData = undoSnapshot;
    undoSnapshot = null;
    saveData();
    renderCalendar();
    showToast('Last action retracted.', 'info', 2000);
};

// ---- Note modal -----------------------------------------------------------
const openNoteModalForDate = (dateStr) => {
    if (!dateStr) return;
    activeNoteDate = dateStr;
    // If a drag is in progress, commit it first so it doesn't get lost
    if (undoSnapshot) {
        undoSnapshot = null;
    }
    const dateObj = parseDateStr(dateStr);
    if (!dateObj || !modalTitle) return;
    modalTitle.textContent = `${MONTHS[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
    if (noteTextarea) noteTextarea.value = notesData[dateStr] || '';
    const dayState = casesData[dateStr] || 0;
    const suggestionsContainer = document.getElementById('note-suggestions');
    if (suggestionsContainer) {
        const pills = (dayState === 2 || dayState === 3) ? TAG_CATEGORIES.relapse : TAG_CATEGORIES.clean;
        suggestionsContainer.innerHTML = pills.map(p =>
            `<button class="suggestion-pill" data-value="${p}" type="button">${p}</button>`
        ).join('');
        suggestionsContainer.querySelectorAll('.suggestion-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const value = pill.getAttribute('data-value');
                const currentText = noteTextarea.value;
                const prefix = (currentText && !currentText.endsWith(' ')) ? ' ' : '';
                noteTextarea.value = currentText + prefix + '#' + value + ' ';
                noteTextarea.focus();
                if (navigator.vibrate) navigator.vibrate(10);
            });
        });
    }
    // Feature 31/32/33: populate rating dots
    renderRatingDots('mood-rating', moodData[dateStr] || 0);
    renderRatingDots('energy-rating', energyData[dateStr] || 0);
    renderRatingDots('sleep-rating', sleepData[dateStr] || 0);
    updateRatingHints(dateStr);
    // Feature 35: render templates list
    renderTemplatesList();
    // Feature 45: clear auto-tag suggestions (recomputed on input)
    renderAutoTagSuggestions('');
    if (noteModal) {
        noteModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    setTimeout(() => noteTextarea && noteTextarea.focus(), 100);
};

const openNoteModal = (cell) => {
    if (!cell || cell.classList.contains('empty')) return;
    openNoteModalForDate(cell.getAttribute('data-date'));
};

const closeNoteModal = () => {
    if (noteModal) noteModal.classList.remove('active');
    activeNoteDate = null;
    if (!document.querySelector('.modal-overlay.active:not(#note-modal)')) {
        document.body.style.overflow = '';
    }
};

const saveNoteModal = () => {
    if (!activeNoteDate) return;
    const val = noteTextarea.value.trim();
    if (val) notesData[activeNoteDate] = val;
    else delete notesData[activeNoteDate];
    // Feature 31/32/33: ratings are saved live as the user clicks them, but ensure empty ratings are removed
    if (!moodData[activeNoteDate])   delete moodData[activeNoteDate];
    if (!energyData[activeNoteDate]) delete energyData[activeNoteDate];
    if (!sleepData[activeNoteDate])  delete sleepData[activeNoteDate];
    saveData();
    closeNoteModal();
    renderSidebarNotes();
};

// ---- Rating dots (Feature 31/32/33) --------------------------------------
const renderRatingDots = (containerId, value) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.textContent = '';
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= 5; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'rating-dot' + (i <= value ? ' filled' : '');
        dot.dataset.value = i;
        dot.setAttribute('role', 'radio');
        dot.setAttribute('aria-checked', i === value ? 'true' : 'false');
        dot.setAttribute('aria-label', `${i} / 5`);
        frag.appendChild(dot);
    }
    container.appendChild(frag);
};

// Delegated handler for rating dots (set up once in attachEventListeners)
const handleRatingDotClick = (e) => {
    const dot = e.target.closest('.rating-dot');
    if (!dot) return;
    const container = dot.closest('.rating-dots');
    if (!container) return;
    const type = container.dataset.type;
    const i = parseInt(dot.dataset.value);
    if (!type || !activeNoteDate) return;
    const current = getRatingForDate(type, activeNoteDate);
    const newVal = current === i ? 0 : i;
    setRatingForDate(type, activeNoteDate, newVal);
    renderRatingDots(container.id, newVal);
    updateRatingHints(activeNoteDate);
    saveData();
    if (navigator.vibrate) navigator.vibrate(10);
};

const getRatingForDate = (type, dateStr) => {
    if (type === 'mood')   return moodData[dateStr] || 0;
    if (type === 'energy') return energyData[dateStr] || 0;
    if (type === 'sleep')  return sleepData[dateStr] || 0;
    return 0;
};

const setRatingForDate = (type, dateStr, value) => {
    if (type === 'mood')   { if (value > 0) moodData[dateStr] = value;   else delete moodData[dateStr]; }
    if (type === 'energy') { if (value > 0) energyData[dateStr] = value; else delete energyData[dateStr]; }
    if (type === 'sleep')  { if (value > 0) sleepData[dateStr] = value;  else delete sleepData[dateStr]; }
};

const updateRatingHints = (dateStr) => {
    const hintLabels = ['\u2014', 'Awful', 'Poor', 'OK', 'Good', 'Great'];
    const setHint = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = hintLabels[value] || '';
    };
    setHint('mood-hint', moodData[dateStr] || 0);
    setHint('energy-hint', energyData[dateStr] || 0);
    setHint('sleep-hint', sleepData[dateStr] || 0);
};

// ---- Note templates (Feature 35) ----------------------------------------
const renderTemplatesList = () => {
    const container = document.getElementById('templates-list');
    if (!container) return;
    container.textContent = '';
    if (noteTemplates.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'templates-empty';
        empty.textContent = 'No templates yet — write a note and click \u201cSave current\u201d.';
        container.appendChild(empty);
        return;
    }
    const frag = document.createDocumentFragment();
    noteTemplates.forEach((tpl, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'template-chip';
        chip.dataset.idx = idx;
        chip.dataset.tpl = tpl;
        const preview = tpl.length > 40 ? tpl.slice(0, 40) + '\u2026' : tpl;
        chip.innerHTML = `<span class="template-chip-text">${preview}</span><span class="template-chip-del" aria-label="Delete template">\u00d7</span>`;
        frag.appendChild(chip);
    });
    container.appendChild(frag);
};

const saveCurrentAsTemplate = () => {
    if (!noteTextarea) return;
    const val = noteTextarea.value.trim();
    if (!val) {
        showToast('Write something first to save as a template.', 'info', 2500);
        return;
    }
    if (noteTemplates.includes(val)) {
        showToast('That template already exists.', 'info', 2500);
        return;
    }
    if (noteTemplates.length >= MAX_TEMPLATES) {
        showToast('Template limit reached (' + MAX_TEMPLATES + '). Delete one to add more.', 'info', 3000);
        return;
    }
    noteTemplates.push(val);
    saveData();
    renderTemplatesList();
    showToast('Template saved.', 'success', 2000);
};

// ---- Auto-tag suggestions (Feature 45) -----------------------------------
const renderAutoTagSuggestions = (text) => {
    const container = document.getElementById('auto-tag-suggestions');
    if (!container) return;
    const suggestions = getAutoSuggestedTags(text);
    if (suggestions.length === 0) {
        container.innerHTML = '';
        container.classList.remove('active');
        return;
    }
    container.classList.add('active');
    container.innerHTML = '<span class="auto-tag-label">Suggested:</span>';
    const frag = document.createDocumentFragment();
    suggestions.forEach(tag => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'auto-tag-chip';
        chip.dataset.tag = tag;
        chip.textContent = '+ ' + tag;
        frag.appendChild(chip);
    });
    container.appendChild(frag);
};

// ---- Overlay helpers ------------------------------------------------------
const overlayEls = {
    stats: statsOverlay,
    achievements: document.getElementById('achievements-overlay'),
    notes: document.getElementById('notes-sidebar'),
    poster: document.getElementById('poster-modal'),
    navStats: document.getElementById('nav-open-stats'),
    navAchievements: document.getElementById('nav-open-achievements')
};

const toggleStatsNavActive = (isActive) => {
    overlayEls.navStats?.classList.toggle('active', isActive);
};

const toggleAchievementsNavActive = (isActive) => {
    overlayEls.navAchievements?.classList.toggle('active', isActive);
};

const updateMobileNavActive = () => {
    const ids = ['bnav-today', 'bnav-stats', 'bnav-note', 'bnav-achievements', 'bnav-poster'];
    ids.forEach(id => document.getElementById(id)?.classList.remove('active'));
    if (overlayEls.stats?.classList.contains('active')) {
        document.getElementById('bnav-stats')?.classList.add('active');
    } else if (overlayEls.notes?.classList.contains('active')) {
        document.getElementById('bnav-note')?.classList.add('active');
    } else if (overlayEls.achievements?.classList.contains('active')) {
        document.getElementById('bnav-achievements')?.classList.add('active');
    } else {
        document.getElementById('bnav-today')?.classList.add('active');
    }
};

const closeStatsOverlay = () => {
    if (overlayEls.stats) overlayEls.stats.classList.remove('active');
    toggleStatsNavActive(false);
    document.body.style.overflow = '';
    updateMobileNavActive();
};

const closeAchievementsOverlay = () => {
    overlayEls.achievements?.classList.remove('active');
    toggleAchievementsNavActive(false);
    document.body.style.overflow = '';
    updateMobileNavActive();
};

const closeNotesSidebar = () => {
    overlayEls.notes?.classList.remove('active');
    document.getElementById('mobile-menu-toggle')?.classList.remove('is-active');
    document.body.style.overflow = '';
    updateMobileNavActive();
};

const closeAllOverlays = () => {
    if (overlayEls.stats) overlayEls.stats.classList.remove('active');
    toggleStatsNavActive(false);
    overlayEls.achievements?.classList.remove('active');
    toggleAchievementsNavActive(false);
    overlayEls.notes?.classList.remove('active');
    if (noteModal) noteModal.classList.remove('active');
    overlayEls.poster?.classList.remove('active');
    document.getElementById('mobile-menu-toggle')?.classList.remove('is-active');
    updateMobileNavActive();
    document.body.style.overflow = '';
    activeNoteDate = null;
};

// ---- Incremental cell update ---------------------------------------------
const updateCalendarCells = () => {
    const todayStr = getTodayStr();
    document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
        const dateStr = cell.getAttribute('data-date');
        if (!dateStr) return;
        const state = casesData[dateStr] || 0;
        const hasNote = !!notesData[dateStr];
        cell.classList.remove('success', 'fail', 'slip', 'milestone', 'mood-1', 'mood-2', 'mood-3', 'mood-4', 'mood-5');
        cell.removeAttribute('data-milestone');
        if (state === 1 || state === 2) {
            const streakCount = getStreakAtDate(dateStr);
            if (state === 1) cell.classList.add('success');
            else cell.classList.add('slip');
            if (MILESTONES[streakCount]) {
                cell.classList.add('milestone');
                cell.setAttribute('data-milestone', MILESTONES[streakCount]);
                markMilestoneSeen(streakCount, true);
            }
        }
        if (state === 3) cell.classList.add('fail');
        cell.classList.toggle('today', dateStr === todayStr);
        // Feature 31: subtle mood tint (only on unmarked or today cells so it doesn't fight the success/fail colors)
        const mood = moodData[dateStr];
        if (mood && (state === 0)) {
            cell.classList.add('mood-' + mood);
        }
        // Update aria-label
        const label = buildCellAriaLabel(dateStr, state, hasNote);
        cell.setAttribute('aria-label', label);

        // Manage note-indicator child element (add/remove as needed)
        const existingIndicator = cell.querySelector('.note-indicator');
        if (hasNote && !existingIndicator) {
            const noteTag = document.createElement('span');
            noteTag.className = 'note-indicator';
            noteTag.setAttribute('aria-hidden', 'true');
            cell.appendChild(noteTag);
        } else if (!hasNote && existingIndicator) {
            existingIndicator.remove();
        }

        // Manage milestone-badge child element for TODAY cells (since ::after is used by the today dot)
        const existingBadge = cell.querySelector('.milestone-badge-today');
        const isMilestone = cell.classList.contains('milestone');
        const isToday = cell.classList.contains('today');
        if (isMilestone && isToday && !existingBadge) {
            const badge = document.createElement('span');
            badge.className = 'milestone-badge-today';
            badge.setAttribute('aria-hidden', 'true');
            badge.textContent = cell.getAttribute('data-milestone') || '';
            cell.appendChild(badge);
        } else if (!(isMilestone && isToday) && existingBadge) {
            existingBadge.remove();
        } else if (existingBadge && isMilestone && isToday) {
            existingBadge.textContent = cell.getAttribute('data-milestone') || '';
        }
    });
};

const buildCellAriaLabel = (dateStr, state, hasNote) => {
    const d = parseDateStr(dateStr);
    if (!d) return '';
    const dateText = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    const stateText = state === 1 ? 'clean' : state === 2 ? 'slip' : state === 3 ? 'relapse' : 'unmarked';
    const noteText = hasNote ? ', has note' : '';
    const ratings = [];
    if (moodData[dateStr])   ratings.push(`mood ${moodData[dateStr]}/5`);
    if (energyData[dateStr]) ratings.push(`energy ${energyData[dateStr]}/5`);
    if (sleepData[dateStr])  ratings.push(`sleep ${sleepData[dateStr]}/5`);
    const ratingText = ratings.length ? `, ${ratings.join(', ')}` : '';
    return `${dateText}, ${stateText}${noteText}${ratingText}`;
};

// ---- Calendar render (uses event delegation) ------------------------------
const renderCalendar = () => {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';
    const todayStr = getTodayStr();
    MONTHS.forEach((monthName, mIndex) => {
        const monthCard = document.createElement('div');
        monthCard.className = 'month-card';
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'month-name';
        titleSpan.textContent = monthName;
        const numSpan = document.createElement('span');
        numSpan.className = 'month-number';
        numSpan.textContent = 'NO. ' + (mIndex + 1).toString().padStart(2, '0');
        const daysInMon = getDaysInMonth(mIndex, currentYear);
        let monthSuccessCount = 0;
        for (let d = 1; d <= daysInMon; d++) {
            const dStr = `${currentYear}-${String(mIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (casesData[dStr] === 1) monthSuccessCount++;
        }
        const pctValue = daysInMon > 0 ? Math.round((monthSuccessCount / daysInMon) * 100) : 0;
        const pctSpan = document.createElement('span');
        pctSpan.className = 'month-pct';
        if (pctValue >= 70) pctSpan.classList.add('high');
        else if (pctValue >= 30) pctSpan.classList.add('mid');
        else if (pctValue > 0) pctSpan.classList.add('low');
        pctSpan.textContent = pctValue + '%';
        const metaContainer = document.createElement('span');
        metaContainer.className = 'month-meta';
        metaContainer.appendChild(pctSpan);
        metaContainer.appendChild(numSpan);
        monthHeader.appendChild(titleSpan);
        monthHeader.appendChild(metaContainer);
        monthCard.appendChild(monthHeader);

        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';
        DAYS_OF_WEEK.forEach(day => {
            const label = document.createElement('div');
            label.className = 'day-label';
            label.textContent = day;
            daysGrid.appendChild(label);
        });

        const firstDay = getFirstDayOfMonth(mIndex, currentYear);
        const totalCells = Math.ceil((firstDay + daysInMon) / 7) * 7;
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            if (i < firstDay || i >= firstDay + daysInMon) {
                cell.classList.add('empty');
            } else {
                const dayNum = i - firstDay + 1;
                const dateStr = `${currentYear}-${String(mIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                cell.setAttribute('data-date', dateStr);
                cell.setAttribute('title', `${monthName} ${dayNum}, ${currentYear}`);
                cell.setAttribute('role', 'button');
                cell.setAttribute('tabindex', '0');
                cell.setAttribute('aria-label', buildCellAriaLabel(dateStr, casesData[dateStr] || 0, !!notesData[dateStr]));
                if (dateStr === todayStr) cell.classList.add('today');
                const state = casesData[dateStr];
                if (state === 1) {
                    cell.classList.add('success');
                    const streakCount = getStreakAtDate(dateStr);
                    if (MILESTONES[streakCount]) {
                        cell.classList.add('milestone');
                        cell.setAttribute('data-milestone', MILESTONES[streakCount]);
                        markMilestoneSeen(streakCount); // silent on initial render
                    }
                }
                if (state === 2) {
                    cell.classList.add('slip');
                    const streakCount = getStreakAtDate(dateStr);
                    if (MILESTONES[streakCount]) {
                        cell.classList.add('milestone');
                        cell.setAttribute('data-milestone', MILESTONES[streakCount]);
                        markMilestoneSeen(streakCount);
                    }
                }
                if (state === 3) cell.classList.add('fail');
                // Day number (as a child span so note-indicator can coexist)
                const numSpan = document.createElement('span');
                numSpan.className = 'day-num';
                numSpan.textContent = dayNum;
                cell.appendChild(numSpan);
                // Note indicator (child element — avoids ::before/::after conflict with milestones)
                if (notesData[dateStr]) {
                    const noteTag = document.createElement('span');
                    noteTag.className = 'note-indicator';
                    noteTag.setAttribute('aria-hidden', 'true');
                    cell.appendChild(noteTag);
                }
                // Milestone badge for TODAY cells (child element, since ::after is taken by today dot)
                if (cell.classList.contains('milestone') && cell.classList.contains('today')) {
                    const badge = document.createElement('span');
                    badge.className = 'milestone-badge-today';
                    badge.setAttribute('aria-hidden', 'true');
                    badge.textContent = cell.getAttribute('data-milestone') || '';
                    cell.appendChild(badge);
                }
            }
            daysGrid.appendChild(cell);
        }
        monthCard.appendChild(daysGrid);
        calendarGrid.appendChild(monthCard);
    });
};

// ---- Event delegation on calendar (cuts ~3000 listeners to 6) ------------
const setupCalendarDelegation = () => {
    if (!calendarGrid) return;
    // Per-cell tap state for double-tap detection
    const cellTapState = new WeakMap();

    const getCellFromEvent = (e) => e.target.closest('.day-cell:not(.empty)');

    const handleTap = (cell) => {
        const now = Date.now();
        const state = cellTapState.get(cell) || { lastTap: 0, pendingSingle: null };
        if (state.pendingSingle) {
            // Second tap within window → cancel single, open note
            clearTimeout(state.pendingSingle);
            state.pendingSingle = null;
            state.lastTap = now;
            cellTapState.set(cell, state);
            openNoteModal(cell);
        } else {
            // First tap — wait to see if a second arrives
            const since = now - state.lastTap;
            state.lastTap = now;
            state.pendingSingle = setTimeout(() => {
                state.pendingSingle = null;
                cellTapState.set(cell, state);
                handleDayInteraction(cell, true);
            }, DOUBLE_TAP_WINDOW);
            cellTapState.set(cell, state);
        }
    };

    calendarGrid.addEventListener('pointerdown', (e) => {
        const cell = getCellFromEvent(e);
        if (!cell) return;
        if (e.pointerType === 'touch') {
            cell._longPressTimer = setTimeout(() => {
                cell._longPressTimer = null;
                cell._isLongPress = true;
                // Cancel any pending single tap
                const state = cellTapState.get(cell);
                if (state && state.pendingSingle) {
                    clearTimeout(state.pendingSingle);
                    state.pendingSingle = null;
                }
                handleDayInteraction(cell, true);
            }, LONG_PRESS_MS);
            return;
        }
        // Mouse — start drag
        isDragging = true;
        dragVisitedCount = 1;
        handleDayInteraction(cell, true);
    });

    calendarGrid.addEventListener('pointerenter', (e) => {
        if (!isDragging || e.pointerType === 'touch') return;
        const cell = getCellFromEvent(e);
        if (cell) { dragVisitedCount++; handleDayInteraction(cell, false); }
    }, true);

    calendarGrid.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'touch') return;
        const cell = getCellFromEvent(e);
        if (cell && cell._longPressTimer) {
            clearTimeout(cell._longPressTimer);
            cell._longPressTimer = null;
        }
    });

    calendarGrid.addEventListener('pointerup', (e) => {
        const cell = getCellFromEvent(e);
        if (!cell) return;
        if (e.pointerType === 'touch') {
            if (cell._longPressTimer) {
                clearTimeout(cell._longPressTimer);
                cell._longPressTimer = null;
            }
            if (cell._isLongPress) {
                cell._isLongPress = false;
                e.preventDefault();
                return;
            }
            handleTap(cell);
        }
    });

    calendarGrid.addEventListener('dblclick', (e) => {
        // Desktop double-click — handled by pointerup tap logic, but keep as fallback
        // for mice that don't generate clean tap timing
        e.preventDefault();
        const cell = getCellFromEvent(e);
        if (cell) openNoteModal(cell);
    });

    // Keyboard support — Enter/Space to cycle, double-Enter to open note
    calendarGrid.addEventListener('keydown', (e) => {
        const cell = e.target.closest('.day-cell:not(.empty)');
        if (!cell) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTap(cell);
        } else if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            openNoteModal(cell);
        }
    });
};

// ---- Stats display --------------------------------------------------------
const padStat = (n) => String(Math.floor(n)).padStart(3, '0');

const animateCountUp = (el, target, duration = 800) => {
    if (!el) return;
    if (target === 0) { el.textContent = padStat(0); return; }
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = padStat(Math.round(progress * target));
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

// ---- Relapse Cycle Length ------------------------------------------------
const getRelapseCycleData = () => {
    const dates = getSortedDates();
    const relapseDates = [];
    let inRelapse = false;
    for (const d of dates) {
        if (casesData[d] === 3) {
            if (!inRelapse) { relapseDates.push(d); inRelapse = true; }
        } else { inRelapse = false; }
    }
    const cycles = [];
    for (let i = 1; i < relapseDates.length; i++) {
        const prev = parseDateStr(relapseDates[i - 1]);
        const curr = parseDateStr(relapseDates[i]);
        const days = prev && curr ? Math.round((curr - prev) / 86400000) : 0;
        if (days > 0) cycles.push(days);
    }
    const avgCycle = cycles.length > 0 ? cycles.reduce((a, b) => a + b, 0) / cycles.length : 0;
    // Trend: first half vs second half
    const mid = Math.max(1, Math.floor(cycles.length / 2));
    const firstHalf = cycles.slice(0, mid);
    const secondHalf = cycles.slice(mid);
    const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    const trend = avgFirst > 0 && avgSecond > 0 ? avgSecond - avgFirst : 0;
    return { avgCycle, cycles, relapseCount: relapseDates.length, trend, avgFirst, avgSecond };
};

const renderRelapseCycles = () => {
    const container = document.getElementById('relapse-cycle-display');
    if (!container) return;
    const data = getRelapseCycleData();
    if (data.relapseCount < 2) {
        container.innerHTML = '<div class="stat-desc">Need at least 2 relapse dates to calculate cycles.</div>';
        return;
    }
    const trendLabel = data.trend > 0 ? '<span class="risk-score-high">LONGER \u2191</span>' : data.trend < 0 ? '<span class="risk-score-low">SHORTER \u2193</span>' : '<span class="risk-score-mid">STEADY \u2192</span>';
    container.innerHTML = `
        <div class="weakest-day-header">
            <span class="weakest-day-value">${data.avgCycle.toFixed(1)}</span>
            <span class="weakest-day-label">avg days between relapses</span>
            <span class="weakest-day-trend">Trend: ${trendLabel}</span>
        </div>
        <div class="stat-desc">Based on ${data.cycles.length} cycle${data.cycles.length !== 1 ? 's' : ''}${data.avgFirst > 0 && data.avgSecond > 0 ? ` &middot; First half: ${data.avgFirst.toFixed(1)}d &middot; Second half: ${data.avgSecond.toFixed(1)}d` : ''}</div>
    `;
};

// ---- Weakest Day of Streak -----------------------------------------------
const getWeakestDayData = () => {
    const dates = getSortedDates();
    const dayCounts = {};
    let streakLen = 0;
    for (const d of dates) {
        const state = casesData[d];
        if (state === 1 || state === 2) {
            streakLen++;
        } else if (state === 3) {
            const day = streakLen + 1;
            dayCounts[day] = (dayCounts[day] || 0) + 1;
            streakLen = 0;
        } else {
            streakLen = 0;
        }
    }
    const entries = Object.entries(dayCounts).sort((a, b) => b[1] - a[1] || parseInt(a[0]) - parseInt(b[0]));
    return {
        frequencies: dayCounts,
        weakestDay: entries.length > 0 ? parseInt(entries[0][0]) : 0,
        weakestCount: entries.length > 0 ? entries[0][1] : 0,
        totalEvents: entries.reduce((sum, [_, c]) => sum + c, 0),
        sorted: entries
    };
};

const renderWeakestDay = () => {
    const container = document.getElementById('weakest-day-chart');
    if (!container) return;
    const data = getWeakestDayData();
    if (data.totalEvents === 0) {
        container.innerHTML = '<div class="stat-desc">No relapse data yet.</div>';
        return;
    }
    const maxCount = Math.max(...Object.values(data.frequencies), 1);
    const topDay = data.weakestDay;
    let html = `<div class="weakest-day-header">
        <span class="weakest-day-value">Day ${topDay}</span>
        <span class="weakest-day-label">most common relapse day (${data.weakestCount}×)</span>
    </div>
    <div class="weakest-day-bars">`;
    data.sorted.slice(0, 10).forEach(([day, count]) => {
        const pct = Math.round((count / maxCount) * 100);
        const isWorst = parseInt(day) === topDay;
        html += `<div class="weakest-bar-row ${isWorst ? 'worst' : ''}">
            <span class="weakest-bar-label">Day ${day}</span>
            <span class="weakest-bar-track"><span class="weakest-bar-fill" style="width:${pct}%"></span></span>
            <span class="weakest-bar-count">×${count}</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
};

// ---- Risk Score Today ----------------------------------------------------
const getRiskScoreData = () => {
    const today = getTodayDate();
    let slips7 = 0, relapses7 = 0, total7 = 0;
    let slips14 = 0, relapses14 = 0;
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = formatDateStr(d);
        const state = casesData[dStr];
        if (i < 7) {
            if (state === 1 || state === 2 || state === 3) total7++;
            if (state === 2) slips7++;
            if (state === 3) relapses7++;
        }
        if (i < 14) {
            if (state === 2) slips14++;
            if (state === 3) relapses14++;
        }
    }
    let risk = 0;
    if (slips7 >= 3) risk += 40;
    else if (slips7 >= 2) risk += 25;
    else if (slips7 >= 1) risk += 10;
    if (relapses7 > 0) risk += 35;
    else if (relapses14 > 0) risk += 15;
    if (total7 > 0) {
        const cleanPct = (total7 - slips7 - relapses7) / total7;
        if (cleanPct < 0.3) risk += 25;
        else if (cleanPct < 0.6) risk += 15;
    }
    risk = Math.min(100, Math.max(0, risk));
    let level = 'low';
    if (risk >= 60) level = 'high';
    else if (risk >= 30) level = 'mid';
    return { risk, level, slips7, relapses7, total7 };
};

const renderRiskScore = () => {
    const container = document.getElementById('risk-score-display');
    if (!container) return;
    const data = getRiskScoreData();
    const levelLabel = data.level === 'high' ? 'HIGH RISK' : data.level === 'mid' ? 'MODERATE' : 'LOW RISK';
    const factors = [];
    if (data.slips7 > 0) factors.push(`${data.slips7} slip${data.slips7 !== 1 ? 's' : ''} in 7d`);
    if (data.relapses7 > 0) factors.push(`${data.relapses7} relapse${data.relapses7 !== 1 ? 's' : ''} in 7d`);
    if (data.total7 > 0) {
        const cleanPct = Math.round(((data.total7 - data.slips7 - data.relapses7) / data.total7) * 100);
        factors.push(`${cleanPct}% clean`);
    }
    container.innerHTML = `
        <div class="weakest-day-header">
            <span class="risk-score-${data.level}">${data.risk}%</span>
            <span class="risk-score-label">${levelLabel}</span>
        </div>
        <div class="stat-desc">${factors.length > 0 ? factors.join(' &middot; ') : 'No recent data. Keep going!'}</div>
    `;
};

const updateStats = (animate = false) => {
    const stats = calculateStatsValues();
    const dayStats = { 0:{s:0,f:0,t:0}, 1:{s:0,f:0,t:0}, 2:{s:0,f:0,t:0}, 3:{s:0,f:0,t:0}, 4:{s:0,f:0,t:0}, 5:{s:0,f:0,t:0}, 6:{s:0,f:0,t:0} };
    const allDates = getSortedDates();
    for (const dStr of allDates) {
        const state = casesData[dStr];
        const dObj = parseDateStr(dStr);
        if (!dObj) continue;
        const dow = dObj.getDay();
        if (state === 1 || state === 2) dayStats[dow].s++;
        else if (state === 3) dayStats[dow].f++;
        if (state === 1 || state === 2 || state === 3) dayStats[dow].t++;
    }

    const updateEl = (el, val) => {
        if (!el) return;
        if (animate) { el.textContent = padStat(0); animateCountUp(el, val); }
        else el.textContent = padStat(val);
    };
    updateEl(streakVal, stats.currentStreak);
    updateEl(successVal, stats.successCount);
    updateEl(failVal, stats.failCount);
    updateEl(bestVal, stats.bestStreak);
    updateEl(streakValLg, stats.currentStreak);
    updateEl(successValLg, stats.successCount);
    updateEl(failValLg, stats.failCount);
    updateEl(bestStreakVal, stats.bestStreak);

    // Feature 22: Level badge in masthead + level display in stats overlay
    renderLevelBadge(stats.bestStreak);
    renderLevelDisplay(stats.bestStreak);
    // Feature 21: Achievements grid
    renderAchievementsGrid();
    // Feature 2: Streak velocity
    renderVelocityDisplay();
    // Feature 5: Streak distribution
    renderDistributionChart();
    // Feature 11: Month comparison
    renderMonthComparison();
    // New: Relapse cycle, weakest day, risk score
    renderRelapseCycles();
    renderWeakestDay();
    renderRiskScore();

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Danger days — bar chart (reference infographic style)
    renderDangerBarChart(dayStats);

    // Time since last relapse
    if (stats.daysSinceRelapse !== null) {
        setText('relapse-since-val', stats.daysSinceRelapse + 'd');
        setText('relapse-since-pill', stats.daysSinceRelapse >= 30 ? 'SOLID' : stats.daysSinceRelapse >= 7 ? 'BUILDING' : 'FRESH');
    } else {
        setText('relapse-since-val', '\u2014');
        setText('relapse-since-pill', 'NO DATA');
    }
    setText('longest-gap-val', stats.longestGap > 0 ? stats.longestGap + 'd' : '\u2014');

    // Weekly trend
    const weekDiff = stats.currentWeekPct - stats.lastWeekPct;
    const weekEl = document.getElementById('weekly-trend-val');
    if (weekEl) {
        weekEl.textContent = (stats.currentWeekPct || stats.lastWeekPct) ? `${weekDiff >= 0 ? '+' : ''}${weekDiff}%` : '\u2014';
        weekEl.style.color = weekDiff >= 0 ? 'var(--color-success)' : 'var(--color-fail)';
    }
    setText('week-this-val', stats.currentWeekPct > 0 ? stats.currentWeekPct + '%' : '\u2014');
    setText('week-last-val', stats.lastWeekPct > 0 ? stats.lastWeekPct + '%' : '\u2014');

    // Triggers
    const triggerCounts = {};
    for (const dateStr in notesData) {
        if (casesData[dateStr] === 2 || casesData[dateStr] === 3) {
            extractNoteTags(notesData[dateStr]).forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
        }
    }
    const sortedTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]);
    const triggerListEl = document.getElementById('trigger-list');
    if (triggerListEl) {
        triggerListEl.innerHTML = '';
        if (sortedTriggers.length === 0) {
            triggerListEl.innerHTML = '<span class="stat-desc">No trigger tags from relapse notes yet</span>';
        } else {
            sortedTriggers.slice(0, 6).forEach(([tag, count]) => {
                const chip = document.createElement('span');
                chip.className = 'trigger-chip';
                chip.textContent = `${tag} \u00d7${count}`;
                triggerListEl.appendChild(chip);
            });
        }
    }

    // Secondary metrics
    const setIfExists = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setIfExists('avg-streak-val', stats.avgStreak > 0 ? stats.avgStreak.toFixed(1) : '\u2014');
    setIfExists('median-streak-val', stats.medianStreak > 0 ? stats.medianStreak.toFixed(1) : '\u2014');
    setIfExists('bounce-back-val', stats.bounceBack > 0 ? stats.bounceBack.toFixed(1) + 'd' : '\u2014');
    setIfExists('slip-val', stats.slipCount);
    const cleanRatioEl = document.getElementById('clean-ratio-val');
    if (cleanRatioEl) cleanRatioEl.textContent = stats.cleanRatio > 0 ? `${stats.cleanRatio}%` : '';
    const slipFreqEl = document.getElementById('slip-freq-val');
    if (slipFreqEl) slipFreqEl.textContent = stats.slipFrequency > 0 ? `1 per ${stats.slipFrequency}d` : '';
    const streakVsAvgEl = document.getElementById('streak-vs-avg');
    if (streakVsAvgEl) {
        if (stats.avgStreak > 0 && stats.currentStreak > 0) {
            const absVal = Math.abs(stats.streakVsAvg);
            streakVsAvgEl.textContent = stats.streakVsAvg >= 0 ? `${absVal}% above` : `${absVal}% below`;
            streakVsAvgEl.style.color = stats.streakVsAvg >= 0 ? 'var(--color-success)' : 'var(--color-fail)';
        } else {
            streakVsAvgEl.textContent = '\u2014';
            streakVsAvgEl.style.color = '';
        }
    }
};

// ---- Feature 22: Level badge rendering (masthead) ------------------------
const renderLevelBadge = (bestStreak) => {
    const badge = document.getElementById('level-badge');
    if (!badge) return;
    const { current, next } = getCurrentLevel(bestStreak);
    if (current.name === 'None') {
        badge.textContent = '';
        badge.classList.remove('has-level');
        badge.removeAttribute('data-level');
        return;
    }
    badge.classList.add('has-level');
    badge.setAttribute('data-level', current.name);
    badge.textContent = current.symbol;
    badge.style.color = current.color;
    badge.style.borderColor = current.color;
    // Full tooltip
    const nextHint = next ? `\u00b7 next: ${next.name} at ${next.threshold}d` : '';
    badge.title = `${current.name} (best streak ${bestStreak}d) ${nextHint}`;
};

// ---- Feature 21: Achievements grid rendering (tier-based) ---------------
const renderAchievementsGrid = () => {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const unlockedCount = ACHIEVEMENTS.filter(a => unlockedAchievements.has(a.id)).length;
    const total = ACHIEVEMENTS.length;

    // Update count pill
    const countPill = document.getElementById('achievement-count-pill');
    if (countPill) countPill.textContent = `${unlockedCount} / ${total}`;

    // Group achievements by tier
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    tierOrder.forEach(tier => {
        const tierAchievements = ACHIEVEMENTS.filter(a => a.tier === tier);
        if (tierAchievements.length === 0) return;
        const tierInfo = ACHIEVEMENT_TIERS[tier];
        const tierUnlocked = tierAchievements.filter(a => unlockedAchievements.has(a.id)).length;

        // Tier header
        const tierHeader = document.createElement('div');
        tierHeader.className = `achievement-tier-header tier-${tier}`;
        tierHeader.innerHTML = `
            <span class="tier-icon" style="background:${tierInfo.gradient}">${tierInfo.name.charAt(0)}</span>
            <span class="tier-name">${tierInfo.name}</span>
            <span class="tier-count">${tierUnlocked} / ${tierAchievements.length}</span>
        `;
        grid.appendChild(tierHeader);

        // Achievement cards
        tierAchievements.forEach(ach => {
            const unlocked = unlockedAchievements.has(ach.id);
            const card = document.createElement('div');
            card.className = `achievement-card tier-${tier}` + (unlocked ? ' unlocked' : ' locked');
            card.setAttribute('title', `${ach.name} \u2014 ${ach.desc}${unlocked ? ' (unlocked)' : ' (locked)'}`);
            const iconBg = unlocked ? tierInfo.gradient : 'var(--border-subtle)';
            const iconColor = unlocked ? '#fff' : 'var(--text-dim)';
            card.innerHTML = `
                <div class="achievement-icon" style="background:${iconBg}; color:${iconColor}" aria-hidden="true">${ach.icon}</div>
                <div class="achievement-meta">
                    <div class="achievement-name">${ach.name}</div>
                    <div class="achievement-desc">${ach.desc}</div>
                </div>
                ${unlocked ? '<span class="achievement-check" aria-hidden="true">\u2713</span>' : ''}
            `;
            grid.appendChild(card);
        });
    });
};



// ---- Danger Days bar chart (reference infographic style) ----------------
const renderDangerBarChart = (dayStats) => {
    const container = document.getElementById('danger-bar-chart');
    if (!container) return;
    container.innerHTML = '';
    const shortNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const days = [];
    for (let i = 0; i < 7; i++) {
        const stat = dayStats[i];
        const risk = stat.t > 0 ? Math.round((stat.f / stat.t) * 100) : 0;
        let level = 'low';
        if (risk >= 60) level = 'high';
        else if (risk >= 30) level = 'mid';
        days.push({ idx: i, risk, level, total: stat.t, fails: stat.f });
    }
    // We want Mon-Sun order for the chart (matches typical calendar layout)
    // Map: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
    const displayOrder = [1, 2, 3, 4, 5, 6, 0];
    const maxRisk = Math.max(...days.map(d => d.risk), 100);
    days.sort((a, b) => b.risk - a.risk);
    const highCount = days.filter(d => d.level === 'high').length;
    const summ = document.getElementById('danger-summary');
    if (summ) {
        summ.textContent = highCount > 0
            ? `${highCount} day${highCount > 1 ? 's' : ''} at high risk \u2014 caution warranted`
            : 'Relapse risk distributed evenly across the week';
    }
    // Render bars in Mon-Sun display order
    displayOrder.forEach(idx => {
        const d = days.find(x => x.idx === idx) || { risk: 0, level: 'low', total: 0, fails: 0 };
        const barCol = document.createElement('div');
        barCol.className = `danger-bar-col level-${d.level}`;
        // Bar height — empty/low days show a small base (5%), active days scale to risk
        const barHeight = d.total > 0 ? Math.max(d.risk, 8) : 5;
        barCol.innerHTML = `
            <div class="danger-bar-track">
                <div class="danger-bar level-${d.level}" style="height:${barHeight}%"></div>
            </div>
            <div class="danger-bar-label">${shortNames[idx]}</div>
            <div class="danger-bar-pct level-${d.level}">${d.total > 0 ? d.risk + '%' : '\u2014'}</div>
        `;
        // Tooltip with raw counts
        barCol.title = d.total > 0
            ? `${shortNames[idx]}: ${d.fails} relapse${d.fails !== 1 ? 's' : ''} / ${d.total} marks (${d.risk}% risk)`
            : `${shortNames[idx]}: no data`;
        container.appendChild(barCol);
    });
};

// ---- Feature 22: Level display in stats overlay -------------------------
const renderLevelDisplay = (bestStreak) => {
    const container = document.getElementById('level-display');
    if (!container) return;
    const { current, next } = getCurrentLevel(bestStreak);
    const progressToNext = next
        ? Math.min(100, Math.round(((bestStreak - current.threshold) / (next.threshold - current.threshold)) * 100))
        : 100;
    let html = `<div class="level-row">
        <span class="level-current" style="color:${current.color}">${current.symbol ? current.symbol + ' \u00b7 ' : ''}${current.name}</span>`;
    if (next) {
        html += `<span class="level-next">\u2192 ${next.name} at ${next.threshold}d</span>`;
    } else {
        html += `<span class="level-next">\u2014 max rank \u2014</span>`;
    }
    html += `</div>`;
    if (next) {
        html += `<div class="level-progress-track"><div class="level-progress-fill" style="width:${progressToNext}%; background:${current.color}"></div></div>`;
        html += `<div class="level-progress-label">${bestStreak} / ${next.threshold}d</div>`;
    }
    container.innerHTML = html;
};

// ---- Feature 2: Velocity display ----------------------------------------
const renderVelocityDisplay = () => {
    const container = document.getElementById('velocity-display');
    if (!container) return;
    const velocity = getStreakVelocity();
    let trend = 'steady';
    let trendLabel = 'Steady';
    if (velocity >= 6)      { trend = 'high';      trendLabel = 'Accelerating'; }
    else if (velocity >= 4) { trend = 'building';  trendLabel = 'Building'; }
    else if (velocity >= 2) { trend = 'steady';    trendLabel = 'Steady'; }
    else if (velocity > 0)  { trend = 'slow';      trendLabel = 'Slow'; }
    else                    { trend = 'stalled';   trendLabel = 'Stalled'; }
    container.innerHTML = `
        <div class="velocity-row">
            <span class="velocity-value ${trend}">${velocity.toFixed(1)}</span>
            <span class="velocity-unit">days / week</span>
            <span class="velocity-trend ${trend}">${trendLabel}</span>
        </div>
        <div class="velocity-desc">Avg clean + slip days per week over the last 4 weeks.</div>
    `;
};

// ---- Feature 5: Streak distribution chart -------------------------------
const renderDistributionChart = () => {
    const container = document.getElementById('distribution-chart');
    if (!container) return;
    const { buckets, total } = getStreakDistribution();
    container.innerHTML = '';
    if (total === 0) {
        container.innerHTML = '<div class="stat-desc">No streaks recorded yet.</div>';
        return;
    }
    const maxCount = Math.max(...Object.values(buckets), 1);
    const bucketOrder = ['1-3', '4-7', '8-14', '15-30', '31+'];
    const bucketLabels = {
        '1-3': '1\u20133 days',
        '4-7': '4\u20137 days',
        '8-14': '8\u201314 days',
        '15-30': '15\u201330 days',
        '31+': '31+ days'
    };
    bucketOrder.forEach(bucket => {
        const count = buckets[bucket];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barWidth = Math.round((count / maxCount) * 100);
        const row = document.createElement('div');
        row.className = 'distribution-row';
        row.innerHTML = `
            <span class="distribution-label">${bucketLabels[bucket]}</span>
            <span class="distribution-bar-track"><span class="distribution-bar-fill" style="width:${barWidth}%"></span></span>
            <span class="distribution-count">${count}</span>
            <span class="distribution-pct">${pct}%</span>
        `;
        container.appendChild(row);
    });
};

// ---- Feature 11: Month comparison rendering -----------------------------
const renderMonthComparison = () => {
    const container = document.getElementById('month-compare-grid');
    if (!container) return;
    const cmp = getMonthComparison();
    const t = cmp.thisMonth;
    const l = cmp.lastMonth;
    const cleanDiff = t.cleanPct - l.cleanPct;
    const slipDiff = t.slip - l.slip;
    const relapseDiff = t.relapse - l.relapse;
    const fmtDiff = (v, suffix = '', invert = false) => {
        if (v === 0) return '<span class="cmp-diff neutral">\u2014</span>';
        const good = invert ? v < 0 : v > 0;
        const cls = good ? 'good' : 'bad';
        const sign = v > 0 ? '+' : '';
        return `<span class="cmp-diff ${cls}">${sign}${v}${suffix}</span>`;
    };
    container.innerHTML = `
        <div class="cmp-col cmp-header"></div>
        <div class="cmp-col cmp-header">${cmp.lastMonthName}</div>
        <div class="cmp-col cmp-header">${cmp.thisMonthName}</div>
        <div class="cmp-col cmp-header">\u0394</div>

        <div class="cmp-col cmp-label">Clean %</div>
        <div class="cmp-col">${l.cleanPct}%</div>
        <div class="cmp-col cmp-emph">${t.cleanPct}%</div>
        <div class="cmp-col">${fmtDiff(cleanDiff, '%')}</div>

        <div class="cmp-col cmp-label">Clean days</div>
        <div class="cmp-col">${l.clean}</div>
        <div class="cmp-col cmp-emph">${t.clean}</div>
        <div class="cmp-col">${fmtDiff(t.clean - l.clean)}</div>

        <div class="cmp-col cmp-label">Slips</div>
        <div class="cmp-col">${l.slip}</div>
        <div class="cmp-col cmp-emph">${t.slip}</div>
        <div class="cmp-col">${fmtDiff(slipDiff, '', true)}</div>

        <div class="cmp-col cmp-label">Relapses</div>
        <div class="cmp-col">${l.relapse}</div>
        <div class="cmp-col cmp-emph">${t.relapse}</div>
        <div class="cmp-col">${fmtDiff(relapseDiff, '', true)}</div>
    `;
};

// ---- Canvas DPI scaling helper -------------------------------------------
const scaleCanvas = (canvas) => {
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = canvas.clientHeight || canvas.height;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    return { ctx, w: cssW, h: cssH };
};

// ---- Sparkline ------------------------------------------------------------
const drawSparkline = () => {
    if (!sparklineCanvas) return;
    const scaled = scaleCanvas(sparklineCanvas);
    if (!scaled) return;
    const { ctx: c, w, h } = scaled;
    c.clearRect(0, 0, w, h);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const lineColor = '#A8A5A0';
    const successColor = isDark ? '#205E41' : '#1E5033';
    const failColor = isDark ? '#D64235' : '#D13426';
    const daysToLookBack = 30;
    const points = [];
    const loopDate = getTodayDate();
    for (let i = 0; i < daysToLookBack; i++) {
        const dStr = formatDateStr(loopDate);
        points.unshift(casesData[dStr] || 0);
        loopDate.setDate(loopDate.getDate() - 1);
    }
    const segmentWidth = w / (daysToLookBack - 1);
    const midY = h / 2;
    c.beginPath();
    c.moveTo(0, midY);
    c.lineTo(w, midY);
    c.strokeStyle = lineColor;
    c.lineWidth = 1;
    c.stroke();
    points.forEach((state, i) => {
        const x = i * segmentWidth;
        let y = midY, radius = 1.5, color = lineColor;
        if (state === 1) { y = midY - 6; color = successColor; radius = 2.5; }
        else if (state === 2) { y = midY - 3; color = getSlipColor(); radius = 2.5; }
        else if (state === 3) { y = midY + 6; color = failColor; radius = 2.5; }
        c.beginPath();
        c.arc(x, y, radius, 0, Math.PI * 2);
        c.fillStyle = color;
        c.fill();
    });
};

// ---- Year trend -----------------------------------------------------------
const drawYearTrend = () => {
    if (!yearTrendCanvas) return;
    const scaled = scaleCanvas(yearTrendCanvas);
    if (!scaled) return;
    const { ctx: c, w, h } = scaled;
    c.clearRect(0, 0, w, h);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const lineColor = '#A8A5A0';
    const fillColor = isDark ? 'rgba(32, 94, 65, 0.15)' : 'rgba(30, 80, 51, 0.15)';
    const successColor = isDark ? '#205E41' : '#1E5033';
    const pcts = getMonthPercentages(currentYear);
    const months = pcts.length;
    if (months < 2) {
        c.fillStyle = lineColor;
        c.font = '12px Epilogue, sans-serif';
        c.textAlign = 'center';
        c.fillText('Need more data', w / 2, h / 2 + 4);
        return;
    }
    const pad = 20;
    const drawW = w - pad * 2;
    const drawH = h - pad * 2;
    const stepX = drawW / (months - 1);
    c.beginPath();
    pcts.forEach((p, i) => {
        const x = pad + i * stepX;
        const y = pad + drawH - (p / 100) * drawH;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    });
    c.strokeStyle = successColor;
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    pcts.forEach((p, i) => {
        const x = pad + i * stepX;
        const y = pad + drawH - (p / 100) * drawH;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        if (i === months - 1) c.lineTo(x, pad + drawH);
    });
    c.lineTo(pad, pad + drawH);
    c.closePath();
    c.fillStyle = fillColor;
    c.fill();
    pcts.forEach((p, i) => {
        const x = pad + i * stepX;
        const y = pad + drawH - (p / 100) * drawH;
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fillStyle = successColor;
        c.fill();
        c.font = '8px Epilogue, sans-serif';
        c.fillStyle = lineColor;
        c.textAlign = 'center';
        c.fillText(MONTHS[i].slice(0, 3), x, h - 4);
    });
};

// ---- Year switcher --------------------------------------------------------
const changeYear = (delta) => {
    const newYear = currentYear + delta;
    if (newYear < 2000 || newYear > 2100) return;
    currentYear = newYear;
    if (currentYearTitle) currentYearTitle.textContent = currentYear;
    document.title = 'The Daily Tracker // ' + currentYear;
    renderCalendar();
    updateStats();
    drawYearTrend();
};

// ---- Jump to today (shared) ----------------------------------------------
const jumpToToday = () => {
    const todayCell = document.querySelector('.day-cell.today');
    if (!todayCell) return;
    todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    todayCell.style.transition = 'box-shadow 0.3s, transform 0.3s';
    todayCell.style.boxShadow = '0 0 0 4px var(--color-today)';
    todayCell.style.transform = 'scale(1.3)';
    setTimeout(() => { todayCell.style.boxShadow = ''; todayCell.style.transform = ''; }, 800);
};

// ---- PWA setup ------------------------------------------------------------
const setupPWA = () => {
    window.addEventListener('online', () => showToast('Back online', 'success'));
    window.addEventListener('offline', () => showToast('Offline — saved locally', 'info'));

    if ('windowControlsOverlay' in navigator) {
        navigator.windowControlsOverlay.addEventListener('geometrychange', () => {});
    }

    // SW update notification
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            showToast('App updated — refresh to load new version.', 'info', 6000);
        });
    }

    updateAppBadge();
};

// ---- Consolidated URL param handling -------------------------------------
const handleURLAction = () => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (!action) return;
    setTimeout(() => {
        switch (action) {
            case 'today':
                jumpToToday();
                break;
            case 'stats':
                if (statsOverlay) {
                    statsOverlay.classList.add('active');
                    toggleStatsNavActive(true);
                    document.body.style.overflow = 'hidden';
                }
                break;
            case 'log': {
                const bnavNote = document.getElementById('bnav-note');
                if (bnavNote) bnavNote.click();
                else {
                    const todayCell = document.querySelector('.day-cell.today');
                    if (todayCell) openNoteModal(todayCell);
                }
                break;
            }
            case 'export':
                exportData();
                break;
        }
        // Clean the URL so the action doesn't fire again on refresh
        if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, 500);
};

// ---- Viewport-based fluid sizing -----------------------------------------
const updateViewportSizing = () => {
    const vw = window.innerWidth;
    const root = document.documentElement;
    if (vw < 360) {
        root.style.setProperty('--cell-gap', '1px');
        root.style.setProperty('--cell-font', '0.5rem');
        root.style.setProperty('--stat-value-size', '1.3rem');
        root.style.setProperty('--hero-size', '2.5rem');
    } else if (vw < 480) {
        root.style.setProperty('--cell-gap', '2px');
        root.style.setProperty('--cell-font', '0.55rem');
        root.style.setProperty('--stat-value-size', '1.4rem');
        root.style.setProperty('--hero-size', '3rem');
    } else if (vw < 600) {
        root.style.setProperty('--cell-gap', '0.15rem');
        root.style.setProperty('--cell-font', '0.6rem');
        root.style.setProperty('--stat-value-size', '1.7rem');
        root.style.setProperty('--hero-size', 'clamp(3rem, 14vw, 4rem)');
    } else if (vw < 900) {
        root.style.setProperty('--cell-gap', '0.2rem');
        root.style.setProperty('--cell-font', Math.min(0.8, Math.max(0.6, 0.6 + (vw - 600) * 0.0008)) + 'rem');
        root.style.setProperty('--stat-value-size', '2.8rem');
        root.style.setProperty('--hero-size', 'clamp(3.5rem, 14vw, 5rem)');
    } else {
        root.style.setProperty('--cell-gap', '0.35rem');
        root.style.setProperty('--cell-font', '0.7rem');
        root.style.setProperty('--stat-value-size', '1.8rem');
        root.style.setProperty('--hero-size', 'clamp(4rem, 14vw, 6rem)');
    }
};

// ---- Animation Intensity Slider ------------------------------------------
const getAnimIntensity = () => {
    const saved = localStorage.getItem('cal_anim_intensity');
    return saved !== null ? Math.min(100, Math.max(0, parseInt(saved))) : 100;
};

const setAnimIntensity = (val) => {
    val = Math.min(100, Math.max(0, val));
    localStorage.setItem('cal_anim_intensity', val);
    const ratio = val / 100;
    document.documentElement.style.setProperty('--anim-duration-base', (ratio * 0.4) + 's');
    const label = document.getElementById('anim-intensity-label');
    if (label) label.textContent = val + '%';
    if (val === 0) {
        document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
        document.documentElement.removeAttribute('data-reduced-motion');
    }
};

const initAnimIntensity = () => {
    const slider = document.getElementById('anim-intensity-slider');
    if (!slider) return;
    const val = getAnimIntensity();
    slider.value = val;
    setAnimIntensity(val);
    slider.addEventListener('input', (e) => setAnimIntensity(parseInt(e.target.value)));
};

// ---- Collapsible stats sections on mobile (Feature 3) --------------------
const setupStatsCollapsible = () => {
    const panel = document.querySelector('.stats-panel');
    if (!panel) return;
    const toggleSection = (section) => {
        if (window.innerWidth > 900) return;
        section.classList.toggle('collapsed');
        if (navigator.vibrate) navigator.vibrate(8);
    };
    // Remove old listener if any, then add delegated click
    panel.removeEventListener('click', panel._collapsibleHandler);
    panel._collapsibleHandler = (e) => {
        const header = e.target.closest('.stats-section .section-header');
        if (!header) return;
        const section = header.closest('.stats-section');
        if (section) toggleSection(section);
    };
    panel.addEventListener('click', panel._collapsibleHandler);
    // Collapse all but first 2 on mobile
    if (window.innerWidth <= 900) {
        const sections = panel.querySelectorAll('.stats-section');
        sections.forEach((section, i) => {
            if (i >= 2) section.classList.add('collapsed');
            else section.classList.remove('collapsed');
        });
    }
};

const init = () => {
    updateViewportSizing();
    loadTheme();
    currentYearTitle.textContent = currentYear;
    document.title = 'The Daily Tracker // ' + currentYear;
    loadData();
    renderCalendar();
    updateStats(true);
    renderSidebarNotes();
    setupCalendarDelegation();
    attachEventListeners();
    handleURLAction();
    (window.requestIdleCallback || setTimeout)(drawSparkline, 100);
    (window.requestIdleCallback || setTimeout)(drawYearTrend, 100);
    setupAutocomplete();
    setupPWA();
    setupStatsCollapsible();
    initAnimIntensity();
    updateMobileNavActive();
    // Refresh sizing on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateViewportSizing, 80);
    });

    // Refresh "today" if the app was left open past midnight
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            updateCalendarCells();
            updateStats();
        }
    });
};

// ---- Event listeners ------------------------------------------------------
const attachEventListeners = () => {
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importFile) importFile.addEventListener('change', importData);
    document.getElementById('undo-btn')?.addEventListener('click', undoLastAction);
    document.getElementById('csv-export-btn')?.addEventListener('click', exportCSV);
    document.getElementById('reset-data-btn')?.addEventListener('click', resetAllData);
    document.getElementById('year-prev-btn')?.addEventListener('click', () => changeYear(-1));
    document.getElementById('year-next-btn')?.addEventListener('click', () => changeYear(1));

    // Global keyboard — guard against typing in inputs
    document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT' || e.target.isContentEditable) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoLastAction();
        } else if (e.key === 'Escape') {
            closeAllOverlays();
        } else if (e.key === 't' || e.key === 'T') {
            jumpToToday();
        }
    });

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNoteModal);
    if (modalSaveBtn) modalSaveBtn.addEventListener('click', saveNoteModal);

    // Feature 35: Save-as-template button
    document.getElementById('save-template-btn')?.addEventListener('click', saveCurrentAsTemplate);

    // Delegated rating dot clicks (in note modal)
    document.querySelectorAll('.rating-dots').forEach(container => {
        container.addEventListener('click', handleRatingDotClick);
    });

    // Delegated auto-tag chip clicks
    document.getElementById('auto-tag-suggestions')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.auto-tag-chip');
        if (!chip) return;
        const tag = chip.dataset.tag;
        if (!tag || !noteTextarea) return;
        const cur = noteTextarea.value;
        const prefix = (cur && !cur.endsWith(' ')) ? ' ' : '';
        noteTextarea.value = cur + prefix + tag + ' ';
        noteTextarea.focus();
        renderAutoTagSuggestions(noteTextarea.value);
        if (navigator.vibrate) navigator.vibrate(10);
    });

    // Delegated template chip clicks
    document.getElementById('templates-list')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.template-chip');
        if (!chip) return;
        const idx = parseInt(chip.dataset.idx);
        const tpl = chip.dataset.tpl;
        if (isNaN(idx) || !tpl) return;
        if (e.target.classList.contains('template-chip-del')) {
            noteTemplates.splice(idx, 1);
            saveData();
            renderTemplatesList();
            return;
        }
        if (noteTextarea) {
            const cur = noteTextarea.value;
            const prefix = (cur && !cur.endsWith(' ')) ? ' ' : '';
            noteTextarea.value = cur + prefix + tpl + ' ';
            noteTextarea.focus();
            if (navigator.vibrate) navigator.vibrate(10);
        }
    });

    // Feature 45: Auto-tag suggestions as the user types
    if (noteTextarea) {
        noteTextarea.addEventListener('input', () => {
            renderAutoTagSuggestions(noteTextarea.value);
        });
    }

    // Close modals on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target !== overlay) return;
            if (overlay.id === 'note-modal') closeNoteModal();
            else if (overlay.id === 'stats-overlay') closeStatsOverlay();
            else if (overlay.id === 'achievements-overlay') closeAchievementsOverlay();
            else if (overlay.id === 'poster-modal') { overlay.classList.remove('active'); document.body.style.overflow = ''; }
        });
    });

    document.getElementById('stats-x-close')?.addEventListener('click', closeStatsOverlay);
    document.getElementById('achievements-x-close')?.addEventListener('click', closeAchievementsOverlay);
    document.getElementById('notes-x-close')?.addEventListener('click', closeNotesSidebar);

    // Click sidebar backdrop to close (mobile) — clicks on the sidebar element itself
    document.getElementById('notes-sidebar')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeNotesSidebar();
    });

    // Mobile hamburger → toggle notes sidebar (like a native drawer toggle)
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('notes-sidebar');
            if (sidebar) {
                if (sidebar.classList.contains('active')) {
                    closeNotesSidebar();
                } else {
                    closeAllOverlays();
                    sidebar.classList.add('active');
                    mobileToggle.classList.add('is-active');
                    document.body.style.overflow = 'hidden';
                    updateMobileNavActive();
                    if (navigator.vibrate) navigator.vibrate(20);
                }
            }
        });
    }

    // Sidebar tools
    const sidebarSearch = document.getElementById('sidebar-search');
    const sidebarTagRail = document.getElementById('sidebar-tag-rail');
    const sidebarClearFilters = document.getElementById('sidebar-clear-filters');
    const sidebarDateFrom = document.getElementById('sidebar-date-from');
    const sidebarDateTo = document.getElementById('sidebar-date-to');
    const sidebarNotesList = document.getElementById('sidebar-notes-list');
    sidebarSearch?.addEventListener('input', (e) => { notesSearchQuery = e.target.value; renderSidebarNotes(); });
    sidebarTagRail?.addEventListener('click', (e) => {
        const chip = e.target.closest('.sidebar-tag-chip');
        if (!chip) return;
        activeNotesTag = chip.dataset.tag || 'all';
        renderSidebarNotes();
    });
    sidebarNotesList?.addEventListener('click', (e) => {
        const card = e.target.closest('.sidebar-note-card');
        if (!card) return;
        const dateStr = card.dataset.date;
        if (!dateStr) return;
        const cell = document.querySelector('.day-cell[data-date="' + dateStr + '"]');
        if (cell) {
            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => openNoteModalForDate(dateStr), 400);
        }
    });
    sidebarDateFrom?.addEventListener('change', (e) => { notesDateFrom = e.target.value; renderSidebarNotes(); });
    sidebarDateTo?.addEventListener('change', (e) => { notesDateTo = e.target.value; renderSidebarNotes(); });
    sidebarClearFilters?.addEventListener('click', () => {
        notesSearchQuery = ''; activeNotesTag = 'all'; notesDateFrom = ''; notesDateTo = '';
        if (sidebarSearch) sidebarSearch.value = '';
        if (sidebarDateFrom) sidebarDateFrom.value = '';
        if (sidebarDateTo) sidebarDateTo.value = '';
        renderSidebarNotes();
    });

    const sidebarWriteBtn = document.getElementById('sidebar-write-btn');
    sidebarWriteBtn?.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(20);
        closeAllOverlays();
        openNoteModalForDate(getTodayStr());
    });

    // Desktop nav
    document.getElementById('nav-jump-today')?.addEventListener('click', jumpToToday);
    document.getElementById('nav-open-stats')?.addEventListener('click', () => {
        if (statsOverlay && statsOverlay.classList.contains('active')) { closeStatsOverlay(); return; }
        closeAllOverlays();
        if (statsOverlay) {
            statsOverlay.classList.add('active');
            toggleStatsNavActive(true);
            updateMobileNavActive();
            if (navigator.vibrate) navigator.vibrate(20);
            document.body.style.overflow = 'hidden';
            drawSparkline();
            drawYearTrend();
            setupStatsCollapsible();
        }
    });
    document.getElementById('nav-open-achievements')?.addEventListener('click', () => {
        const overlay = document.getElementById('achievements-overlay');
        if (overlay && overlay.classList.contains('active')) { closeAchievementsOverlay(); return; }
        closeAllOverlays();
        if (overlay) {
            overlay.classList.add('active');
            toggleAchievementsNavActive(true);
            updateMobileNavActive();
            if (navigator.vibrate) navigator.vibrate(20);
            document.body.style.overflow = 'hidden';
            renderAchievementsGrid();
        }
    });
    document.getElementById('nav-toggle-notes')?.addEventListener('click', () => {
        document.getElementById('notes-sidebar')?.classList.toggle('active');
        updateMobileNavActive();
    });
    document.getElementById('nav-theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('nav-export-poster')?.addEventListener('click', (e) => { e.preventDefault(); posterConfig.openModal(); });

    // Poster config
    const setupPosterConfig = () => {
        const modal = document.getElementById('poster-modal');
        const xBtn = document.getElementById('poster-x-close');
        const generateBtn = document.getElementById('poster-generate-btn');
        const previewCard = document.getElementById('poster-preview-card');
        const includeStatsCheck = document.getElementById('config-include-stats');
        const includeNotesCheck = document.getElementById('config-include-notes');
        const includeLegendCheck = document.getElementById('config-include-legend');
        const monthSelect = document.getElementById('config-month-select');
        const themeSegments = document.querySelectorAll('#config-theme-segments .segment-btn');
        let currentTheme = 'archival';
        if (monthSelect) monthSelect.value = String(new Date().getMonth());
        const updatePreview = () => {
            if (previewCard && includeStatsCheck) previewCard.classList.toggle('config-include-stats-hidden', !includeStatsCheck.checked);
            if (previewCard) {
                previewCard.classList.remove('theme-gallery', 'theme-solstice');
                if (currentTheme === 'gallery') previewCard.classList.add('theme-gallery');
                if (currentTheme === 'solstice') previewCard.classList.add('theme-solstice');
            }
        };
        const openModal = () => {
            if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
            updatePreview();
        };
        const closeModal = () => { if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } };
        xBtn?.addEventListener('click', closeModal);
        themeSegments.forEach(btn => {
            btn.addEventListener('click', () => {
                themeSegments.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTheme = btn.dataset.value;
                updatePreview();
            });
        });
        [includeStatsCheck, includeNotesCheck, includeLegendCheck].forEach(chk => {
            if (chk) chk.addEventListener('change', updatePreview);
        });
        generateBtn?.addEventListener('click', () => {
            const monthIndex = monthSelect ? parseInt(monthSelect.value) : -1;
            const options = {
                theme: currentTheme,
                includeStats: includeStatsCheck?.checked,
                includeNotes: includeNotesCheck?.checked,
                includeLegend: includeLegendCheck?.checked,
                monthIndex
            };
            if (generateBtn) { generateBtn.textContent = 'GENERATING...'; generateBtn.disabled = true; }
            setTimeout(() => {
                exportPoster(options);
                if (generateBtn) { generateBtn.textContent = 'Generate & Download'; generateBtn.disabled = false; }
                closeModal();
            }, 500);
        });
        return { openModal };
    };
    const posterConfig = setupPosterConfig();

    document.getElementById('share-btn')?.addEventListener('click', (e) => { e.preventDefault(); posterConfig.openModal(); });

    // Mobile nav
    document.getElementById('bnav-today')?.addEventListener('click', () => { jumpToToday(); updateMobileNavActive(); });
    document.getElementById('bnav-stats')?.addEventListener('click', () => {
        if (statsOverlay && statsOverlay.classList.contains('active')) { closeStatsOverlay(); return; }
        closeAllOverlays();
        if (statsOverlay) {
            statsOverlay.classList.add('active');
            toggleStatsNavActive(true);
            updateMobileNavActive();
            if (navigator.vibrate) navigator.vibrate(20);
            document.body.style.overflow = 'hidden';
            drawSparkline();
            drawYearTrend();
            setupStatsCollapsible();
        }
    });
    document.getElementById('bnav-achievements')?.addEventListener('click', () => {
        const overlay = document.getElementById('achievements-overlay');
        if (overlay && overlay.classList.contains('active')) { closeAchievementsOverlay(); return; }
        closeAllOverlays();
        if (overlay) {
            overlay.classList.add('active');
            toggleAchievementsNavActive(true);
            updateMobileNavActive();
            if (navigator.vibrate) navigator.vibrate(20);
            document.body.style.overflow = 'hidden';
            renderAchievementsGrid();
        }
    });
    document.getElementById('bnav-note')?.addEventListener('click', () => {
        closeAllOverlays();
        const sidebar = document.getElementById('notes-sidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            document.getElementById('mobile-menu-toggle')?.classList.add('is-active');
            updateMobileNavActive();
            if (navigator.vibrate) navigator.vibrate(20);
            document.body.style.overflow = 'hidden';
        }
    });
    document.getElementById('bnav-poster')?.addEventListener('click', (e) => { e.preventDefault(); posterConfig.openModal(); });

    // Drag end
    document.addEventListener('pointerup', () => {
        if (isDragging) {
            isDragging = false;
            dragState = null;
            dragVisitedCount = 0;
            saveData();
        }
    });
    document.addEventListener('pointercancel', () => {
        isDragging = false; dragState = null; dragVisitedCount = 0;
    });

    // Ripple effect on nav items
    const addRipple = (e) => {
        const btn = e.currentTarget;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
        const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    };
    document.querySelectorAll('.float-nav-item').forEach(el => {
        el.addEventListener('pointerdown', addRipple);
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

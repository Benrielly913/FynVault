let allData = JSON.parse(localStorage.getItem('fynVault')) || {};
let selectedDate = new Date().toISOString().split('T')[0];
let currentSelectedCat = '🍔';
let currency = localStorage.getItem('fynVaultCurrency') || 'INR';
let editingIndex = null;
let exportType = 'pdf'; // Current format selected

const currencySymbols = { 'USD': '$', 'INR': '₹' };

window.onload = () => {
    checkDailyReset();
    const savedTheme = localStorage.getItem('fynVaultTheme') || 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    document.getElementById('currencySelector').value = currency;
    
    initSwipe('swipe-expense', saveNewExpense);
    initSwipe('swipe-budget', saveNewBudget);
    initSwipe('swipe-saving', saveNewSaving);
    
    updateUI();
};

// --- Feature: Daily Reset ---
function checkDailyReset() {
    const lastLogin = localStorage.getItem('fynVaultLastDate');
    const today = new Date().toISOString().split('T')[0];
    if (lastLogin && lastLogin !== today) {
        if (!allData[today]) allData[today] = { budget: 0, items: [], savings: 0 };
    }
    localStorage.setItem('fynVaultLastDate', today);
    localStorage.setItem('fynVault', JSON.stringify(allData));
}

// --- Feature: Swipe to Confirm ---
function initSwipe(id, callback) {
    const container = document.getElementById(id);
    const handle = container.querySelector('.swipe-handle');
    let isDragging = false, startX = 0;

    const onStart = (e) => {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        handle.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        let delta = currentX - startX;
        const max = container.offsetWidth - handle.offsetWidth - 10;
        if (delta < 0) delta = 0;
        if (delta > max) delta = max;
        handle.style.transform = `translateX(${delta}px)`;
        if (delta >= max) {
            isDragging = false;
            handle.style.transform = `translateX(${max}px)`;
            setTimeout(() => { resetSwipe(handle); callback(); }, 200);
        }
    };

    const onEnd = () => { isDragging = false; resetSwipe(handle); };
    const resetSwipe = (el) => { el.style.transition = '0.3s'; el.style.transform = 'translateX(0px)'; };

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
}

// --- Feature: Export Logic (Range Based) ---
function openExportRange(type) {
    exportType = type;
    document.getElementById('exportModalTitle').innerText = `Export as ${type.toUpperCase()}`;
    openModal('exportRangeModal');
}

function executeExport(range) {
    const filteredData = [];
    const now = new Date();
    
    for (const date in allData) {
        const entryDate = new Date(date);
        const diffDays = (now - entryDate) / (1000 * 60 * 60 * 24);
        
        let include = false;
        if (range === 'today' && date === selectedDate) include = true;
        else if (range === 'week' && diffDays <= 7) include = true;
        else if (range === 'month' && diffDays <= 30) include = true;

        if (include) {
            const day = allData[date];
            if (day.items) {
                day.items.forEach(i => filteredData.push({ Date: date, Details: i.where, Amount: i.amt.toFixed(2), Type: 'Expense' }));
            }
            if (day.savings > 0) {
                filteredData.push({ Date: date, Details: 'Savings', Amount: day.savings.toFixed(2), Type: 'Saving' });
            }
        }
    }

    if (exportType === 'pdf') {
        let html = `<h1>FynVault Report (${range})</h1><table border="1" style="width:100%; border-collapse:collapse;"><tr><th>Date</th><th>Details</th><th>Amount</th></tr>`;
        filteredData.forEach(r => html += `<tr><td>${r.Date}</td><td>${r.Details}</td><td>${currencySymbols[currency]}${r.Amount}</td></tr>`);
        html += `</table>`;
        html2pdf().from(html).save(`FynVault_${range}.pdf`);
    } else {
        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `FynVault_${range}.xlsx`);
    }
    closeModal('exportRangeModal');
}

// --- Feature: Modify & Action Sheet ---
function openActionSheet(index) {
    editingIndex = index;
    const item = allData[selectedDate].items[index];
    document.getElementById('modifyOption').style.display = item.edited ? 'none' : 'flex';
    document.getElementById('actionSheet').classList.add('active');
}

function closeActionSheet() { document.getElementById('actionSheet').classList.remove('active'); editingIndex = null; }

function deleteExpense() {
    if (confirm("Delete this expense?")) {
        allData[selectedDate].items.splice(editingIndex, 1);
        updateUI(); closeActionSheet();
    }
}

function prepareModify() {
    const item = allData[selectedDate].items[editingIndex];
    document.getElementById('modalWhere').value = item.where.split(' ').slice(1).join(' ');
    document.getElementById('modalAmt').value = item.amt;
    document.getElementById('expenseModalTitle').innerText = "Modify Expense";
    closeActionSheet(); openModal('expenseModal');
}

function updateUI() {
    const dayData = allData[selectedDate] || { budget: 0, items: [], savings: 0 };
    const historyDiv = document.getElementById('history');
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    
    document.getElementById('dateText').innerText = new Date(selectedDate).toLocaleDateString(undefined, {day:'numeric', month:'short'});
    
    let totalSpent = 0;
    historyDiv.innerHTML = "";

    if (dayData.items) {
        dayData.items.forEach((item, idx) => {
            totalSpent += parseFloat(item.amt);
            if (item.where.toLowerCase().includes(searchVal)) {
                historyDiv.innerHTML += `
                    <div class="expense-tile" onclick="openActionSheet(${idx})">
                        <div class="tile-left">
                            <div class="tile-icon">${item.where.split(' ')[0]}</div>
                            <div class="tile-name">${item.where.split(' ').slice(1).join(' ')} ${item.edited ? '<span class="modified-tag">(edited)</span>' : ''}</div>
                        </div>
                        <div class="tile-amt">-${currencySymbols[currency]}${parseFloat(item.amt).toFixed(2)}</div>
                    </div>`;
            }
        });
    }

    let totalSavings = 0;
    for (let d in allData) totalSavings += (allData[d].savings || 0);

    document.getElementById('totalBudgetAmount').innerText = currencySymbols[currency] + (dayData.budget || 0).toFixed(2);
    document.getElementById('totalSavingAmount').innerText = currencySymbols[currency] + totalSavings.toFixed(2);
    document.getElementById('statSpent').innerText = currencySymbols[currency] + totalSpent.toFixed(2);

    const perc = dayData.budget > 0 ? (totalSpent / dayData.budget) * 100 : 0;
    document.getElementById('progressBar').style.width = Math.min(perc, 100) + "%";
    localStorage.setItem('fynVault', JSON.stringify(allData));
}

// Confirmation functions called by Swipers
function saveNewExpense() {
    const w = document.getElementById('modalWhere').value || "Expense";
    const a = document.getElementById('modalAmt').value;
    if (!a) return;
    if (!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
    
    if (editingIndex !== null) {
        allData[selectedDate].items[editingIndex] = { where: `${currentSelectedCat} ${w}`, amt: parseFloat(a), edited: true };
    } else {
        allData[selectedDate].items.unshift({ where: `${currentSelectedCat} ${w}`, amt: parseFloat(a), edited: false });
    }
    updateUI(); closeModal('expenseModal');
}

function saveNewBudget() {
    const val = document.getElementById('modalBudgetField').value;
    if (val > 0) {
        if (!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
        allData[selectedDate].budget = parseFloat(val);
        updateUI(); closeModal('budgetModal');
    }
}

function saveNewSaving() {
    const val = document.getElementById('modalSavingField').value;
    if (val > 0) {
        if (!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
        allData[selectedDate].savings = (allData[selectedDate].savings || 0) + parseFloat(val);
        updateUI(); closeModal('addSavingModal');
    }
}

// Standard UI Utils
function openExpenseModal() { editingIndex = null; document.getElementById('modalWhere').value = ""; document.getElementById('modalAmt').value = ""; document.getElementById('expenseModalTitle').innerText = "Add Expense"; openModal('expenseModal'); }
function handleDateChange(date) { selectedDate = date; updateUI(); }
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function showPage(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function selectCat(emoji, el) { currentSelectedCat = emoji; document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('selected')); el.classList.add('selected'); }
function toggleTheme() { const isDark = document.body.classList.toggle('dark-theme'); localStorage.setItem('fynVaultTheme', isDark ? 'dark' : 'light'); }
function changeCurrency() { currency = document.getElementById('currencySelector').value; localStorage.setItem('fynVaultCurrency', currency); updateUI(); }
function clearAllData() { if (confirm("Clear all?")) { localStorage.clear(); location.reload(); } }
function showSavingsHistory() {
    const list = document.getElementById('savingsHistoryList');
    list.innerHTML = "";
    for (let date in allData) {
        if (allData[date].savings > 0) {
            list.innerHTML += `<div class="expense-tile"><div class="tile-left"><div class="tile-name">${date}</div></div><div class="tile-amt" style="color:var(--accent)">+${currencySymbols[currency]}${allData[date].savings}</div></div>`;
        }
    }
}

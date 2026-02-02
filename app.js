let allData = JSON.parse(localStorage.getItem('fynVault')) || {};
let selectedDate = new Date().toISOString().split('T')[0];
let currentSelectedCat = '🍔';
let currency = localStorage.getItem('fynVaultCurrency') || 'INR';
let editingIndex = null;
let currentExportFormat = 'pdf';

const currencySymbols = { 'USD': '$', 'INR': '₹' };

window.onload = () => {
    checkDailyReset();
    const savedTheme = localStorage.getItem('fynVaultTheme') || 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    document.getElementById('currencySelector').value = currency;
    document.getElementById('searchInput').addEventListener('input', updateUI);
    updateUI();
};

function checkDailyReset() {
    const lastLogin = localStorage.getItem('fynVaultLastDate');
    const today = new Date().toISOString().split('T')[0];
    if (lastLogin && lastLogin !== today) {
        if (!allData[today]) allData[today] = { budget: 0, items: [], savings: 0 };
    }
    localStorage.setItem('fynVaultLastDate', today);
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
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span>${item.where.split(' ')[0]}</span>
                            <span style="font-weight:700;">${item.where.split(' ').slice(1).join(' ')} ${item.edited ? '<small style="opacity:0.4; font-style:italic;">(edited)</small>' : ''}</span>
                        </div>
                        <span style="font-weight:800; color:var(--danger)">-${currencySymbols[currency]}${parseFloat(item.amt).toFixed(2)}</span>
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

// Export Logic
function openExportRange(format) { currentExportFormat = format; openModal('exportRangeModal'); }

function executeExport(range) {
    const report = [];
    const now = new Date();
    for (let d in allData) {
        const entryDate = new Date(d);
        const diff = (now - entryDate) / (1000 * 60 * 60 * 24);
        let include = (range === 'today' && d === selectedDate) || (range === 'week' && diff <= 7) || (range === 'month' && diff <= 30);
        if (include && allData[d].items) {
            allData[d].items.forEach(i => report.push({ Date: d, Item: i.where, Amount: i.amt }));
        }
    }

    if (currentExportFormat === 'pdf') {
        let html = `<h2>Report (${range})</h2><table border="1" style="width:100%"><tr><th>Date</th><th>Item</th><th>Amount</th></tr>`;
        report.forEach(r => html += `<tr><td>${r.Date}</td><td>${r.Item}</td><td>${r.Amount}</td></tr>`);
        html2pdf().from(html + "</table>").save(`FynVault_${range}.pdf`);
    } else {
        const ws = XLSX.utils.json_to_sheet(report);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `FynVault_${range}.xlsx`);
    }
    closeModal('exportRangeModal');
}

// Action Sheet & Modal Utils
function openActionSheet(index) { editingIndex = index; document.getElementById('modifyOption').style.display = allData[selectedDate].items[index].edited ? 'none' : 'block'; openModal('actionSheet'); }
function prepareModify() { const item = allData[selectedDate].items[editingIndex]; document.getElementById('modalWhere').value = item.where.split(' ').slice(1).join(' '); document.getElementById('modalAmt').value = item.amt; closeModal('actionSheet'); openModal('expenseModal'); }
function deleteExpense() { if (confirm("Delete?")) { allData[selectedDate].items.splice(editingIndex, 1); updateUI(); closeModal('actionSheet'); } }
function saveNewExpense() {
    const w = document.getElementById('modalWhere').value || "Expense", a = document.getElementById('modalAmt').value;
    if (!a) return;
    if (!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
    if (editingIndex !== null) allData[selectedDate].items[editingIndex] = { where: `${currentSelectedCat} ${w}`, amt: parseFloat(a), edited: true };
    else allData[selectedDate].items.unshift({ where: `${currentSelectedCat} ${w}`, amt: parseFloat(a), edited: false });
    updateUI(); closeModal('expenseModal');
}
function saveNewBudget() { const v = document.getElementById('modalBudgetField').value; if(v > 0) { if(!allData[selectedDate]) allData[selectedDate] = {budget:0, items:[], savings:0}; allData[selectedDate].budget = parseFloat(v); updateUI(); closeModal('budgetModal'); } }
function saveNewSaving() { const v = document.getElementById('modalSavingField').value; if(v > 0) { if(!allData[selectedDate]) allData[selectedDate] = {budget:0, items:[], savings:0}; allData[selectedDate].savings = (allData[selectedDate].savings || 0) + parseFloat(v); updateUI(); closeModal('addSavingModal'); } }

function openExpenseModal() { editingIndex = null; document.getElementById('modalWhere').value = ""; document.getElementById('modalAmt').value = ""; openModal('expenseModal'); }
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function showPage(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function toggleTheme() { const isDark = document.body.classList.toggle('dark-theme'); localStorage.setItem('fynVaultTheme', isDark ? 'dark' : 'light'); }
function selectCat(emoji, el) { currentSelectedCat = emoji; document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('selected')); el.classList.add('selected'); }
function handleDateChange(date) { selectedDate = date; updateUI(); }
function clearAllData() { if (confirm("Clear all?")) { localStorage.clear(); location.reload(); } }
function showSavingsHistory() {
    const list = document.getElementById('savingsHistoryList');
    list.innerHTML = "";
    for (let d in allData) if (allData[d].savings > 0) list.innerHTML += `<div class="expense-tile"><span>${d}</span><span style="color:var(--accent)">+${currencySymbols[currency]}${allData[d].savings.toFixed(2)}</span></div>`;
}

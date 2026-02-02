let allData = JSON.parse(localStorage.getItem('fynVault')) || {};
let selectedDate = new Date().toISOString().split('T')[0];
let currentSelectedCat = '🍔';
let currency = localStorage.getItem('fynVaultCurrency') || 'INR';
let editingIndex = null;

const currencySymbols = { 'USD': '$', 'INR': '₹' };

window.onload = () => {
    const savedTheme = localStorage.getItem('fynVaultTheme') || 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    document.getElementById('currencySelector').value = currency;
    document.getElementById('searchInput').addEventListener('input', updateUI);
    updateUI();
};

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

function openActionSheet(index) {
    editingIndex = index;
    const item = allData[selectedDate].items[index];
    document.getElementById('modifyOption').style.display = item.edited ? 'none' : 'block';
    openModal('actionSheet');
}

function prepareModify() {
    const item = allData[selectedDate].items[editingIndex];
    document.getElementById('modalWhere').value = item.where.split(' ').slice(1).join(' ');
    document.getElementById('modalAmt').value = item.amt;
    document.getElementById('expenseModalTitle').innerText = "Modify Expense";
    closeModal('actionSheet');
    openModal('expenseModal');
}

function deleteExpense() {
    if (confirm("Delete this expense?")) {
        allData[selectedDate].items.splice(editingIndex, 1);
        updateUI();
        closeModal('actionSheet');
    }
}

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
            list.innerHTML += `<div class="expense-tile"><span style="font-weight:700;">${date}</span><span style="color:var(--accent)">+${currencySymbols[currency]}${allData[date].savings.toFixed(2)}</span></div>`;
        }
    }
}

function exportAsPDF() {
    let html = `<h2>FynVault Data</h2><table border="1" style="width:100%"><tr><th>Date</th><th>Item</th><th>Amount</th></tr>`;
    for (let d in allData) {
        if(allData[d].items) allData[d].items.forEach(i => html += `<tr><td>${d}</td><td>${i.where}</td><td>${i.amt}</td></tr>`);
    }
    html2pdf().from(html + "</table>").save('FynVault_Data.pdf');
}

function exportAsExcel() {
    const exportData = [];
    for (let d in allData) {
        if(allData[d].items) allData[d].items.forEach(i => exportData.push({ Date: d, Item: i.where, Amount: i.amt }));
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FynVault");
    XLSX.writeFile(wb, "FynVault_Data.xlsx");
}

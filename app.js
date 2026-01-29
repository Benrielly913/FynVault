let allData = JSON.parse(localStorage.getItem('fynVault')) || {};
let selectedDate = new Date().toISOString().split('T')[0];
let currentSelectedCat = '🍔';
let currency = localStorage.getItem('fynVaultCurrency') || 'INR';
const currencySymbols = {
    'USD': '$',
    'INR': '₹'
};

window.onload = () => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('fynVaultTheme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
    }

    document.getElementById('searchInput').addEventListener('input', updateUI);
    document.getElementById('currencySelector').value = currency;
    updateUI();
};

function updateUI() {
    const dayData = allData[selectedDate] || { budget: 0, items: [], savings: 0 };
    const historyDiv = document.getElementById('history');
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    
    document.getElementById('dateText').innerText = new Date(selectedDate).toLocaleDateString(undefined, {day:'numeric', month:'short'});
    
    historyDiv.innerHTML = "";
    let totalSpent = 0;
    if (dayData.items) {
        dayData.items.forEach(item => totalSpent += parseFloat(item.amt));
    }

    const filtered = dayData.items ? dayData.items.filter(item => item.where.toLowerCase().includes(searchVal)) : [];

    if (filtered.length > 0) {
        filtered.forEach((i, idx) => {
            historyDiv.innerHTML += `
                <div class="expense-tile">
                    <div class="tile-left">
                        <div class="tile-icon">${i.where.split(' ')[0]}</div>
                        <div class="tile-name">${i.where.split(' ').slice(1).join(' ')}</div>
                    </div>
                    <div class="tile-amt">-${currencySymbols[currency]}${i.amt.toFixed(2)}</div>
                </div>`;
        });
    } else {
        historyDiv.innerHTML = "<p style='text-align:center; opacity:0.5; margin-top: 30px;'>No expenses logged for this day.</p>"
    }

    let totalBudget = 0;
    let totalSavings = 0;
    for (const date in allData) {
        if (allData[date].budget) {
            totalBudget += allData[date].budget;
        }
        if (allData[date].savings) {
            totalSavings += allData[date].savings;
        }
    }

    document.getElementById('totalBudgetAmount').innerText = currencySymbols[currency] + totalBudget.toFixed(2);
    document.getElementById('spentAmount').innerText = currencySymbols[currency] + totalSpent.toFixed(2);
    document.getElementById('totalSavingAmount').innerText = currencySymbols[currency] + totalSavings.toFixed(2);
    document.getElementById('statSpent').innerText = currencySymbols[currency] + totalSpent.toFixed(2);

    const progBar = document.getElementById('progressBar');
    const dailyBudget = dayData.budget || 0;
    if (dailyBudget > 0) {
        let perc = (totalSpent / dailyBudget) * 100;
        progBar.style.width = Math.min(perc, 100) + "%";
    } else {
        progBar.style.width = "0%";
    }
    localStorage.setItem('fynVault', JSON.stringify(allData));
}

function saveNewBudget() {
    const val = document.getElementById('modalBudgetField').value;
    if(val && val > 0) {
        if(!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
        allData[selectedDate].budget = parseFloat(val);
        updateUI(); 
        closeModal('budgetModal');
    }
}

function saveNewSaving() {
    const val = document.getElementById('modalSavingField').value;
    if(val && val > 0) {
        if(!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
        allData[selectedDate].savings = (allData[selectedDate].savings || 0) + parseFloat(val);
        updateUI();
        closeModal('addSavingModal');
    }
}

function showSavingsHistory() {
    const savingsHistoryList = document.getElementById('savingsHistoryList');
    savingsHistoryList.innerHTML = "";
    for (const date in allData) {
        if (allData[date].savings && allData[date].savings > 0) {
            savingsHistoryList.innerHTML += `
                <div class="expense-tile">
                    <div class="tile-left">
                        <div class="tile-name">${new Date(date).toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'})}</div>
                    </div>
                    <div class="tile-amt">+${currencySymbols[currency]}${allData[date].savings.toFixed(2)}</div>
                </div>`;
        }
    }
    if (savingsHistoryList.innerHTML === "") {
        savingsHistoryList.innerHTML = "<p style='text-align:center; opacity:0.5; margin-top: 30px;'>No savings history found.</p>"
    }
}

function saveNewExpense() {
    const w = document.getElementById('modalWhere').value || "Expense";
    const a = document.getElementById('modalAmt').value;
    if(a) {
        if(!allData[selectedDate]) allData[selectedDate] = { budget: 0, items: [], savings: 0 };
        if(!allData[selectedDate].items) allData[selectedDate].items = [];
        allData[selectedDate].items.unshift({ where: `${currentSelectedCat} ${w}`, amt: parseFloat(a) });
        updateUI(); 
        closeModal('expenseModal');
        document.getElementById('modalWhere').value = "";
        document.getElementById('modalAmt').value = "";
    }
}

function handleDateChange(date) {
    selectedDate = date;
    updateUI();
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function showPage(id) { 
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function selectCat(emoji, el) {
    currentSelectedCat = emoji;
    document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('fynVaultTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function clearAllData() {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
        localStorage.removeItem('fynVault');
        allData = {};
        updateUI();
        location.reload();
    }
}

function changeCurrency() {
    currency = document.getElementById('currencySelector').value;
    localStorage.setItem('fynVaultCurrency', currency);
    updateUI();
}

function getFormattedData() {
    const data = [];
    for (const date in allData) {
        const dayData = allData[date];
        if (dayData.items) {
            dayData.items.forEach(item => {
                data.push({
                    Date: date,
                    Details: item.where,
                    Amount: item.amt.toFixed(2),
                    Type: 'Expense'
                });
            });
        }
        if (dayData.savings > 0) {
            data.push({
                Date: date,
                Details: 'Savings',
                Amount: dayData.savings.toFixed(2),
                Type: 'Saving'
            });
        }
    }
    return data;
}

function exportAsPDF() {
    const data = getFormattedData();
    let html = `
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
        <h1>FynVault Data</h1>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Details</th>
                    <th>Amount</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
    `;
    data.forEach(row => {
        html += `
            <tr>
                <td>${row.Date}</td>
                <td>${row.Details}</td>
                <td>${currencySymbols[currency]}${row.Amount}</td>
                <td>${row.Type}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    html2pdf().from(html).save('fynvault_data.pdf');
}

function exportAsExcel() {
    const data = getFormattedData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FynVault Data");
    XLSX.writeFile(wb, "fynvault_data.xlsx");
}

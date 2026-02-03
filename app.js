
let allData = JSON.parse(localStorage.getItem('fynVault')) || {};
let selectedDate = new Date().toISOString().split('T')[0];
let currentSelectedCat = '🍔';
let currency = localStorage.getItem('fynVaultCurrency') || 'INR';
let selectedExpenseIndex = -1;
const currencySymbols = {
    'USD': '$',
    'INR': '₹'
};

window.onload = () => {
    const splashScreen = document.getElementById('splashScreen');
    const mainPage = document.getElementById('mainPage');
    const loadingMessage = document.getElementById('loadingMessage');
    const welcomeMessage = document.getElementById('welcomeMessage');

    setTimeout(() => {
        loadingMessage.style.animation = 'fade-out 0.5s forwards';
        setTimeout(() => {
            loadingMessage.style.display = 'none';
            welcomeMessage.style.display = 'block';
            welcomeMessage.style.animation = 'fade-in 0.5s forwards';
            setTimeout(() => {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    mainPage.classList.add('active');
                }, 500);
            }, 1000);
        }, 500);
    }, 2000);

    const savedTheme = localStorage.getItem('fynVaultTheme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
    }

    document.getElementById('searchInput').addEventListener('input', updateUI);
    document.getElementById('currencySelector').value = currency;
    updateUI();
    
    makeSwipeable('swipe-expense', saveNewExpense);
    makeSwipeable('swipe-saving', saveNewSaving);
};

function makeSwipeable(containerId, callback) {
    const swipeContainer = document.getElementById(containerId);
    if (!swipeContainer) return;

    const swipeThumb = swipeContainer.querySelector('.swipe-thumb');
    let isDragging = false;
    let startX = 0;
    let containerWidth = swipeContainer.offsetWidth;
    let thumbWidth = swipeThumb.offsetWidth;

    const onDragStart = (e) => {
        isDragging = true;
        startX = e.pageX || e.touches[0].pageX;
        swipeThumb.style.transition = 'none';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        const currentX = e.pageX || e.touches[0].pageX;
        const diffX = currentX - startX;
        let newLeft = Math.max(0, Math.min(diffX, containerWidth - thumbWidth));
        swipeThumb.style.left = `${newLeft}px`;
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        const finalLeft = parseInt(swipeThumb.style.left, 10);
        if (finalLeft >= containerWidth - thumbWidth - 5) { // 5px tolerance
            callback();
        }

        swipeThumb.style.transition = 'left 0.3s ease';
        swipeThumb.style.left = '0px';
    };

    swipeThumb.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    swipeThumb.addEventListener('touchstart', onDragStart);
    document.addEventListener('touchmove', onDragMove);
    document.addEventListener('touchend', onDragEnd);
}

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
                <div class="expense-tile" onclick="openExpenseOptions(${idx})">
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

    const totalBudget = dayData.budget || 0;
    let totalSavings = 0;
    for (const date in allData) {
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

function showNotification(message) {
    const notificationBox = document.getElementById('notification-box');
    notificationBox.innerText = message;
    notificationBox.classList.add('show');
    setTimeout(() => {
        notificationBox.classList.remove('show');
    }, 6000);
}

function openExpenseOptions(index) {
    selectedExpenseIndex = index;
    openModal('expenseOptionsModal');
}

function openModifyExpenseModal() {
    if (allData[selectedDate].items[selectedExpenseIndex].modified) {
        showNotification("Expense already modified once");
        closeModal('expenseOptionsModal');
        return;
    }
    closeModal('expenseOptionsModal');
    const expense = allData[selectedDate].items[selectedExpenseIndex];
    const category = expense.where.split(' ')[0];
    const description = expense.where.split(' ').slice(1).join(' ');
    document.getElementById('modifyModalWhere').value = description;
    document.getElementById('modifyModalAmt').value = expense.amt;

    const catItems = document.querySelectorAll('#modifyCategoryGrid .cat-item');
    catItems.forEach(item => {
        if (item.innerText === category) {
            item.classList.add('selected');
            currentSelectedCat = category;
        } else {
            item.classList.remove('selected');
        }
    });

    openModal('modifyExpenseModal');
}

function saveModifiedExpense() {
    const w = document.getElementById('modifyModalWhere').value || "Expense";
    const a = document.getElementById('modifyModalAmt').value;

    if (a) {
        allData[selectedDate].items[selectedExpenseIndex] = {
            where: `${currentSelectedCat} ${w}`,
            amt: parseFloat(a),
            modified: true
        };
        updateUI();
        closeModal('modifyExpenseModal');
    }
}

function deleteExpense() {
    allData[selectedDate].items.splice(selectedExpenseIndex, 1);
    updateUI();
    closeModal('expenseOptionsModal');
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
        allData[selectedDate].items.unshift({ where: `${currentSelectedCat} ${w}`, amt: parseFloat(a), modified: false });
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
    const parent = el.parentElement;
    parent.querySelectorAll('.cat-item').forEach(i => i.classList.remove('selected'));
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

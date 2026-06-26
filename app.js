// ========================================
// APP.JS - MAIN APPLICATION LOGIC
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 App loading...');

    // Check login
    if (sessionStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // ========================================
    // SUPABASE CONFIGURATION
    // ========================================

    const SUPABASE_URL = 'https://vsxsmosfcfgziubqulkg.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeHNtb3NmY2Zneml1YnF1bGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDk3OTUsImV4cCI6MjA5Nzk4NTc5NX0.eTEaOE2HYzyMSYX2rQ8aQ-S1F6PNZgwLdJVBSTEbC8w';

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ========================================
    // PREDICTION ENGINE
    // ========================================

    function predictScore(hours, absences, midterm) {
        const intercept = 12.50;
        const coefHours = 2.30;
        const coefAbsences = -1.80;
        const coefMidterm = 0.75;

        let score = intercept + (coefHours * hours) + (coefAbsences * absences) + (coefMidterm * midterm);
        score = Math.max(0, Math.min(100, score));
        return Math.round(score * 100) / 100;
    }

    function getInterpretation(score) {
        if (score >= 80) {
            return { text: "✅ Excellent! On track for Distinction", class: "excellent", scoreClass: "good" };
        } else if (score >= 65) {
            return { text: "📘 Good! On track for Credit/Merit", class: "good", scoreClass: "good" };
        } else if (score >= 50) {
            return { text: "⚠️ Needs Improvement - At risk of failing", class: "warning", scoreClass: "warning" };
        } else {
            return { text: "🚨 Critical! Immediate intervention needed", class: "danger", scoreClass: "danger" };
        }
    }

    function generateWhatIf(hours, absences, midterm) {
        const scenarios = [
            { label: "📌 Current", hours, absences, midterm },
            { label: "📚 +2 Study Hours", hours: Math.min(20, hours + 2), absences, midterm },
            { label: "🎯 -2 Absences", hours, absences: Math.max(0, absences - 2), midterm },
            { label: "🌟 Both Improvements", hours: Math.min(20, hours + 2), absences: Math.max(0, absences - 2), midterm },
            { label: "📈 +5% Mid-term", hours, absences, midterm: Math.min(100, midterm + 5) }
        ];

        return scenarios.map(s => ({
            ...s,
            score: predictScore(s.hours, s.absences, s.midterm)
        }));
    }

    // ========================================
    // BATCH PROCESSING
    // ========================================

    let studentBatch = [];

    function addStudentToBatch(name, hours, absences, midterm) {
        const existing = studentBatch.find(s => s.name === name);
        if (existing) {
            existing.hours = hours;
            existing.absences = absences;
            existing.midterm = midterm;
            existing.score = predictScore(hours, absences, midterm);
        } else {
            studentBatch.push({
                name: name,
                hours: hours,
                absences: absences,
                midterm: midterm,
                score: predictScore(hours, absences, midterm)
            });
        }
        renderBatchList();
    }

    function removeStudentFromBatch(index) {
        studentBatch.splice(index, 1);
        renderBatchList();
    }

    function clearBatch() {
        studentBatch = [];
        renderBatchList();
        const batchResults = document.getElementById('batchResults');
        const batchSection = document.getElementById('batchSection');
        if (batchResults) batchResults.style.display = 'none';
        if (batchSection) batchSection.style.display = 'none';
    }

    function renderBatchList() {
        const container = document.getElementById('batchList');
        const countEl = document.getElementById('batchCount');

        if (!container || !countEl) return;

        if (studentBatch.length === 0) {
            container.innerHTML = `<p class="empty-message">No students added yet. Enter data and click "Add to Batch"</p>`;
            countEl.textContent = '0 students';
            return;
        }

        let html = '';
        studentBatch.forEach((s, index) => {
            const interp = getInterpretation(s.score);
            html += `
                <div class="batch-item">
                    <div class="batch-info">
                        <span class="batch-name">${s.name}</span>
                        <span class="batch-details">📚 ${s.hours}h · 🚫 ${s.absences} abs · 📝 ${s.midterm}%</span>
                    </div>
                    <div class="batch-actions">
                        <span class="batch-score ${interp.scoreClass}">${s.score}%</span>
                        <button class="batch-delete" onclick="removeStudentFromBatch(${index})">✕</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        countEl.textContent = `${studentBatch.length} students`;
    }

    window.removeStudentFromBatch = removeStudentFromBatch;
    window.clearBatch = clearBatch;

    async function predictBatch() {
        if (studentBatch.length === 0) {
            alert('Please add at least one student first!');
            return;
        }

        studentBatch.forEach(s => {
            s.score = predictScore(s.hours, s.absences, s.midterm);
        });

        const container = document.getElementById('batchResultsContainer');
        if (!container) return;

        let html = `
            <h3>📋 Batch Prediction Results</h3>
            <div class="batch-results-table">
                <table>
                    <thead>
                        <tr><th>#</th><th>Name</th><th>Hours</th><th>Absences</th><th>Mid-term</th><th>Predicted</th><th>Status</th></tr>
                    </thead>
                    <tbody>
        `;

        studentBatch.forEach((s, index) => {
            const interp = getInterpretation(s.score);
            let statusEmoji = s.score >= 80 ? '✅' : s.score >= 50 ? '⚠️' : '🚨';
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.hours}</td>
                    <td>${s.absences}</td>
                    <td>${s.midterm}</td>
                    <td class="score-${interp.scoreClass}"><strong>${s.score}%</strong></td>
                    <td>${statusEmoji} ${interp.text.split('!')[0]}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="batch-summary">
                <div class="summary-stat"><span>Total Students</span><strong>${studentBatch.length}</strong></div>
                <div class="summary-stat"><span>Average Score</span><strong>${(studentBatch.reduce((sum, s) => sum + s.score, 0) / studentBatch.length).toFixed(1)}%</strong></div>
                <div class="summary-stat"><span>Pass Rate (≥50%)</span><strong>${Math.round((studentBatch.filter(s => s.score >= 50).length / studentBatch.length) * 100)}%</strong></div>
                <div class="summary-stat"><span>Distinction (≥80%)</span><strong>${Math.round((studentBatch.filter(s => s.score >= 80).length / studentBatch.length) * 100)}%</strong></div>
            </div>
            <div class="batch-actions-row">
                <button class="btn-save-batch" onclick="saveBatchToDatabase()">💾 Save All</button>
                <button class="btn-export-batch" onclick="exportBatchCSV()">📤 Export CSV</button>
                <button class="btn-clear-batch" onclick="clearBatch()">🗑️ Clear</button>
            </div>
        `;

        container.innerHTML = html;
        const batchResults = document.getElementById('batchResults');
        if (batchResults) {
            batchResults.style.display = 'block';
            batchResults.scrollIntoView({ behavior: 'smooth' });
        }
    }

    window.predictBatch = predictBatch;

    // ========================================
    // DATABASE OPERATIONS
    // ========================================

    async function saveToDatabase(name, hours, absences, midterm, score) {
        try {
            const { data, error } = await supabaseClient
                .from('predictions')
                .insert([{ name, hours, absences, midterm, score }]);

            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('Error saving to database:', error);
            return { success: false, error: error.message };
        }
    }

    window.saveBatchToDatabase = saveBatchToDatabase;
    window.exportBatchCSV = exportBatchCSV;

    async function saveBatchToDatabase() {
        if (studentBatch.length === 0) {
            alert('No students to save!');
            return;
        }

        try {
            const predictions = studentBatch.map(s => ({
                name: s.name,
                hours: s.hours,
                absences: s.absences,
                midterm: s.midterm,
                score: s.score
            }));

            const { data, error } = await supabaseClient
                .from('predictions')
                .insert(predictions);

            if (error) throw error;

            alert(`✅ ${predictions.length} predictions saved to database!`);

            predictions.forEach(p => {
                const entry = {
                    ...p,
                    timestamp: new Date().toISOString(),
                    id: Date.now() + Math.random()
                };
                saveToLocalStorage(entry);
            });

            clearBatch();
            await loadHistoryFromDatabase();
            updateBadge();
            updateAnalytics();

        } catch (error) {
            console.error('Error saving batch:', error);
            alert('❌ Error saving to database: ' + error.message);
        }
    }

    async function loadHistoryFromDatabase() {
        try {
            const { data, error } = await supabaseClient
                .from('predictions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                data.forEach(item => {
                    const entry = {
                        id: item.id,
                        name: item.name,
                        hours: item.hours,
                        absences: item.absences,
                        midterm: item.midterm,
                        score: item.score,
                        timestamp: item.created_at
                    };
                    saveToLocalStorage(entry);
                });
            }

            renderHistoryFromData(data || []);
            updateBadge();
            return data || [];
        } catch (error) {
            console.error('Error loading from database:', error);
            renderHistory();
            return [];
        }
    }

    window.loadHistoryFromDatabase = loadHistoryFromDatabase;

    async function deleteFromDatabase(id) {
        try {
            const { error } = await supabaseClient
                .from('predictions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            deleteFromLocalStorage(id);
            await loadHistoryFromDatabase();
            updateBadge();
            updateAnalytics();

        } catch (error) {
            console.error('Error deleting:', error);
            alert('❌ Error deleting: ' + error.message);
        }
    }

    window.deleteFromDatabase = deleteFromDatabase;

    async function clearDatabase() {
        if (!confirm('⚠️ Delete ALL predictions from the database?')) return;

        try {
            const { error } = await supabaseClient
                .from('predictions')
                .delete()
                .neq('id', 0);

            if (error) throw error;

            localStorage.removeItem('examPredictions');
            await loadHistoryFromDatabase();
            updateBadge();
            updateAnalytics();
            alert('✅ All predictions deleted!');

        } catch (error) {
            console.error('Error clearing database:', error);
            alert('❌ Error: ' + error.message);
        }
    }

    // ========================================
    // LOCAL STORAGE
    // ========================================

    const STORAGE_KEY = 'examPredictions';

    function getLocalHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveToLocalStorage(entry) {
        const history = getLocalHistory();
        const exists = history.some(item => item.id === entry.id);
        if (!exists) {
            history.unshift(entry);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        }
    }

    function deleteFromLocalStorage(id) {
        let history = getLocalHistory();
        history = history.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }

    // ========================================
    // RENDER HISTORY
    // ========================================

    function renderHistoryFromData(data) {
        const container = document.getElementById('historyList');
        const countEl = document.getElementById('historyCount');

        if (!container || !countEl) return;

        if (!data || data.length === 0) {
            countEl.textContent = '0 predictions saved';
            container.innerHTML = `<p class="empty-message">No predictions saved yet. Predict a score and save it!</p>`;
            return;
        }

        countEl.textContent = `${data.length} predictions saved in database`;

        let html = '';
        data.forEach(item => {
            const interp = getInterpretation(item.score);
            const date = new Date(item.created_at);
            html += `
                <div class="history-item">
                    <div class="info">
                        <span class="name">${item.name}</span>
                        <span class="details">📚 ${item.hours}h · 🚫 ${item.absences} abs · 📝 ${item.midterm}% mid</span>
                        <span class="details">📅 ${date.toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="score-badge ${interp.scoreClass}">${item.score}%</span>
                        <button class="delete-btn" onclick="deleteFromDatabase(${item.id})">✕</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function renderHistory() {
        const history = getLocalHistory();
        const container = document.getElementById('historyList');
        const countEl = document.getElementById('historyCount');

        if (!container || !countEl) return;

        countEl.textContent = `${history.length} predictions saved (local backup)`;

        if (history.length === 0) {
            container.innerHTML = `<p class="empty-message">No predictions saved yet.</p>`;
            return;
        }

        let html = '';
        history.forEach(item => {
            const interp = getInterpretation(item.score);
            html += `
                <div class="history-item">
                    <div class="info">
                        <span class="name">${item.name}</span>
                        <span class="details">📚 ${item.hours}h · 🚫 ${item.absences} abs · 📝 ${item.midterm}% mid</span>
                        <span class="details">📅 ${new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="score-badge ${interp.scoreClass}">${item.score}%</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function updateBadge() {
        const history = getLocalHistory();
        const badge = document.getElementById('historyBadge');
        if (badge) {
            badge.textContent = history.length;
            badge.style.display = history.length > 0 ? 'block' : 'none';
        }
    }

    window.updateBadge = updateBadge;

    // ========================================
    // ANALYTICS
    // ========================================

    function updateAnalytics() {
        const history = getLocalHistory();
        const total = history.length;

        const statTotal = document.getElementById('statTotal');
        const statAverage = document.getElementById('statAverage');
        const statPassRate = document.getElementById('statPassRate');
        const statDistinction = document.getElementById('statDistinction');

        if (statTotal) statTotal.textContent = total;

        if (total === 0) {
            if (statAverage) statAverage.textContent = '0%';
            if (statPassRate) statPassRate.textContent = '0%';
            if (statDistinction) statDistinction.textContent = '0%';
            return;
        }

        const scores = history.map(item => item.score);
        const avg = scores.reduce((a, b) => a + b, 0) / total;
        const passCount = scores.filter(s => s >= 50).length;
        const distCount = scores.filter(s => s >= 80).length;

        if (statAverage) statAverage.textContent = avg.toFixed(1) + '%';
        if (statPassRate) statPassRate.textContent = Math.round((passCount / total) * 100) + '%';
        if (statDistinction) statDistinction.textContent = Math.round((distCount / total) * 100) + '%';

        updateCharts(history);
    }

    window.updateAnalytics = updateAnalytics;

    // ========================================
    // CHARTS
    // ========================================

    let distributionChartInstance = null;
    let trendChartInstance = null;
    let miniChartInstance = null;

    function updateCharts(history) {
        if (history.length === 0) {
            if (distributionChartInstance) {
                distributionChartInstance.destroy();
                distributionChartInstance = null;
            }
            if (trendChartInstance) {
                trendChartInstance.destroy();
                trendChartInstance = null;
            }
            return;
        }

        const scores = history.map(item => item.score);
        const bins = [0, 20, 40, 50, 60, 70, 80, 90, 100];
        const labels = ['0-20', '21-40', '41-50', '51-60', '61-70', '71-80', '81-90', '91-100'];
        const counts = bins.slice(0, -1).map((bin, i) => {
            const next = bins[i + 1];
            return scores.filter(s => s >= bin && s < next).length;
        });

        const ctx1 = document.getElementById('distributionChart');
        if (ctx1) {
            const context1 = ctx1.getContext('2d');
            if (distributionChartInstance) distributionChartInstance.destroy();
            distributionChartInstance = new Chart(context1, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Students',
                        data: counts,
                        backgroundColor: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#2ecc71', '#3498db', '#3498db', '#27ae60'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }

        const ctx2 = document.getElementById('trendChart');
        if (ctx2) {
            const context2 = ctx2.getContext('2d');
            if (trendChartInstance) trendChartInstance.destroy();
            const sorted = [...history].reverse();
            trendChartInstance = new Chart(context2, {
                type: 'line',
                data: {
                    labels: sorted.map((_, i) => `#${i + 1}`),
                    datasets: [{
                        label: 'Predicted Score',
                        data: sorted.map(item => item.score),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#3498db'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, max: 100 }
                    }
                }
            });
        }
    }

    function showMiniChart(predicted) {
        const ctx = document.getElementById('miniChart');
        if (!ctx) return;

        if (miniChartInstance) miniChartInstance.destroy();

        miniChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Predicted Score', 'Remaining'],
                datasets: [{
                    data: [predicted, 100 - predicted],
                    backgroundColor: ['#2ecc71', '#e9ecef'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });
    }

    // ========================================
    // EXPORT FUNCTIONS
    // ========================================

    function exportBatchCSV() {
        if (studentBatch.length === 0) {
            alert('No data to export!');
            return;
        }

        let csv = 'Name,Hours,Absences,Mid-term,Predicted Score,Status\n';
        studentBatch.forEach(s => {
            const interp = getInterpretation(s.score);
            csv += `${s.name},${s.hours},${s.absences},${s.midterm},${s.score},"${interp.text}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch_predictions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportHistory() {
        const history = getLocalHistory();
        if (history.length === 0) {
            alert('No data to export!');
            return;
        }

        let csv = 'Name,Hours,Absences,Mid-term,Predicted Score,Date,Status\n';
        history.forEach(item => {
            const interp = getInterpretation(item.score);
            csv += `${item.name},${item.hours},${item.absences},${item.midterm},${item.score},${new Date(item.timestamp).toLocaleDateString()},"${interp.text}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predictions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    window.exportHistory = exportHistory;

    // ========================================
    // DOM REFERENCES
    // ========================================

    const studentNameInput = document.getElementById('studentName');
    const hoursInput = document.getElementById('hours');
    const absencesInput = document.getElementById('absences');
    const midtermInput = document.getElementById('midterm');
    const predictBtn = document.getElementById('predictBtn');
    const addBatchBtn = document.getElementById('addBatchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveResultBtn');
    const resultSection = document.getElementById('resultSection');
    const whatifSection = document.getElementById('whatifSection');
    const resultStudentName = document.getElementById('resultStudentName');
    const resultScore = document.getElementById('resultScore');
    const resultDate = document.getElementById('resultDate');
    const resultInterpretation = document.getElementById('resultInterpretation');
    const whatifGrid = document.getElementById('whatifGrid');
    const batchSection = document.getElementById('batchSection');

    let lastPrediction = null;

    // ========================================
    // PREDICT BUTTON
    // ========================================

    if (predictBtn) {
        predictBtn.onclick = function() {
            const name = studentNameInput.value.trim() || "Student";
            const hours = parseFloat(hoursInput.value);
            const absences = parseFloat(absencesInput.value);
            const midterm = parseFloat(midtermInput.value);

            if (isNaN(hours) || hours < 0 || hours > 20) {
                alert('❌ Please enter valid hours (0 - 20)');
                hoursInput.focus();
                return;
            }
            if (isNaN(absences) || absences < 0 || absences > 10) {
                alert('❌ Please enter valid absences (0 - 10)');
                absencesInput.focus();
                return;
            }
            if (isNaN(midterm) || midterm < 0 || midterm > 100) {
                alert('❌ Please enter valid mid-term score (0 - 100)');
                midtermInput.focus();
                return;
            }

            const predicted = predictScore(hours, absences, midterm);
            const interp = getInterpretation(predicted);

            lastPrediction = { name, hours, absences, midterm, score: predicted, timestamp: new Date().toISOString() };

            if (resultStudentName) resultStudentName.textContent = `👤 ${name}`;
            if (resultScore) {
                resultScore.textContent = `${predicted}%`;
                resultScore.className = `score-value ${interp.scoreClass}`;
            }
            if (resultDate) resultDate.textContent = new Date().toLocaleString();
            if (resultInterpretation) {
                resultInterpretation.textContent = interp.text;
                resultInterpretation.className = `interpretation ${interp.class}`;
            }

            const ring = document.querySelector('.score-ring');
            if (ring) {
                const angle = (predicted / 100) * 360;
                ring.style.background = `conic-gradient(#2ecc71 ${angle}deg, #e9ecef ${angle}deg)`;
            }

            if (resultSection) resultSection.style.display = 'block';
            if (saveBtn) saveBtn.style.display = 'inline-block';
            showMiniChart(predicted);

            const scenarios = generateWhatIf(hours, absences, midterm);
            const baseline = scenarios[0].score;

            let html = '';
            scenarios.forEach(s => {
                const change = s.score - baseline;
                let changeText, changeClass;
                if (change > 0.01) { changeText = `+${change.toFixed(1)}%`;
                    changeClass = 'positive'; } else if (change < -0.01) { changeText = `${change.toFixed(1)}%`;
                    changeClass = 'negative'; } else { changeText = '0.0%';
                    changeClass = 'neutral'; }

                html += `
                    <div class="whatif-card">
                        <h4>${s.label}</h4>
                        <div class="score">${s.score}%</div>
                        <div class="change ${changeClass}">${changeText}</div>
                        <small>${s.hours}h · ${s.absences} abs · ${s.midterm}%</small>
                    </div>
                `;
            });
            if (whatifGrid) whatifGrid.innerHTML = html;
            if (whatifSection) whatifSection.style.display = 'block';

            if (resultSection) resultSection.scrollIntoView({ behavior: 'smooth' });
        };
    }

    // ========================================
    // ADD TO BATCH
    // ========================================

    if (addBatchBtn) {
        addBatchBtn.onclick = function() {
            const name = studentNameInput.value.trim() || "Student";
            const hours = parseFloat(hoursInput.value);
            const absences = parseFloat(absencesInput.value);
            const midterm = parseFloat(midtermInput.value);

            if (isNaN(hours) || hours < 0 || hours > 20) {
                alert('❌ Please enter valid hours (0 - 20)');
                hoursInput.focus();
                return;
            }
            if (isNaN(absences) || absences < 0 || absences > 10) {
                alert('❌ Please enter valid absences (0 - 10)');
                absencesInput.focus();
                return;
            }
            if (isNaN(midterm) || midterm < 0 || midterm > 100) {
                alert('❌ Please enter valid mid-term score (0 - 100)');
                midtermInput.focus();
                return;
            }

            addStudentToBatch(name, hours, absences, midterm);
            if (batchSection) batchSection.style.display = 'block';
            studentNameInput.value = '';
            hoursInput.value = '';
            absencesInput.value = '';
            midtermInput.value = '';
            hoursInput.focus();
        };
    }

    // ========================================
    // SAVE SINGLE PREDICTION
    // ========================================

    if (saveBtn) {
        saveBtn.onclick = async function() {
            if (lastPrediction) {
                const result = await saveToDatabase(
                    lastPrediction.name,
                    lastPrediction.hours,
                    lastPrediction.absences,
                    lastPrediction.midterm,
                    lastPrediction.score
                );

                if (result.success) {
                    alert('✅ Prediction saved to database!');
                    saveBtn.style.display = 'none';
                    await loadHistoryFromDatabase();
                    updateBadge();
                    updateAnalytics();
                } else {
                    alert('❌ Error saving to database: ' + result.error);
                }
            }
        };
    }

    // ========================================
    // CLEAR BUTTON
    // ========================================

    if (clearBtn) {
        clearBtn.onclick = function() {
            studentNameInput.value = '';
            hoursInput.value = '';
            absencesInput.value = '';
            midtermInput.value = '';
            if (resultSection) resultSection.style.display = 'none';
            if (whatifSection) whatifSection.style.display = 'none';
            if (miniChartInstance) {
                miniChartInstance.destroy();
                miniChartInstance = null;
            }
            hoursInput.focus();
        };
    }

    // ========================================
    // LOGOUT
    // ========================================

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            sessionStorage.removeItem('loggedIn');
            window.location.href = 'index.html';
        };
    }

    // ========================================
    // TAB NAVIGATION
    // ========================================

    document.querySelectorAll('.tab-btn, .nav-item').forEach(btn => {
        btn.onclick = function() {
            const tab = this.dataset.tab;

            document.querySelectorAll('.tab-btn, .nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`.tab-btn[data-tab="${tab}"], .nav-item[data-tab="${tab}"]`).forEach(b => b.classList.add('active'));

            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const target = document.getElementById(`tab-${tab}`);
            if (target) target.classList.add('active');

            if (tab === 'analytics') {
                updateAnalytics();
            }
            if (tab === 'history') {
                loadHistoryFromDatabase();
            }
        };
    });

    // ========================================
    // EXPORT & CLEAR HISTORY
    // ========================================

    const exportBtn = document.getElementById('exportBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    if (exportBtn) exportBtn.onclick = exportHistory;
    if (clearHistoryBtn) clearHistoryBtn.onclick = clearDatabase;

    // ========================================
    // KEYBOARD SUPPORT
    // ========================================

    document.onkeydown = function(e) {
        if (e.key === 'Enter') {
            const active = document.activeElement;
            if (active && ['studentName', 'hours', 'absences', 'midterm'].includes(active.id)) {
                if (predictBtn) predictBtn.click();
            }
        }
    };

    // ========================================
    // INPUT VALIDATION
    // ========================================

    if (hoursInput) {
        hoursInput.oninput = function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 20) this.value = 20;
        };
    }
    if (absencesInput) {
        absencesInput.oninput = function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 10) this.value = 10;
        };
    }
    if (midtermInput) {
        midtermInput.oninput = function() {
            if (this.value < 0) this.value = 0;
            if (this.value > 100) this.value = 100;
        };
    }

    // ========================================
    // INIT
    // ========================================

    loadHistoryFromDatabase();
    updateBadge();
    updateAnalytics();

    console.log('✅ App loaded successfully!');
    console.log('🔬 Model: Final = 12.50 + 2.30(Hours) - 1.80(Absences) + 0.75(Mid-term)');
    console.log('📈 R² = 0.953 | Accuracy = 95.3%');
});
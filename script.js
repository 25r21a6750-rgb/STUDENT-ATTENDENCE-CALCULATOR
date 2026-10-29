
const STORAGE_KEY = "studentAttendanceData";

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"subjects":[],"records":[]}');
let lastCalculation = null;

const $ = id => document.getElementById(id);

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function makeId() {
    return Date.now().toString() + Math.random().toString(16).slice(2);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function percent(present, total) {
    return total ? (present / total) * 100 : 0;
}

function formatPercent(value) {
    return value.toFixed(2) + "%";
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    const names = {
        dashboard: "Dashboard",
        calculator: "Attendance Calculator",
        subjects: "My Subjects",
        records: "Attendance Records"
    };

    $("pageName").textContent = names[pageId] || "Dashboard";
    $("sidebar").classList.remove("open");
    window.scrollTo(0, 0);
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

function calculateTotals() {
    let total = 0;
    let present = 0;

    data.subjects.forEach(subject => {
        total += Number(subject.total);
        present += Number(subject.present);
    });

    return { total, present, absent: total - present };
}

function renderDashboard() {
    const totals = calculateTotals();
    const attendance = percent(totals.present, totals.total);

    $("totalStat").textContent = totals.total;
    $("presentStat").textContent = totals.present;
    $("absentStat").textContent = totals.absent;
    $("percentStat").textContent = formatPercent(attendance);
    $("donutPercent").textContent = formatPercent(attendance);

    $("statusFoot").textContent = !totals.total
        ? "Add your subjects"
        : attendance >= 75 ? "On track" : "Below 75% target";

    $("donut").style.background =
        `conic-gradient(#19b785 0% ${attendance}%, #edf0f7 ${attendance}% 100%)`;

    $("healthMessage").textContent = !totals.total
        ? "Add subjects to see your attendance status."
        : attendance >= 75
            ? "Great! You are meeting the 75% attendance target."
            : "Your attendance is below 75%. Attend classes regularly.";

    renderSubjectProgress();
    renderRecentRecords();
}

function renderSubjectProgress() {
    const container = $("subjectProgress");

    if (data.subjects.length === 0) {
        container.innerHTML = '<p class="empty">No subjects added yet.</p>';
        return;
    }

    container.innerHTML = data.subjects.map(subject => {
        const attendance = percent(subject.present, subject.total);
        const barClass = attendance >= 75 ? "good" : "low";

        return `
            <div class="subject-progress-item">
                <div class="progress-title">
                    <strong>${escapeHTML(subject.name)}</strong>
                    <span>${formatPercent(attendance)}</span>
                </div>

                <div class="progress">
                    <div class="progress-bar ${barClass}"
                         style="width:${attendance}%"></div>
                </div>

                <div class="progress-info">
                    <span>${subject.present} attended / ${subject.total} total</span>
                    <span>${subject.total - subject.present} missed</span>
                </div>
            </div>
        `;
    }).join("");
}

function renderSubjects() {
    $("subjectCards").innerHTML = data.subjects.length
        ? data.subjects.map(subject => {
            const attendance = percent(subject.present, subject.total);
            const barClass = attendance >= 75 ? "good" : "low";

            return `
                <div class="subject-card">
                    <div class="d-flex justify-content-between gap-2">
                        <div>
                            <h5>${escapeHTML(subject.name)}</h5>
                            <small>
                                ${subject.present} attended out of
                                ${subject.total} classes
                            </small>
                        </div>

                        <div class="subject-actions">
                            <button class="btn btn-outline-primary"
                                    data-edit="${subject.id}">Edit</button>
                            <button class="btn btn-outline-danger"
                                    data-delete="${subject.id}">Delete</button>
                        </div>
                    </div>

                    <div class="progress">
                        <div class="progress-bar ${barClass}"
                             style="width:${attendance}%"></div>
                    </div>

                    <small>${formatPercent(attendance)} attendance</small>
                </div>
            `;
        }).join("")
        : '<p class="empty">No subjects added yet.</p>';

    $("recordSubject").innerHTML =
        '<option value="">Choose subject</option>' +
        data.subjects.map(subject =>
            `<option value="${subject.id}">${escapeHTML(subject.name)}</option>`
        ).join("");

    document.querySelectorAll("[data-edit]").forEach(button => {
        button.addEventListener("click", () => editSubject(button.dataset.edit));
    });

    document.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => deleteSubject(button.dataset.delete));
    });
}

function renderRecentRecords() {
    const records = [...data.records]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    $("recentTable").innerHTML = records.length
        ? records.map(record => `
            <tr>
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(record.subjectName)}</td>
                <td>
                    <span class="status-badge ${record.status.toLowerCase()}">
                        ${record.status}
                    </span>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="3" class="text-center">No records available.</td></tr>';

    renderAllRecords();
}

function renderAllRecords() {
    const records = [...data.records]
        .sort((a, b) => b.date.localeCompare(a.date));

    $("recordsTable").innerHTML = records.length
        ? records.map(record => `
            <tr>
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(record.subjectName)}</td>
                <td>
                    <span class="status-badge ${record.status.toLowerCase()}">
                        ${record.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger"
                            data-record-delete="${record.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="4" class="text-center">No records available.</td></tr>';

    document.querySelectorAll("[data-record-delete]").forEach(button => {
        button.addEventListener("click", () => deleteRecord(button.dataset.recordDelete));
    });
}

function renderAll() {
    renderDashboard();
    renderSubjects();
}

// ATTENDANCE CALCULATOR

function validateCounts(total, present) {
    if (!Number.isInteger(total) || total < 1) {
        return "Total classes must be a whole number greater than zero.";
    }

    if (!Number.isInteger(present) || present < 0) {
        return "Attended classes must be zero or a positive whole number.";
    }

    if (present > total) {
        return "Attended classes cannot exceed total classes.";
    }

    return "";
}

$("calculatorForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = $("calcSubject").value.trim();
    const total = Number($("calcTotal").value);
    const present = Number($("calcPresent").value);

    const error = validateCounts(total, present);

    if (!name) {
        alert("Please enter the subject name.");
        return;
    }

    if (error) {
        alert(error);
        return;
    }

    const attendance = percent(present, total);

    lastCalculation = { name, total, present };

    $("calcResult").hidden = false;
    $("resultPercent").textContent = formatPercent(attendance);
    $("resultBar").style.width = attendance + "%";
    $("resultBar").className =
        "progress-bar " + (attendance >= 75 ? "good" : "low");

    $("resultStatus").textContent = attendance >= 75
        ? "You meet the 75% attendance target."
        : "Your attendance is below 75%.";

    $("resultSummary").textContent =
        `You attended ${present} out of ${total} classes. ` +
        `You missed ${total - present} classes.`;

    let recommendation;

    if (attendance >= 75) {
        const canMiss = Math.max(
            0,
            Math.floor(present / 0.75 - total + 0.0000001)
        );

        recommendation =
            `You meet the target. You can miss up to ${canMiss} ` +
            "additional classes before falling below 75%, " +
            "assuming no other classes are attended.";
    } else {
        const needed = Math.ceil((0.75 * total - present) / 0.25);

        recommendation =
            `Attend the next ${needed} classes consecutively to reach ` +
            "75%, assuming every upcoming class is attended.";
    }

    $("recommendation").textContent = recommendation;
});

$("calculatorForm").addEventListener("reset", function() {
    $("calcResult").hidden = true;
    lastCalculation = null;
});

$("saveCalculation").addEventListener("click", function() {
    if (!lastCalculation) return;

    const existing = data.subjects.find(subject =>
        subject.name.toLowerCase() === lastCalculation.name.toLowerCase()
    );

    if (existing) {
        const confirmed = confirm(
            "This subject already exists. Update its attendance?"
        );

        if (!confirmed) return;

        Object.assign(existing, lastCalculation);
    } else {
        data.subjects.push({
            id: makeId(),
            ...lastCalculation
        });
    }

    saveData();
    renderAll();
    showPage("subjects");
    alert("Attendance saved successfully!");
});

// ADD OR EDIT SUBJECT

$("subjectForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const id = $("editSubjectId").value;
    const name = $("subjectName").value.trim();
    const total = Number($("subjectTotal").value);
    const present = Number($("subjectPresent").value);

    const error = validateCounts(total, present);

    if (!name) {
        alert("Please enter a subject name.");
        return;
    }

    if (error) {
        alert(error);
        return;
    }

    const duplicate = data.subjects.find(subject =>
        subject.name.toLowerCase() === name.toLowerCase() &&
        subject.id !== id
    );

    if (duplicate) {
        alert("This subject already exists.");
        return;
    }

    if (id) {
        const subject = data.subjects.find(item => item.id === id);

        if (subject) {
            subject.name = name;
            subject.total = total;
            subject.present = present;
        }
    } else {
        data.subjects.push({
            id: makeId(),
            name,
            total,
            present
        });
    }

    resetSubjectForm();
    saveData();
    renderAll();
});

function editSubject(id) {
    const subject = data.subjects.find(item => item.id === id);
    if (!subject) return;

    $("editSubjectId").value = subject.id;
    $("subjectName").value = subject.name;
    $("subjectTotal").value = subject.total;
    $("subjectPresent").value = subject.present;

    $("subjectFormTitle").textContent = "Edit Subject";
    $("saveSubjectBtn").textContent = "Update Subject";
    $("cancelEdit").hidden = false;

    window.scrollTo(0, 0);
}

function resetSubjectForm() {
    $("subjectForm").reset();
    $("editSubjectId").value = "";
    $("subjectFormTitle").textContent = "Add a Subject";
    $("saveSubjectBtn").textContent = "Add Subject";
    $("cancelEdit").hidden = true;
}

$("cancelEdit").addEventListener("click", resetSubjectForm);

function deleteSubject(id) {
    const subject = data.subjects.find(item => item.id === id);
    if (!subject) return;

    if (!confirm(`Delete ${subject.name} and its related records?`)) return;

    data.subjects = data.subjects.filter(item => item.id !== id);
    data.records = data.records.filter(record => record.subjectId !== id);

    saveData();
    renderAll();
}

// DAILY ATTENDANCE RECORDS

$("recordDate").value = new Date().toLocaleDateString("en-CA");

$("recordForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const subjectId = $("recordSubject").value;
    const subject = data.subjects.find(item => item.id === subjectId);
    const date = $("recordDate").value;
    const status = $("recordStatus").value;

    if (!subject) {
        alert("Please add and select a subject first.");
        return;
    }

    if (!date) {
        alert("Please select a date.");
        return;
    }

    // Save a daily record and update subject totals.
    data.records.push({
        id: makeId(),
        subjectId,
        subjectName: subject.name,
        date,
        status
    });

    subject.total = Number(subject.total) + 1;

    if (status === "Present") {
        subject.present = Number(subject.present) + 1;
    }

    saveData();
    renderAll();

    $("recordDate").value = new Date().toLocaleDateString("en-CA");

    alert("Attendance record added successfully!");
});

function deleteRecord(id) {
    const record = data.records.find(item => item.id === id);
    if (!record) return;

    if (!confirm("Delete this record and reverse its attendance count?")) return;

    const subject = data.subjects.find(item => item.id === record.subjectId);

    if (subject) {
        subject.total = Math.max(0, Number(subject.total) - 1);

        if (record.status === "Present") {
            subject.present = Math.max(0, Number(subject.present) - 1);
        }

        // A subject must retain at least one total class.
        if (subject.total === 0) {
            data.subjects = data.subjects.filter(item => item.id !== subject.id);
            data.records = data.records.filter(
                item => item.subjectId !== subject.id && item.id !== id
            );
            saveData();
            renderAll();
            return;
        }
    }

    data.records = data.records.filter(item => item.id !== id);

    saveData();
    renderAll();
}

// EXPORT RECORDS TO CSV

$("exportCsv").addEventListener("click", function() {
    if (!data.records.length) {
        alert("No attendance records to export.");
        return;
    }

    const rows = [
        ["Date", "Subject", "Status"],
        ...data.records.map(record => [
            record.date,
            record.subjectName,
            record.status
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value).replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "attendance-records.csv";
    link.click();

    URL.revokeObjectURL(url);
});

// DISPLAY THE CURRENT YEAR

document.querySelector("footer").innerHTML =
    `© ${new Date().getFullYear()} AttendEase | Student Attendance Calculator`;

renderAll();

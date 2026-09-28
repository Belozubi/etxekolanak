"use strict";


const SUPABASE_URL = "https://vflmzhxphyitrmczdnao.supabase.co";
const SUPABASE_KEY = "sb_publishable_aB9yHlvlpw3f5pN77ncRDg_8LIutA_S";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase prest:", supabaseClient);

/* =========================================================
   OINARRIZKO DATUAK
   ========================================================= */

var USERS = ["JD", "MD", "ID", "OB"];

var TASKS = [
    { id: "pertsiana_altxa", name: "Pertsiana altxa" },
    { id: "ohea_egin", name: "Ohea egin" },
    { id: "gelako_lurreko_arropa_jaso", name: "Gelako lurreko arropa jaso" },
    { id: "bazkaria_prestatu", name: "Bazkaria prestatu" },
    { id: "afaria_prestatu", name: "Afaria prestatu" },
    { id: "zaborra_atera", name: "Zaborra atera" },
    { id: "kontadoreen_irakurketak", name: "Kontadoreen irakurketak apuntatu" },
    { id: "pasatu_erratza", name: "Pasatu erratza" },
    { id: "sukaldea_jaso_bazkaria", name: "Sukaldea jaso — bazkaria" },
    { id: "sukaldea_jaso_afaria", name: "Sukaldea jaso — afaria" },
    { id: "garbigailua_jarri", name: "Garbigailua jarri" },
    { id: "komuna_garbitu", name: "Komuna garbitu" },
    { id: "leihoak_garbitu", name: "Leihoak garbitu" },
    { id: "hautsa_kendu", name: "Hautsa kendu" },
    { id: "ogia_erosi", name: "Ogia erosi" }
];

var STORAGE_ASSIGNMENTS = "etxekoLanakAssignments";
var STORAGE_COMPLETIONS = "etxekoLanakCompletions";
var STORAGE_USER = "etxekoLanakCurrentUser";

var assignments = [];
var completions = {};
var currentUser = null;

var calendarDate = new Date();
var selectedCalendarDate = null;
var calendarMonth = new Date();

/* =========================================================
   HASIERA
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
    await loadData();
    loadUser();

    setupUsers();
    setupTabs();
    setupAdmin();
    setupCalendar();

    renderTaskSelect();
    renderAssignmentType();
    renderFrequency();

    updateTodayText();
    renderToday();
    renderCalendar();
    renderAssignments();

    setupRealtime();
});

function setupRealtime() {
    supabaseClient
        .channel("etxeko-lanak")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "Zereginak"
            },
            async function () {
                await new Promise(function (resolve) {
                    setTimeout(resolve, 500);
                });
                
                await loadData();
                renderToday();
                renderCalendar();
                renderAssignments();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "Betetakoak"
            },
            async function () {
                await loadData();
                renderToday();
                renderCalendar();
                renderAssignments();
            }
        )
        .subscribe(function (status) {
            console.log("REALTIME STATUS:", status);
        });
}

/* =========================================================
   DATUAK
   ========================================================= */

/*function loadData() {
    try {
        var savedAssignments =
            localStorage.getItem(STORAGE_ASSIGNMENTS);

        var savedCompletions =
            localStorage.getItem(STORAGE_COMPLETIONS);

        if (savedAssignments) {
            assignments = JSON.parse(savedAssignments);
        }

        if (savedCompletions) {
            completions = JSON.parse(savedCompletions);
        }

        if (!Array.isArray(assignments)) {
            assignments = [];
        }

        if (
            !completions ||
            typeof completions !== "object"
        ) {
            completions = {};
        }

    } catch (error) {
        console.error(error);

        assignments = [];
        completions = {};
    }
} */

async function loadData() {
    try {
        const { data: savedAssignments, error } = await supabaseClient
            .from("Zereginak")
            .select("*");

        if (error) {
            console.error("Errorea Zereginak kargatzean:", error);
            assignments = [];
        } else {
            assignments = savedAssignments.map(function (row) {
                return {
                    id: row.app_id,
                    taskId: row.task_id,
                    type: row.type,
                    users: row.users || [],
                    frequency: row.frequency,
                    weeklyDay: row.weekly_day || "",
                    specificDays: row.specific_days || [],
                    onceDate: row.once_date || "",
                    startDate: row.start_date || ""
                };
            });
        }

        /*var savedCompletions =
            localStorage.getItem(STORAGE_COMPLETIONS);

        if (savedCompletions) {
            completions = JSON.parse(savedCompletions);
        }*/


        const { data: savedCompletions, error: completionsError } =
            await supabaseClient
               .from("Betetakoak")
              .select("*");

        if (completionsError) {
            console.error(
                 "Errorea Betetakoak kargatzean:",
            completionsError
             );
            completions = {};
        } else {
            completions = {};

            savedCompletions.forEach(function (row) {
                if (row.done) {
                  var key =
                        row.date +
                        "|" +
                        row.user +
                        "|" +
                        row.task_id;

                    completions[key] = true;
                 }
            });
        }

        if (
            !completions ||
            typeof completions !== "object"
        ) {
            completions = {};
        }

    } catch (error) {
        console.error(error);

        assignments = [];
        completions = {};
    }
}    

/*function saveAssignments() {
    localStorage.setItem(
        STORAGE_ASSIGNMENTS,
        JSON.stringify(assignments)
    );
} */

async function saveAssignments() {
    const { error } = await supabaseClient
        .from("Zereginak")
        .upsert(
            assignments.map(function (assignment) {
                return {
                    //id: undefined,
                    app_id: assignment.id,
                    task_id: assignment.taskId,
                    type: assignment.type,
                    users: assignment.users,
                    frequency: assignment.frequency,
                    weekly_day: assignment.weeklyDay || null,
                    specific_days: assignment.specificDays || null,
                    once_date: assignment.onceDate || null,
                    start_date: assignment.startDate || null
                 };
        }), {
            onConflict: "app_id"
        }
    );

    if (error) {
        console.error("Errorea Zereginak gordetzean:", error);
    }
}    

/* function saveCompletions() {
    localStorage.setItem(
        STORAGE_COMPLETIONS,
        JSON.stringify(completions)
    );
} */

async function saveCompletions() {
    for (var key in completions) {
        if (!completions[key]) {
            continue;
        }

        var parts = key.split("|");

        var date = parts[0];
        var user = parts[1];
        var taskId = parts[2];

        const { data: existing, error: searchError } =
            await supabaseClient
                .from("Betetakoak")
                .select("id")
                .eq("task_id", taskId)
                .eq("user", user)
                .eq("date", date)
                .maybeSingle();

        if (searchError) {
            console.error(
                "Errorea Betetakoak bilatzean:",
                searchError
            );
            continue;
        }

        if (existing) {
            const { error: updateError } =
                await supabaseClient
                    .from("Betetakoak")
                    .update({ done: true })
                    .eq("id", existing.id);

            if (updateError) {
                console.error(
                    "Errorea Betetakoak eguneratzean:",
                    updateError
                );
            }
        } else {

            console.log("INSERT EGITERA NOA:", taskId, user, date);

            const { error: insertError } =
                await supabaseClient
                    .from("Betetakoak")
                    .insert({
                        task_id: taskId,
                        user: user,
                        date: date,
                        done: true
                    });

            if (insertError) {
                console.error(
                    "Errorea Betetakoak sortzean:",
                    insertError
                );
            }
        }
    }
}

function loadUser() {
    var savedUser =
        localStorage.getItem(STORAGE_USER);

    if (USERS.indexOf(savedUser) !== -1) {
        currentUser = savedUser;
        updateUserButtons();
    }
}


/* =========================================================
   ERABILTZAILEAK
   ========================================================= */

function setupUsers() {
    var buttons =
        document.querySelectorAll(".userButton");

    buttons.forEach(function (button) {

        button.addEventListener("click", function () {

            var user =
                button.getAttribute("data-user");

            if (USERS.indexOf(user) === -1) {
                return;
            }

            currentUser = user;

            localStorage.setItem(
                STORAGE_USER,
                currentUser
            );

            window.location.reload();

            //updateUserButtons();
            //renderToday();

            /*
             * Egutegia ere berriro kargatu eta marraztu.
             */
            //refreshCalendar();

            
        });

    });
}

function updateUserButtons() {
    var buttons =
        document.querySelectorAll(".userButton");

    buttons.forEach(function (button) {

        var user =
            button.getAttribute("data-user");

        if (user === currentUser) {
            button.classList.add("selected");
        } else {
            button.classList.remove("selected");
        }

    });

    var selected =
        document.getElementById("selectedUser");

    if (!selected) {
        return;
    }

    if (currentUser) {
        selected.textContent =
            currentUser + " aukeratu duzu.";
    } else {
        selected.textContent =
            "Lehenengo aukeratu erabiltzailea.";
    }
}


/* =========================================================
   TAB BOTOIAK
   ========================================================= */

function setupTabs() {
    var buttons =
        document.querySelectorAll(".tabButton");

    buttons.forEach(function (button) {

        button.addEventListener("click", function () {

            var tab =
                button.getAttribute("data-tab");

            openTab(tab);

        });

    });
}

async function openTab(tab) {

    var validTabs = [
        "today",
        "calendar",
        "admin"
    ];

    if (validTabs.indexOf(tab) === -1) {
        return;
    }

    var buttons =
        document.querySelectorAll(".tabButton");

    buttons.forEach(function (button) {

        if (
            button.getAttribute("data-tab") === tab
        ) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }

    });

    var sections =
        document.querySelectorAll(".tabContent");

    sections.forEach(function (section) {
        section.classList.add("hidden");
    });

    var section =
        document.getElementById(tab);

    if (section) {
        section.classList.remove("hidden");
    }

    if (tab === "today") {
        renderToday();
    }

    if (tab === "calendar") {

        /*
         * Egutegia irekitzean:
         * datuak berriro kargatu eta egutegia
         * osorik berreraiki.
         */
        
        await refreshCalendar();
    }

    if (tab === "admin") {
        renderTaskSelect();
        renderAssignmentType();
        renderFrequency();
        renderAssignments();
    }
}


/* =========================================================
   ADMINISTRAZIOA
   ========================================================= */

function setupAdmin() {

    var type =
        document.getElementById("assignmentType");

    var frequency =
        document.getElementById("frequency");

    var save =
        document.getElementById("saveAssignment");

    var removeSelected =
        document.getElementById(
            "removeSelectedAssignments"
        );

    var removeAll =
        document.getElementById(
            "removeAllAssignments"
        );

    if (type) {
        type.addEventListener(
            "change",
            renderAssignmentType
        );
    }

    if (frequency) {
        frequency.addEventListener(
            "change",
            renderFrequency
        );
    }

    if (save) {
        save.addEventListener(
            "click",
            saveAssignment
        );
    }

    if (removeSelected) {
        removeSelected.addEventListener(
            "click",
            deleteSelectedAssignments
        );
    }

    if (removeAll) {
        removeAll.addEventListener(
            "click",
            deleteAllSelectedTaskAssignments
        );
    }
}

function renderTaskSelect() {

    var select =
        document.getElementById("taskSelect");

    if (!select) {
        return;
    }

    var oldValue = select.value;

    select.innerHTML = "";

    TASKS.forEach(function (task) {

        var option =
            document.createElement("option");

        option.value = task.id;
        option.textContent = task.name;

        select.appendChild(option);

    });

    if (
        TASKS.some(function (task) {
            return task.id === oldValue;
        })
    ) {
        select.value = oldValue;
    }
}

function renderAssignmentType() {

    var select =
        document.getElementById("assignmentType");

    if (!select) {
        return;
    }

    var value = select.value;

    var single =
        document.getElementById("singleAssignment");

    var multiple =
        document.getElementById("multipleAssignment");

    var rotation =
        document.getElementById("rotationAssignment");

    if (single) {
        single.classList.toggle(
            "hidden",
            value !== "single"
        );
    }

    if (multiple) {
        multiple.classList.toggle(
            "hidden",
            value !== "multiple"
        );
    }

    if (rotation) {
        rotation.classList.toggle(
            "hidden",
            value !== "rotation"
        );
    }
}

function renderFrequency() {

    var select =
        document.getElementById("frequency");

    if (!select) {
        return;
    }

    var value = select.value;

    var weekly =
        document.getElementById("weeklyOptions");

    var specific =
        document.getElementById("specificOptions");

    var once =
        document.getElementById("onceOptions");

    if (weekly) {
        weekly.classList.toggle(
            "hidden",
            value !== "weekly"
        );
    }

    if (specific) {
        specific.classList.toggle(
            "hidden",
            value !== "specific"
        );
    }

    if (once) {
        once.classList.toggle(
            "hidden",
            value !== "once"
        );
    }
}


/* =========================================================
   ESLEIPENA GORDE
   ========================================================= */

function saveAssignment() {

    var taskSelect =
        document.getElementById("taskSelect");

    var typeSelect =
        document.getElementById("assignmentType");

    var frequencySelect =
        document.getElementById("frequency");

    if (!taskSelect || !typeSelect || !frequencySelect) {
        return;
    }

    var taskId = taskSelect.value;
    var type = typeSelect.value;
    var frequency = frequencySelect.value;

    if (!taskId || !type || !frequency) {
        showMessage(
            "Bete eremu guztiak.",
            true
        );
        return;
    }

    var users = [];

    if (type === "single") {

        var single =
            document.getElementById("singleUser");

        if (!single || USERS.indexOf(single.value) === -1) {
            showMessage(
                "Aukeratu pertsona bat.",
                true
            );
            return;
        }

        users = [single.value];
    }

    if (type === "multiple") {

        var memberInputs =
            document.querySelectorAll(
                ".memberCheck:checked"
            );

        memberInputs.forEach(function (input) {
            if (USERS.indexOf(input.value) !== -1) {
                users.push(input.value);
            }
        });

        if (users.length === 0) {
            showMessage(
                "Aukeratu gutxienez pertsona bat.",
                true
            );
            return;
        }
    }

    if (type === "rotation") {

        var rotationInputs =
            document.querySelectorAll(
                ".rotationCheck:checked"
            );

        rotationInputs.forEach(function (input) {
            if (USERS.indexOf(input.value) !== -1) {
                users.push(input.value);
            }
        });

        if (users.length === 0) {
            showMessage(
                "Aukeratu txandan parte hartuko dutenak.",
                true
            );
            return;
        }
    }

    var weeklyDay = "";
    var specificDays = [];
    var onceDate = "";

    if (frequency === "weekly") {

        var weekly =
            document.getElementById("weeklyDay");

        if (!weekly || weekly.value === "") {
            showMessage(
                "Aukeratu asteko eguna.",
                true
            );
            return;
        }

        weeklyDay = weekly.value;
    }

    if (frequency === "specific") {

        var specificInputs =
            document.querySelectorAll(
                ".specificCheck:checked"
            );

        specificInputs.forEach(function (input) {
            specificDays.push(input.value);
        });

        if (specificDays.length === 0) {
            showMessage(
                "Aukeratu gutxienez egun bat.",
                true
            );
            return;
        }
    }

    if (frequency === "once") {

        var once =
            document.getElementById("onceDate");

        if (!once || !once.value) {
            showMessage(
                "Aukeratu data.",
                true
            );
            return;
        }

        onceDate = once.value;
    }

    var assignment = {
        id:
            "a_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        taskId: taskId,
        type: type,
        users: users,
        frequency: frequency,
        weeklyDay: weeklyDay,
        specificDays: specificDays,
        onceDate: onceDate,

        startDate: dateKey(new Date())
    };

    assignments.push(assignment);

    saveAssignments();

    clearAssignmentForm();

    renderAssignments();
    renderToday();

    /*
     * Esleipen berria berehala agertu dadin.
     */
    refreshCalendar();

    showMessage(
        "Esleipena gorde da.",
        false
    );
}

function clearAssignmentForm() {

    var single =
        document.getElementById("singleUser");

    if (single) {
        single.value = "";
    }

    var weekly =
        document.getElementById("weeklyDay");

    if (weekly) {
        weekly.value = "";
    }

    var once =
        document.getElementById("onceDate");

    if (once) {
        once.value = "";
    }

    document
        .querySelectorAll(
            ".memberCheck, .rotationCheck, .specificCheck"
        )
        .forEach(function (input) {
            input.checked = false;
        });
}

function showMessage(text, error) {

    var message =
        document.getElementById("adminMessage");

    if (!message) {
        return;
    }

    message.textContent = text;
    message.style.color =
        error ? "#a00000" : "#176b2c";
}


/* =========================================================
   ESLEIPENEN ZERRENDA
   ========================================================= */

function renderAssignments() {

    var container =
        document.getElementById("assignmentList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (assignments.length === 0) {
        container.innerHTML =
            '<p class="noTasks">Ez dago esleipenik.</p>';

        return;
    }

    assignments.forEach(function (assignment) {

        var item =
            document.createElement("div");

        item.className = "assignmentItem";

        var row =
            document.createElement("div");

        row.className =
            "assignmentSelectRow";

        var checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className =
            "assignmentCheckbox";

        checkbox.setAttribute(
            "data-id",
            assignment.id
        );

        checkbox.addEventListener(
            "change",
            function () {

                item.classList.toggle(
                    "selected",
                    checkbox.checked
                );

            }
        );

        var text =
            document.createElement("div");

        text.className =
            "assignmentText";

        var title =
            document.createElement("strong");

        title.textContent =
            getTaskName(assignment.taskId);

        var meta =
            document.createElement("div");

        meta.className =
            "assignmentMeta";

        meta.textContent =
            getAssignmentDescription(
                assignment
            );

        text.appendChild(title);
        text.appendChild(meta);

        row.appendChild(checkbox);
        row.appendChild(text);

        item.appendChild(row);

        container.appendChild(item);
    });
}

function getAssignmentDescription(assignment) {

    var people =
        assignment.users.join(", ");

    var typeText = "";

    if (assignment.type === "single") {
        typeText = "Pertsona: " + people;
    }

    if (assignment.type === "multiple") {
        typeText = "Pertsonak: " + people;
    }

    if (assignment.type === "rotation") {
        typeText =
            "Txanda: " +
            assignment.users.join(" → ");
    }

    var frequencyText = "";

    if (assignment.frequency === "daily") {
        frequencyText = "Egunero";
    }

    if (assignment.frequency === "weekly") {
        frequencyText =
            "Astero, " +
            weekdayName(
                Number(assignment.weeklyDay)
            );
    }

    if (assignment.frequency === "specific") {
        frequencyText =
            assignment.specificDays
                .map(function (day) {
                    return weekdayName(Number(day));
                })
                .join(", ");
    }

    if (assignment.frequency === "once") {
        frequencyText =
            "Behin: " +
            assignment.onceDate;
    }

    return (
        typeText +
        " | " +
        frequencyText
    );
}

function deleteSelectedAssignments() {

    var selected =
        document.querySelectorAll(
            ".assignmentCheckbox:checked"
        );

    var ids = [];

    selected.forEach(function (checkbox) {
        ids.push(
            checkbox.getAttribute("data-id")
        );
    });

    if (ids.length === 0) {
        showMessage(
            "Ez duzu esleipenik aukeratu.",
            true
        );
        return;
    }

    assignments =
        assignments.filter(function (assignment) {
            return ids.indexOf(assignment.id) === -1;
        });

    saveAssignments();

    renderAssignments();
    renderToday();
    refreshCalendar();

    showMessage(
        ids.length +
        " esleipen ezabatu dira.",
        false
    );
}

function deleteAllSelectedTaskAssignments() {

    var select =
        document.getElementById("taskSelect");

    if (!select) {
        return;
    }

    var taskId = select.value;

    assignments =
        assignments.filter(function (assignment) {
            return assignment.taskId !== taskId;
        });

    saveAssignments();

    renderAssignments();
    renderToday();
    refreshCalendar();

    showMessage(
        "Zeregin horren esleipenak ezabatu dira.",
        false
    );
}


/* =========================================================
   GAUR
   ========================================================= */

function renderToday() {

    var container =
        document.getElementById("tasks");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!currentUser) {
        container.innerHTML =
            "<p>Lehenengo aukeratu erabiltzailea.</p>";
        return;
    }

    var today = new Date();

    var tasks =
        getUserTasks(currentUser, today);

    if (tasks.length === 0) {
        container.innerHTML =
            '<p class="noTasks">Gaur ez duzu zereginik esleituta.</p>';
        return;
    }

    tasks.forEach(function (info) {

        var taskBox =
            document.createElement("div");

        taskBox.className = "task";

        var row =
            document.createElement("div");

        row.className = "taskRow";

        var checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.checked =
            info.done;

        /*checkbox.addEventListener(
            "change",
            function () {

                setDone(
                    info.task.id,
                    currentUser,
                    today,
                    checkbox.checked
                );

                renderToday();
                refreshCalendar();
            }
        );*/

        checkbox.addEventListener(
            "change",
            async function () {

                await setDone(
                     info.task.id,
                     currentUser,
                     today,
                     checkbox.checked
                 );

                renderToday();
                refreshCalendar();
            }
        );

        var label =
            document.createElement("span");

        label.textContent =
            info.task.name;

        if (info.done) {
            label.classList.add("taskDone");
        }

        row.appendChild(checkbox);
        row.appendChild(label);

        taskBox.appendChild(row);

        container.appendChild(taskBox);
    });
}


/* =========================================================
   ESLEIPEN AKTIBOAK
   ========================================================= */

function getUserTasks(user, date) {

    return TASKS
        .map(function (task) {

            var users =
                assignedUsers(task, date);

            if (users.indexOf(user) === -1) {
                return null;
            }

            return {
                task: task,
                done: isDone(
                    task.id,
                    user,
                    date
                )
            };
        })
        .filter(function (item) {
            return item !== null;
        });
}

function assignedUsers(task, date) {

    var result = [];

    assignments.forEach(function (assignment) {

        if (assignment.taskId !== task.id) {
            return;
        }

        if (!activeOnDate(assignment, date)) {
            return;
        }

        var people = [];

        if (assignment.type === "single") {
            people =
                assignment.users.slice(0, 1);
        }

        if (assignment.type === "multiple") {
            people =
                assignment.users.slice();
        }

        if (assignment.type === "rotation") {

            var person =
                rotationPerson(
                    assignment,
                    date
                );

            if (person) {
                people = [person];
            }
        }

        people.forEach(function (person) {

            if (
                USERS.indexOf(person) !== -1 &&
                result.indexOf(person) === -1
            ) {
                result.push(person);
            }

        });

    });

    return result;
}


/* =========================================================
   MAIZTASUNAK
   ========================================================= */

function activeOnDate(assignment, date) {

    var key =
        dateKey(date);

    if (
        assignment.startDate &&
        key < assignment.startDate
    ) {
        return false;
    }

    if (assignment.frequency === "daily") {
        return true;
    }

    if (assignment.frequency === "weekly") {
        return (
            date.getDay() ===
            Number(assignment.weeklyDay)
        );
    }

    if (assignment.frequency === "specific") {

        return (
            assignment.specificDays.indexOf(
                String(date.getDay())
            ) !== -1
        );
    }

    if (assignment.frequency === "once") {
        return key === assignment.onceDate;
    }

    return false;
}


/* =========================================================
   TXANDAK
   ========================================================= */

function rotationPerson(assignment, date) {

    if (
        !assignment.users ||
        assignment.users.length === 0
    ) {
        return null;
    }

    var people =
        assignment.users.filter(function (user) {
            return USERS.indexOf(user) !== -1;
        });

    if (people.length === 0) {
        return null;
    }

    var index =
        rotationIndex(
            assignment,
            date
        );

    if (index < 0) {
        return null;
    }

    return people[index % people.length];
}

function rotationIndex(assignment, date) {

    var start =
        parseDate(assignment.startDate);

    if (!start) {
        return 0;
    }

    if (assignment.frequency === "daily") {

        return differenceDays(
            start,
            date
        );
    }

    if (assignment.frequency === "weekly") {

        return weeklyOccurrence(
            start,
            date,
            Number(assignment.weeklyDay)
        );
    }

    if (assignment.frequency === "specific") {

        return specificOccurrence(
            start,
            date,
            assignment.specificDays
        );
    }

    if (assignment.frequency === "once") {
        return 0;
    }

    return 0;
}

function weeklyOccurrence(
    start,
    target,
    weekday
) {

    if (target < start) {
        return -1;
    }

    var count = 0;

    var cursor =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );

    while (cursor <= target) {

        if (cursor.getDay() === weekday) {
            count++;
        }

        cursor.setDate(
            cursor.getDate() + 1
        );
    }

    return count - 1;
}

function specificOccurrence(
    start,
    target,
    days
) {

    if (target < start) {
        return -1;
    }

    var numbers =
        days.map(Number);

    if (numbers.length === 0) {
        return -1;
    }

    var count = 0;

    var cursor =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );

    while (cursor <= target) {

        if (
            numbers.indexOf(
                cursor.getDay()
            ) !== -1
        ) {
            count++;
        }

        cursor.setDate(
            cursor.getDate() + 1
        );
    }

    return count - 1;
}


/* =========================================================
   EGITEA
   ========================================================= */

function completionKey(
    taskId,
    user,
    date
) {

    return (
        dateKey(date) +
        "|" +
        user +
        "|" +
        taskId
    );
}

function isDone(
    taskId,
    user,
    date
) {

    return (
        completions[
            completionKey(
                taskId,
                user,
                date
            )
        ] === true
    );
}

async function setDone(
    taskId,
    user,
    date,
    done
) {

    var key =
        completionKey(
            taskId,
            user,
            date
        );

    if (done) {
        completions[key] = true;
        //console.log("COMPLETION GORDETZEKO:", key, completions);
        await saveCompletions();

    } else {
        delete completions[key];

         const { error } = await supabaseClient
            .from("Betetakoak")
             .delete()
            .eq("task_id", taskId)
            .eq("user", user)
             .eq("date", dateKey(date));

         if (error) {
            console.error(
                 "Errorea Betetakoak ezabatzean:",
                 error
            );
        }
    }

    
}


/* =========================================================
   EGUTEGIA
   ========================================================= */

function setupCalendar() {

    var previous =
        document.getElementById(
            "previousMonth"
        );

    var next =
        document.getElementById(
            "nextMonth"
        );

    if (previous) {

        previous.addEventListener(
            "click",
            function () {

                calendarDate.setMonth(
                    calendarDate.getMonth() - 1
                );

                selectedCalendarDate = null;

                refreshCalendar();
            }
        );
    }

    if (next) {

        next.addEventListener(
            "click",
            function () {

                calendarDate.setMonth(
                    calendarDate.getMonth() + 1
                );

                selectedCalendarDate = null;

                refreshCalendar();
            }
        );
    }
}


/* =========================================================
   EGUTEGIA BERRITU
   ========================================================= */

async function refreshCalendar() {

    /*
     * Aurreko egun hautatua garbitu.
     */
    selectedCalendarDate = null;

    /*
     * localStorage-ko azken datuak kargatu.
     *
     * currentUser EZ da hemen aldatzen.
     */
    await loadData();

    /*
     * renderCalendar()-ek berak garbitzen du
     * eta egutegia hutsetik marrazten du.
     */
    renderCalendar();

    /*
     * Ez dago egun hautaturik, beraz xehetasunak
     * "Aukeratu egun bat" erakutsiko du.
     */
    renderCalendarDetails();
}


/* =========================================================
   EGUTEGIA
   ========================================================= */

function renderCalendar() {

    var container =
        document.getElementById("calendarGrid");

    var title =
        document.getElementById("calendarTitle");

    if (!container || !title) {
        return;
    }

    /*
     * Aurreko egutegia garbitu.
     */
    container.innerHTML = "";

    title.textContent =
        calendarDate.toLocaleDateString(
            "eu-ES",
            {
                month: "long",
                year: "numeric"
            }
        );

    if (!currentUser) {

        container.innerHTML =
            '<p class="noTasks">Lehenengo aukeratu pertsona bat.</p>';

        return;
    }

    var grid =
        document.createElement("div");

    grid.className =
        "calendarGrid";

    var names = [
        "A",
        "A",
        "A",
        "O",
        "O",
        "L",
        "I"
    ];

    names.forEach(function (name) {

        var cell =
            document.createElement("div");

        cell.className =
            "calendarDayName";

        cell.textContent =
            name;

        grid.appendChild(cell);
    });

    var year =
        calendarDate.getFullYear();

    var month =
        calendarDate.getMonth();

    var first =
        new Date(
            year,
            month,
            1
        );

    var offset =
        (first.getDay() + 6) % 7;

    var total =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    var today =
        dateKey(new Date());

    for (
        var i = 0;
        i < offset;
        i++
    ) {

        var empty =
            document.createElement("div");

        empty.className =
            "calendarDay empty";

        grid.appendChild(empty);
    }

    for (
        var day = 1;
        day <= total;
        day++
    ) {

        var date =
            new Date(
                year,
                month,
                day
            );

        var key =
            dateKey(date);

        var cell =
            document.createElement("div");

        cell.className =
            "calendarDay";

        if (key === today) {
            cell.classList.add("today");
        }

        if (key === selectedCalendarDate) {
            cell.classList.add("selected");
        }

        var number =
            document.createElement("div");

        number.className =
            "calendarNumber";

        number.textContent =
            String(day);

        cell.appendChild(number);

        /*
         * UNEKO ERABILTZAILEAREN ZEREGINAK BAKARRIK.
         */
        var tasks =
            getUserTasks(
                currentUser,
                date
            );

        tasks.forEach(function (info) {

            var task =
                document.createElement("div");

            /*
             * Eginda = berdea
             * Egin gabe = gorria
             */
            task.className =
                "calendarTask " +
                (
                    info.done
                        ? "done"
                        : "todo"
                );

            task.textContent =
                info.task.name;

            cell.appendChild(task);
        });

        cell.addEventListener(
            "click",
            function () {

                selectedCalendarDate = key;

                renderCalendar();
                renderCalendarDetails();
            }
        );

        grid.appendChild(cell);
    }

    container.appendChild(grid);
}

function renderCalendarDetails() {

    var container =
        document.getElementById(
            "calendarDetails"
        );

    if (!container) {
        return;
    }

    if (!currentUser) {

        container.innerHTML =
            "<p>Lehenengo aukeratu pertsona bat.</p>";

        return;
    }

    if (!selectedCalendarDate) {

        container.innerHTML =
            "<p>Aukeratu egun bat.</p>";

        return;
    }

    var date =
        parseDate(
            selectedCalendarDate
        );

    if (!date) {
        return;
    }

    /*
     * UNEKO ERABILTZAILEAREN ZEREGINAK BAKARRIK.
     */
    var tasks =
        getUserTasks(
            currentUser,
            date
        );

    container.innerHTML = "";

    var title =
        document.createElement("h3");

    title.textContent =
        formatDisplayDate(date) +
        " — " +
        currentUser;

    container.appendChild(title);

    if (tasks.length === 0) {

        var none =
            document.createElement("p");

        none.className =
            "noTasks";

        none.textContent =
            "Egun honetan ez duzu zereginik.";

        container.appendChild(none);

        return;
    }

    tasks.forEach(function (info) {

        var item =
            document.createElement("div");

        item.className =
            "calendarDetailTask " +
            (
                info.done
                    ? "done"
                    : "todo"
            );

        var name =
            document.createElement("strong");

        name.textContent =
            info.task.name;

        var status =
            document.createElement("div");

        status.className =
            "calendarDetailStatus";

        status.textContent =
            info.done
                ? "🟢 Eginda"
                : "🔴 Egin gabe";

        item.appendChild(name);
        item.appendChild(status);

        container.appendChild(item);
    });
}


/* =========================================================
   DATA / TESTUA
   ========================================================= */

function dateKey(date) {

    var year =
        date.getFullYear();

    var month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    var day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}

function parseDate(value) {

    if (!value) {
        return null;
    }

    var parts =
        String(value).split("-");

    if (parts.length !== 3) {
        return null;
    }

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );
}

function differenceDays(
    start,
    end
) {

    var a =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );

    var b =
        new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
        );

    return Math.floor(
        (b - a) / 86400000
    );
}

function getTaskName(id) {

    var task =
        TASKS.find(function (item) {
            return item.id === id;
        });

    return task
        ? task.name
        : "Ezezaguna";
}

function weekdayName(day) {

    var names = [
        "Igandea",
        "Astelehena",
        "Asteartea",
        "Asteazkena",
        "Osteguna",
        "Ostirala",
        "Larunbata"
    ];

    return names[day] || "Ezezaguna";
}

function formatDisplayDate(date) {

    return date.toLocaleDateString(
        "eu-ES",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function updateTodayText() {

    var element =
        document.getElementById(
            "todayText"
        );

    if (!element) {
        return;
    }

    element.textContent =
        new Date().toLocaleDateString(
            "eu-ES",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}

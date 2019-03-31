chrome.runtime.onInstalled.addListener(() => {
    // Set default values on first run
    chrome.storage.local.set({
        focusTime: 25,
        breakTime: 5,
        longBreakTime: 15,
        longBreakThreshold: 4,
        streak: 0, // Pomodoros completed in a row
        description: "",
        apiKey: "",
        workspaceId: null, // Toggl default workspace ID
        entryId: null, // Toggl started entry ID
        state: 0 // 0 - stopped, 1 - running, 2 - on break
    });
});

chrome.alarms.onAlarm.addListener(alarm => {
    // Update time left on badge every minute
    if (alarm.name === "badgeTimer") {
        chrome.browserAction.getBadgeText({}, text => {
            chrome.browserAction.setBadgeText({text: parseInt(text) - 1 + 'm'});
        });
    }
    // Change state when timer expires
    if (alarm.name === "workTimer") {
        chrome.storage.local.set({state: 2});
    }
    if (alarm.name === "breakTimer") {
        chrome.storage.local.set({state: 1});
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        if ("state" in changes) {
            handleAlarm(changes.state.newValue);
        }
        if ("apiKey" in changes) {
            updateWorkspaceId(changes.apiKey.newValue);
        }
    }

});


function handleAlarm(state) {
    chrome.alarms.clearAll();
    chrome.browserAction.setBadgeText({text: ""});
    chrome.storage.local.get(null, settings => { // Get all stored values
        switch (state) {
            case 0:
                reset(settings);
                break;
            case 1:
                start(settings);
                break;
            case 2:
                pause(settings);
                break;
        }
    });
}

function pause(settings) {
    if (settings.apiKey) stopEntry(settings);
    let streak = settings.streak + 1;
    let breakTime = settings.breakTime;
    if (streak >= settings.longBreakThreshold) {
        chrome.storage.local.set({streak: 0});
        breakTime = settings.longBreakTime;
    } else chrome.storage.local.set({streak: streak});

    chrome.tabs.create({url: "break.html"});

    chrome.alarms.create("breakTimer", {delayInMinutes: breakTime});
    chrome.alarms.create("badgeTimer", {delayInMinutes: 1, periodInMinutes: 1});

    chrome.browserAction.setBadgeText({text: breakTime + "m"});
    chrome.browserAction.setBadgeBackgroundColor({color: "#11aa11"});
}

function reset(settings) {
    if (settings.apiKey) stopEntry(settings);
    chrome.storage.local.set({streak: 0});
}

function start(settings) {
    if (settings.apiKey) startEntry(settings);
    // Close break tab if open
    chrome.tabs.query({url: "chrome-extension://*/break.html"}, tabs => {
        tabs.map(tab => tab.id).forEach(i => chrome.tabs.remove(i));
    });

    chrome.notifications.create("pomodoro", {
        type: "basic",
        iconUrl: "icon128.png",
        title: "Pomodoro started",
        message: settings.longBreakThreshold - settings.streak + " more left until longer break",
    });

    chrome.alarms.create("workTimer", {delayInMinutes: settings.focusTime});
    chrome.alarms.create("badgeTimer", {delayInMinutes: 1, periodInMinutes: 1});

    chrome.browserAction.setBadgeText({text: settings.focusTime + "m"});
    chrome.browserAction.setBadgeBackgroundColor({color: "#bb0000"});

}

function updateWorkspaceId(apiKey) {
    fetch("https://www.toggl.com/api/v8/me", {
        credentials: "include",
        method: "GET",
        headers: {
            "Authorization": "Basic " + apiKey,
            "Content-Type": "application/json"
        }
    }).then(res => res.json())
        .then(json => chrome.storage.local.set({workspaceId: json.data["default_wid"]}))
        .catch(error => console.error(error));
}

function startEntry(settings) {
    fetch("https://www.toggl.com/api/v8/time_entries/start", {
        credentials: "include",
        method: "POST",
        headers: {
            "Authorization": "Basic " + settings.apiKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "time_entry": {
                "wid": settings.workspaceId,
                "description": settings.description,
                "created_with": "pomodoro_timer"
            }
        })
    }).then(res => res.json())
        .then(json => chrome.storage.local.set({entryId: json.data.id})) // Store id of created entry
        .catch(error => console.error(error));
}

function stopEntry(settings) {
    let entryId = settings.entryId;
    if (entryId != null) {
        fetch("https://www.toggl.com/api/v8/time_entries/" + entryId + "/stop", {
            credentials: "include",
            method: "PUT",
            headers: {
                "Authorization": "Basic " + settings.apiKey,
                "Content-Type": "application/json"
            },
        }).then(res => res.json())
            .then(json => {
                let duration = json.data.duration;
                if (duration > 0) chrome.storage.local.set({entryId: null}); // Clear stored entry id
            })
            .catch(error => console.error(error));
    }
}



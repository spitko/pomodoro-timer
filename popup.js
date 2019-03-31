document.addEventListener("DOMContentLoaded", () => {

    const buttonValues = ["Start pomodoro", "Skip to break", "Skip to pomodoro", "Stop pomodoro"];

    let settings = document.getElementsByTagName("input");
    Array.from(settings).forEach(element => {
        // Get input field values from storage
        getValue(element.id, value => element.value = value);
        // Store any changes in storage
        element.addEventListener("change", setValue, false);
    });

    let startButton = document.getElementById("startButton");
    let stopButton = document.getElementById("stopButton");
    // Set button values based on current timer state
    getValue("state", state => {
        updateButtons(state);
    });

    startButton.addEventListener("click", () => {
        getValue("state", state => {
            let newState;
            if (state === 2) { // Paused
                newState = 1; // Running
            } else newState = state + 1;

            setState(newState);
            updateButtons(newState);
        });
    }, false);

    stopButton.addEventListener("click", () => {
        setState(0);
        updateButtons(0);
    }, false);


    function setValue() {
        let value = this.value;
        if (this.type === "number") {
            value = parseInt(value);
        }
        if (this.type === "password") {
            // Store base64 encoding of api credentials
            value = btoa(value + ":api_token")
        }
        chrome.storage.local.set({[this.id]: value})
    }


    function getValue(key, callback) {
        chrome.storage.local.get(key, values => {
            callback(values[key]);
        });
    }

    function setState(state) {
        chrome.storage.local.set({state: state});
    }

    function updateButtons(state) {
        startButton.innerText = buttonValues[state];
        // Only show stop button if timer state is not stopped
        if (state > 0) {
            stopButton.innerText = buttonValues[3];
            stopButton.style.display = "block";
        } else {
            stopButton.style.display = "none";
        }
    }
});


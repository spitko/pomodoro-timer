document.addEventListener("DOMContentLoaded", () => {
    let fetchButton = document.getElementById("fetchButton");
    let img = document.getElementById("img");

    fetchImage(image => img.setAttribute("src", image));

    fetchButton.addEventListener("click", () => {
        fetchImage(image => img.setAttribute("src", image))
    });

    function fetchImage(callback) {
        fetch("https://dog.ceo/api/breeds/image/random")
            .then(res => res.json())
            .then(json => callback(json.message))
            .catch(error => console.error(error));
    }
});
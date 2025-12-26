const scriptURL = "https://script.google.com/macros/s/AKfycbxH7mYTWSsQTWZ83UTd81euAnPPvYr_7A7nbOafARtb6Royo7sqinD7C6KNlKZ2btc_/exec"; // isi dengan URL Apps Script kamu

async function loadUserList() {
  const response = await fetch(`${scriptURL}?action=getUserList`);
  const names = await response.json();

  const dropdown = document.getElementById("txt-input");

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    dropdown.appendChild(option);
  });
}

// Load saat halaman dibuka
window.onload = loadUserList;

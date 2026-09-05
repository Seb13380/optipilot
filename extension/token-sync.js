// Lit le token OptiPilot depuis localStorage et le stocke dans chrome.storage
// S'exécute sur optipilot.fr dès que la page charge
(function () {
  const token = localStorage.getItem("optipilot_token");
  if (token) {
    chrome.storage.local.set({ optipilot_token: token });
  }
})();

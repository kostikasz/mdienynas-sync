document.documentElement.dataset.js = "enabled";

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-theme-toggle]") : null;
  if (target) toggleTheme();
});

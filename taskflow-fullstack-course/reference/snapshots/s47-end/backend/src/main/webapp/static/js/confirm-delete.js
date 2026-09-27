// S35 (35.17): "Delete "<title>"?" before a delete form is submitted.
// The title comes from the form's data-confirm-title attribute, which the JSP wrote with fn:escapeXml:
// an HTML-attribute context, decoded by the browser into plain text here. No server data inside <script>.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.confirmTitle) return;
  if (!window.confirm(`Delete "${form.dataset.confirmTitle}"?`)) event.preventDefault();
});

// Turns the contact form into a ready-to-send email in the visitor's email app.
(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;
  var note = document.getElementById("cf-note");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.name.value.trim();
    var company = form.company.value.trim();
    var message = form.message.value.trim();
    if (!name || !message) {
      note.textContent = "Please add your name and a message.";
      return;
    }
    var subject = "Website message from " + name + (company ? " (" + company + ")" : "");
    var body = message + "\n\n" + name + (company ? "\n" + company : "");
    window.location.href = "mailto:manuelcantu55@yahoo.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    note.textContent = "Your email app should open now. If it doesn't, email manuelcantu55@yahoo.com directly.";
  });
})();

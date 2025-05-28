document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Aquí podrías validar el correo y la contraseña
  alert(`Intentando iniciar sesión con:\nCorreo: ${email}\nContraseña: ${'*'.repeat(password.length)}`);

  // Redireccionar o mostrar mensaje real según autenticación
});

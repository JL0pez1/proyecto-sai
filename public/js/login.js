document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar que la página recargue

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;
    const errorMensaje = document.getElementById('errorMensaje');

    try {
        const respuesta = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const datos = await respuesta.json();

        if (datos.exito) {
            // Guardamos el token y los datos del usuario en el navegador (Local Storage)
            localStorage.setItem('token', datos.token);
            localStorage.setItem('usuario', JSON.stringify(datos.usuario));
            
            // Redirigir al dashboard
            window.location.href = 'dashboard.html';
        } else {
            errorMensaje.innerText = datos.mensaje;
            errorMensaje.style.display = 'block';
        }
    } catch (error) {
        errorMensaje.innerText = 'Error al conectar con el servidor.';
        errorMensaje.style.display = 'block';
    }
});
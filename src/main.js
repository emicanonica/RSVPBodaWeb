import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  // 1. Logica del Sobre y Apertura
  const waxSeal = document.getElementById('wax-seal');
  const envelopeOverlay = document.getElementById('envelope-overlay');
  const mainContent = document.getElementById('main-content');
  const envelopeFlap = document.querySelector('.envelope-flap-top');
  const guestNameContainer = document.getElementById('guest-name');
  const guestContainer = document.getElementById('guest-container');
  const formNameInput = document.getElementById('form-name');

  // Parsear Parámetro de Invitado (URL ?invitado=Nombre o ?v=Base64)
  const urlParams = new URLSearchParams(window.location.search);
  let guestName = urlParams.get('invitado');
  const obfuscatedName = urlParams.get('v');

  if (obfuscatedName) {
    try {
      // Decodificar Base64 (maneja acentos y caracteres especiales correctamente)
      guestName = decodeURIComponent(escape(atob(obfuscatedName)));
    } catch (e) {
      console.warn("No se pudo decodificar el nombre ofuscado, intentando leer parámetro común.");
    }
  }

  if (guestName) {
    if (guestNameContainer) guestNameContainer.innerText = guestName;
    if (guestContainer) guestContainer.classList.remove('hidden');
    if (formNameInput) formNameInput.value = guestName;
  }

  waxSeal.addEventListener('click', () => {
    // Animación de romper el sello y abrir
    const tl = gsap.timeline();

    tl.to(waxSeal, { scale: 0, opacity: 0, duration: 0.4, ease: 'back.in(1.7)' })
      .to(envelopeFlap, { rotateX: 180, duration: 0.8, ease: 'power2.inOut', transformOrigin: "top" }, "-=0.2")
      .to('.envelope', { y: 100, opacity: 0, duration: 0.8, ease: 'power2.in' }, "+=0.2")
      .to(envelopeOverlay, { autoAlpha: 0, duration: 0.5 }, "-=0.3")
      .call(() => {
        // Mostrar contenido principal
        mainContent.classList.remove('hidden-content');
        gsap.to(mainContent, { autoAlpha: 1, duration: 1 });

        // Iniciar animaciones de scroll después de abrir
        initScrollAnimations();
        window.scrollTo(0, 0); // Asegurar que empiece arriba
      });
  });

  // 2. Animaciones de Scroll (GSAP ScrollTrigger)
  function initScrollAnimations() {
    const sections = document.querySelectorAll('.section > div, .section > h2');

    sections.forEach((el) => {
      // Add initial class
      el.classList.add('gsap-reveal');

      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out'
      });
    });
  }

  // 3. Lógica de Cuenta Regresiva
  const countDownDate = new Date("Nov 20, 2026 18:00:00").getTime();

  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  const x = setInterval(function () {
    const now = new Date().getTime();
    const distance = countDownDate - now;

    if (distance < 0) {
      clearInterval(x);
      document.getElementById("timer").innerHTML = "¡Es Hoy!";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Padding zeros
    daysEl.innerText = days < 10 ? '0' + days : days;
    hoursEl.innerText = hours < 10 ? '0' + hours : hours;
    minutesEl.innerText = minutes < 10 ? '0' + minutes : minutes;
    secondsEl.innerText = seconds < 10 ? '0' + seconds : seconds;
  }, 1000);

  // 4. Lógica del Formulario RSVP
  const rsvpForm = document.getElementById('rsvpForm');
  const formMessage = document.getElementById('form-message');
  const submitBtn = document.getElementById('submitBtn');

  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Estado de carga
    submitBtn.innerText = "Enviando...";
    submitBtn.disabled = true;

    // Recopilar datos
    const formData = new FormData(rsvpForm);
    const data = Object.fromEntries(formData.entries());

    try {
      // URL DEL GOOGLE APPS SCRIPT ASOCIADA AL EXCEL
      const scriptURL = 'https://script.google.com/macros/s/AKfycbxETZkHMbjrW6wNxN8-56Oxp9hp3bfAn_d6V7NlTEXM5dqkUf0samNLDmSZcZfPXEHB/exec';

      const payload = new URLSearchParams(data); // Prepara para application/x-www-form-urlencoded

      // Llamada real y silenciosa al servidor (mode: no-cors evita bloqueos del lado del browser)
      await fetch(scriptURL, {
        method: 'POST',
        body: payload,
        mode: 'no-cors'
      });

      formMessage.classList.remove('hidden', 'error');
      formMessage.classList.add('success');
      formMessage.innerText = "¡Gracias por confirmar! Tu respuesta ha sido guardada.";
      rsvpForm.reset();

    } catch (error) {
      console.error('Error!', error.message);
      formMessage.classList.remove('hidden', 'success');
      formMessage.classList.add('error');
      formMessage.innerText = "Hubo un error al enviar tu confirmación. Por favor, intenta de nuevo.";
    } finally {
      submitBtn.innerText = "Confirmar";
      submitBtn.disabled = false;
    }
  });

  // 5. Copiar al portapapeles (Alias, CBU, etc.)
  const copyableElements = document.querySelectorAll('.copyable');
  const copyMsg = document.getElementById('copy-message');

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      let textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise((res, rej) => {
        document.execCommand('copy') ? res() : rej();
        textArea.remove();
      });
    }
  }

  copyableElements.forEach(el => {
    el.addEventListener('click', () => {
      const text = el.getAttribute('data-copy');
      copyToClipboard(text).then(() => {
        if (copyMsg) {
          copyMsg.style.opacity = '1';
          setTimeout(() => {
            copyMsg.style.opacity = '0';
          }, 2000);
        }
      }).catch(err => {
        console.error('Error al copiar:', err);
      });
    });
  });
});

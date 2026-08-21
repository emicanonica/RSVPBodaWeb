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

  // 6. Lógica de Galería de Imágenes (Infinita, Sin Textos, Full-Width, Centrado al Clic y Escala Central)
  const galleryContainer = document.querySelector('.gallery-container');
  const galleryItems = document.querySelectorAll('.gallery-item');
  const SET_SIZE = 5; // Número de imágenes únicas por set

  if (galleryContainer && galleryItems.length >= SET_SIZE * 2) {
    let isMouseDown = false;
    let startX, scrollLeftPos;
    let touchStartX, touchScrollLeftPos;
    let autoScrollInterval = null;
    let isUserInteracting = false;
    let interactionTimeout = null;
    let isSmoothScrolling = false;

    // Calcular el ancho exacto de 1 set completo de imágenes
    function getSingleSetWidth() {
      if (galleryItems[SET_SIZE] && galleryItems[0]) {
        return galleryItems[SET_SIZE].offsetLeft - galleryItems[0].offsetLeft;
      }
      return 0;
    }

    // Comprobar y mantener el bucle infinito de forma invisible e ininterrumpida
    function checkInfiniteLoop() {
      const setWidth = getSingleSetWidth();
      if (!setWidth) return;

      if (galleryContainer.scrollLeft >= setWidth * 1.8) {
        galleryContainer.scrollLeft -= setWidth;
      } else if (galleryContainer.scrollLeft <= setWidth * 0.3) {
        galleryContainer.scrollLeft += setWidth;
      }
    }

    // Calcular y marcar cuál imagen está más cerca del centro del contenedor
    function updateCenterImage() {
      const containerRect = galleryContainer.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestItem = null;
      let minDistance = Infinity;

      galleryItems.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.left + itemRect.width / 2;
        const distance = Math.abs(containerCenter - itemCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestItem = item;
        }
      });

      galleryItems.forEach(item => {
        if (item === closestItem) {
          item.classList.add('is-center');
        } else {
          item.classList.remove('is-center');
        }
      });
    }

    // Centrar una imagen específica al hacer clic
    function centerItem(item) {
      isSmoothScrolling = true;
      const containerWidth = galleryContainer.clientWidth;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.clientWidth;

      const targetScroll = itemLeft - (containerWidth / 2) + (itemWidth / 2);

      galleryContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });

      setTimeout(() => {
        isSmoothScrolling = false;
      }, 500);
    }

    // Evento de clic en imágenes
    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        centerItem(item);
        handleUserInteraction();
      });
    });

    // Evento Scroll (actualiza el centro y mantiene el bucle infinito)
    galleryContainer.addEventListener('scroll', () => {
      checkInfiniteLoop();
      updateCenterImage();
    });

    // Arrastre con Mouse (Desktop)
    galleryContainer.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      galleryContainer.classList.add('is-dragging');
      startX = e.pageX - galleryContainer.offsetLeft;
      scrollLeftPos = galleryContainer.scrollLeft;
      handleUserInteraction();
    });

    galleryContainer.addEventListener('mouseleave', () => {
      isMouseDown = false;
      galleryContainer.classList.remove('is-dragging');
    });

    galleryContainer.addEventListener('mouseup', () => {
      isMouseDown = false;
      galleryContainer.classList.remove('is-dragging');
    });

    galleryContainer.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const x = e.pageX - galleryContainer.offsetLeft;
      const walk = (x - startX) * 0.8; // reducido de 1.6 → 0.8 para menor sensibilidad
      galleryContainer.scrollLeft = scrollLeftPos - walk;
    });

    // Arrastre táctil (Touch) con sensibilidad reducida
    galleryContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeftPos = galleryContainer.scrollLeft;
      handleUserInteraction();
    }, { passive: true });

    galleryContainer.addEventListener('touchmove', (e) => {
      if (touchStartX === undefined) return;
      const dx = touchStartX - e.touches[0].pageX;
      galleryContainer.scrollLeft = touchScrollLeftPos + dx * 0.65; // factor < 1 amortigua el deslizamiento
    }, { passive: true });

    galleryContainer.addEventListener('touchend', () => {
      touchStartX = undefined;
    }, { passive: true });

    // Pausar auto-scroll tras interacción y reanudar 3.5s después
    function handleUserInteraction() {
      isUserInteracting = true;
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        isUserInteracting = false;
      }, 3500);
    }

    galleryContainer.addEventListener('wheel', handleUserInteraction, { passive: true });

    // Auto-scroll continuo leve de izquierda a derecha
    function startAutoScroll() {
      autoScrollInterval = setInterval(() => {
        if (!isUserInteracting && !isMouseDown && !isSmoothScrolling) {
          galleryContainer.scrollLeft += 0.8;
        }
      }, 20);
    }

    // Inicializar centrado en el segundo set y arrancar el auto-scroll
    setTimeout(() => {
      const initialItem = galleryItems[SET_SIZE + 1] || galleryItems[1];
      if (initialItem) {
        centerItem(initialItem);
      }
      updateCenterImage();
      startAutoScroll();
    }, 300);
  }
});

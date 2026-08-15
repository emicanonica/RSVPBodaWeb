import './fotos.css';

// === CONFIGURACIÓN Y SERVICIO BACKEND ===
// URL pública del Web App de Google Apps Script (reemplazar por la del desplegado final)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwIh-iC8n_i8Sl5fD9hZ0yaybw3ZHtONozVRBcC0OwoxOgwCNhGXIVOeFPjMaN8GLNBHw/exec';
const LOCAL_STORAGE_ADMIN_KEY = 'boda_admin_key';
const LOCAL_STORAGE_GUEST_NAME = 'boda_guest_name';

document.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM
  const openUploadBtn = document.getElementById('open-upload-btn');
  const uploadModal = document.getElementById('upload-modal');
  const closeUploadModal = document.getElementById('close-upload-modal');
  const uploadForm = document.getElementById('upload-form');
  const photoInput = document.getElementById('photo-input');
  const fileDropZone = document.getElementById('file-drop-zone');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removePreviewBtn = document.getElementById('remove-preview-btn');
  const uploaderNameInput = document.getElementById('uploader-name');
  const uploaderCommentInput = document.getElementById('uploader-comment');
  const submitUploadBtn = document.getElementById('submit-upload-btn');
  const uploadStatusMsg = document.getElementById('upload-status-msg');

  const photosGrid = document.getElementById('photos-grid');
  const loadingSpinner = document.getElementById('loading-spinner');
  const emptyState = document.getElementById('empty-state');

  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxAuthor = document.getElementById('lightbox-author');
  const lightboxComment = document.getElementById('lightbox-comment');
  const lightboxDownload = document.getElementById('lightbox-download');
  const closeLightbox = document.getElementById('close-lightbox');

  const lightboxVideo = document.getElementById('lightbox-video');
  const lightboxIframe = document.getElementById('lightbox-iframe');
  const prevLightboxBtn = document.getElementById('prev-lightbox-btn');
  const nextLightboxBtn = document.getElementById('next-lightbox-btn');

  const lightboxAdminActions = document.getElementById('lightbox-admin-actions');
  const lightboxApproveBtn = document.getElementById('lightbox-approve-btn');
  const lightboxRejectBtn = document.getElementById('lightbox-reject-btn');
  const lightboxModeratedBadge = document.getElementById('lightbox-moderated-badge');

  const uploadSpinnerOverlay = document.getElementById('upload-spinner-overlay');
  const uploadProgressText = document.getElementById('upload-progress-text');

  const adminTriggerBtn = document.getElementById('admin-trigger-btn');
  const adminModal = document.getElementById('admin-modal');
  const closeAdminModal = document.getElementById('close-admin-modal');
  const adminForm = document.getElementById('admin-form');
  const adminKeyInput = document.getElementById('admin-key-input');
  const adminErrorMsg = document.getElementById('admin-error-msg');
  const adminBanner = document.getElementById('admin-banner');
  const tabApproved = document.getElementById('tab-approved');
  const tabPending = document.getElementById('tab-pending');
  const pendingCountBadge = document.getElementById('pending-count');
  const logoutAdminBtn = document.getElementById('logout-admin-btn');
  const reloadGalleryBtn = document.getElementById('reload-gallery-btn');

  let currentPhotos = [];
  let currentFilteredPhotos = [];
  let currentLightboxIndex = -1;
  let selectedFiles = []; // Array de objetos { name, mime, base64 }
  let activeTab = 'aprobada'; // 'aprobada' o 'pendiente'

  // Pre-llenar Nombre de Invitado desde URL ?invitado=Nombre o LocalStorage
  const urlParams = new URLSearchParams(window.location.search);
  let guestName = urlParams.get('invitado') || localStorage.getItem(LOCAL_STORAGE_GUEST_NAME);
  if (guestName) {
    uploaderNameInput.value = guestName;
  }

  // === 1. CARGA DE FOTOS DESDE EL BACKEND ===
  async function loadPhotos() {
    loadingSpinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    photosGrid.innerHTML = '';

    const adminKey = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
    let requestUrl = SCRIPT_URL;
    if (adminKey) {
      requestUrl += `?key=${encodeURIComponent(adminKey)}`;
    }

    try {
      const response = await fetch(requestUrl);
      const data = await response.json();

      console.log('[DEBUG] Respuesta backend loadPhotos:', data);

      if (data.success) {
        currentPhotos = data.photos || [];

        if (data.isAdmin) {
          adminBanner.classList.remove('hidden');
          updatePendingBadge();
        } else {
          adminBanner.classList.add('hidden');
          // Si tenemos una key guardada pero el backend dice que NO es admin,
          // la clave es incorrecta — limpiarla
          if (adminKey) {
            localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
            adminErrorMsg.classList.remove('hidden');
            adminModal.classList.remove('hidden');
          }
        }

        renderGrid();
      } else {
        console.error('[ERROR] Backend devolvió error:', data.error);
        showEmptyState("No se pudieron cargar las fotos.");
      }
    } catch (error) {
      console.error("[ERROR] Fallo al contactar el backend:", error);
      // Solo mostrar demo si es la primera carga sin admin
      if (!adminKey) {
        showDemoPhotos();
      } else {
        showEmptyState("Error de conexión con el servidor.");
      }
    } finally {
      loadingSpinner.classList.add('hidden');
    }
  }

  // Si el backend aún no está configurado, mostrar fotos de demostración locales
  function showDemoPhotos() {
    currentPhotos = [
      { id: '1', url: '/assets/hero.png', name: 'Lucia & Emilio', comment: '¡Bienvenidos!', status: 'aprobada' },
      { id: '2', url: '/assets/dresscode.png', name: 'Inspiración', comment: 'Dress Code Formal', status: 'aprobada' },
      { id: '3', url: '/assets/mapa.png', name: 'Quinta Pepe Reina', comment: 'Ubicación', status: 'aprobada' }
    ];
    renderGrid();
  }

  function updatePendingBadge() {
    const pending = currentPhotos.filter(p => p.status === 'pendiente');
    pendingCountBadge.innerText = pending.length;
  }

  // === 2. RENDERIZADO DE LA GRILLA ===
  function renderGrid() {
    photosGrid.innerHTML = '';
    const adminKey = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);

    let filteredPhotos = currentPhotos;
    if (adminKey) {
      filteredPhotos = currentPhotos.filter(p => p.status === activeTab);
    } else {
      filteredPhotos = currentPhotos.filter(p => p.status === 'aprobada');
    }

    currentFilteredPhotos = filteredPhotos;

    if (filteredPhotos.length === 0) {
      showEmptyState(activeTab === 'pendiente' ? "No hay fotos pendientes de moderar." : "¡Todavía no hay fotos publicadas!");
      return;
    }

    emptyState.classList.add('hidden');

    filteredPhotos.forEach((photo, index) => {
      const card = document.createElement('div');
      card.className = 'photo-card';

      let adminActionsHtml = '';
      if (adminKey && photo.status === 'pendiente') {
        adminActionsHtml = `
          <div class="admin-card-actions">
            <button class="btn-admin-action btn-approve" data-row="${photo.row}" data-action="approve">✅ Aprobar</button>
            <button class="btn-admin-action btn-reject" data-row="${photo.row}" data-action="reject">🗑️ Rechazar</button>
          </div>
        `;
      } else if (adminKey && photo.status === 'aprobada') {
        adminActionsHtml = `
          <div class="admin-card-actions">
            <button class="btn-admin-action btn-delete" data-row="${photo.row}" data-action="delete">🗑️ Eliminar</button>
          </div>
        `;
      }

      // Detectar si es video usando mimeType del backend
      const isVideo = photo.mimeType && photo.mimeType.startsWith('video/');

      let mediaHtml;
      if (isVideo) {
        // En Cloudinary, podemos obtener la miniatura de un video simplemente cambiando su extensión a .jpg
        const thumbUrl = photo.url.replace(/\.(mp4|mov|webm|avi|mkv)$/i, '.jpg');

        mediaHtml = `
          <div class="video-thumb-wrapper">
            <img src="${thumbUrl}" alt="Video de ${escapeHtml(photo.name)}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;" />
            <div class="video-play-overlay">
              <svg viewBox="0 0 24 24" fill="white" width="52" height="52">
                <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.55)"/>
                <polygon points="9.5,7 18,12 9.5,17" fill="white"/>
              </svg>
            </div>
          </div>`;
      } else {
        mediaHtml = `<img src="${photo.url}" alt="Foto de ${escapeHtml(photo.name)}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;" />`;
      }

      card.innerHTML = `
        ${adminActionsHtml}
        ${mediaHtml}
        <div class="photo-card-overlay">
          <p class="photo-author">${isVideo ? '🎬' : '📸'} ${escapeHtml(photo.name)}</p>
          ${photo.comment ? `<p class="photo-comment">${escapeHtml(photo.comment)}</p>` : ''}
        </div>
      `;

      // Clic en la tarjeta abre Lightbox
      card.addEventListener('click', (e) => {
        if (e.target.closest('.admin-card-actions')) return;
        openLightbox(photo, index);
      });

      // Botones de moderación en tarjeta (pendientes)
      if (adminKey && photo.status === 'pendiente') {
        const approveBtn = card.querySelector('.btn-approve');
        const rejectBtn = card.querySelector('.btn-reject');

        if (approveBtn) {
          approveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moderatePhoto(photo.row, 'approve');
          });
        }
        if (rejectBtn) {
          rejectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moderatePhoto(photo.row, 'reject');
          });
        }
      }

      // Botón eliminar en tarjeta (aprobadas, solo admin)
      if (adminKey && photo.status === 'aprobada') {
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar definitivamente este recurso? Se quitará de la galería.')) {
              deletePhoto(photo.row);
            }
          });
        }
      }

      photosGrid.appendChild(card);
    });
  }

  function deletePhoto(row) {
    const adminKey = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
    if (!adminKey) return;

    fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'delete',
        key: adminKey,
        row: row
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          loadPhotos();
        } else {
          alert('Error al eliminar: ' + res.error);
        }
      })
      .catch(err => console.error(err));
  }

  function showEmptyState(msg) {
    emptyState.querySelector('p').innerText = msg;
    emptyState.classList.remove('hidden');
  }


  // === 3. COMPRESIÓN DE IMAGEN EN CLIENTE & SUBIDA ===
  const previewGrid = document.getElementById('preview-grid');
  photoInput.addEventListener('change', handleFileSelect);

  function handleFileSelect(e) {
    let rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    if (rawFiles.length > 10) {
      alert("Podés subir hasta un máximo de 10 archivos a la vez. Solo se procesarán los primeros 10.");
      rawFiles = rawFiles.slice(0, 10);
    }

    const files = [];
    rawFiles.forEach(file => {
      if (file.type.startsWith('video/') && file.size > 50 * 1024 * 1024) {
        alert(`El video "${file.name}" supera el límite de 50MB y no será subido.`);
      } else {
        files.push(file);
      }
    });

    if (!files.length) {
      photoInput.value = '';
      return;
    }

    selectedFiles = [];
    previewGrid.innerHTML = '';

    let processed = 0;
    const total = files.length;

    files.forEach((file, index) => {
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          selectedFiles.push({
            name: file.name,
            mime: file.type,
            base64: event.target.result,
            file: file // Archivo original para subir a Cloudinary
          });
          const thumb = document.createElement('div');
          thumb.className = 'preview-thumb';
          thumb.innerHTML = `<video src="${event.target.result}" controls style="width: 100%; height: 100%; object-fit: contain; background: #000;"></video>`;
          previewGrid.appendChild(thumb);

          processed++;
          if (processed === total) {
            previewContainer.classList.remove('hidden');
            fileDropZone.classList.add('hidden');
          }
        };
        reader.readAsDataURL(file);
      } else {
        compressImage(file, 1200, 0.85, (base64Data) => {
          selectedFiles.push({
            name: file.name,
            mime: file.type || 'image/jpeg',
            base64: base64Data,
            file: file // Archivo original para subir a Cloudinary
          });

          // Miniatura en la grilla de vista previa
          const thumb = document.createElement('div');
          thumb.className = 'preview-thumb';
          thumb.innerHTML = `<img src="${base64Data}" alt="Foto ${index + 1}" />`;
          previewGrid.appendChild(thumb);

          processed++;
          if (processed === total) {
            previewContainer.classList.remove('hidden');
            fileDropZone.classList.add('hidden');
          }
        });
      }
    });
  }

  removePreviewBtn.addEventListener('click', () => {
    selectedFiles = [];
    photoInput.value = '';
    previewGrid.innerHTML = '';
    previewContainer.classList.add('hidden');
    fileDropZone.classList.remove('hidden');
  });

  // Compresión en cliente usando HTMLCanvas
  function compressImage(file, maxDimension, quality, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
        callback(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Formulario de Envío (múltiples fotos)
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = uploaderNameInput.value.trim();
    const comment = uploaderCommentInput.value.trim();

    if (!name) {
      showUploadStatus('Por favor, ingresá tu nombre', 'error');
      return;
    }

    if (!selectedFiles.length) {
      showUploadStatus('Por favor, seleccioná al menos una foto', 'error');
      return;
    }

    // Guardar nombre en localStorage
    localStorage.setItem(LOCAL_STORAGE_GUEST_NAME, name);

    submitUploadBtn.disabled = true;
    if (uploadSpinnerOverlay) uploadSpinnerOverlay.classList.remove('hidden'); // Mostrar spinner

    const total = selectedFiles.length;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i++) {
      const fileObj = selectedFiles[i];
      if (uploadProgressText) uploadProgressText.innerText = `Subiendo archivo ${i + 1} de ${total}...`;
      showUploadStatus(`Subiendo archivo ${i + 1} de ${total}...`, 'info');

      try {
        // 1. Subir a Cloudinary
        const formData = new FormData();
        formData.append('file', fileObj.file);
        formData.append('upload_preset', 'Boda_Uploads');

        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/cl33vqnr/auto/upload`, {
          method: 'POST',
          body: formData
        });

        const cloudinaryData = await cloudinaryResponse.json();

        if (!cloudinaryResponse.ok) {
          throw new Error(cloudinaryData.error?.message || 'Error en Cloudinary');
        }

        // 2. Enviar metadatos a Google Apps Script
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload',
            name: name,
            comment: comment,
            public_id: cloudinaryData.public_id,
            secure_url: cloudinaryData.secure_url,
            mimeType: fileObj.mime
          })
        });

        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          console.error('Error guardando metadatos:', result.error);
        }
      } catch (err) {
        console.error('Error al procesar archivo:', err);
        failCount++;
      }
    }

    if (uploadSpinnerOverlay) uploadSpinnerOverlay.classList.add('hidden'); // Ocultar spinner
    submitUploadBtn.disabled = false;
    submitUploadBtn.innerText = 'Enviar';

    if (failCount === 0) {
      const msg = total === 1
        ? '¡Gracias! Tu archivo ha sido enviado y estará visible tras la moderación.'
        : `¡Gracias! Tus ${successCount} archivos fueron enviados y estarán visibles tras la moderación.`;
      showUploadStatus(msg, 'success');
    } else {
      showUploadStatus(`${successCount} foto(s) enviadas correctamente, ${failCount} fallaron. Intenta de nuevo.`, 'error');
    }

    setTimeout(() => {
      closeModal(uploadModal);
      resetUploadForm();
      loadPhotos();
    }, 2500);
  });

  function showUploadStatus(msg, type) {
    uploadStatusMsg.innerText = msg;
    uploadStatusMsg.className = `form-message ${type}`;
    uploadStatusMsg.classList.remove('hidden');
  }

  function resetUploadForm() {
    uploadForm.reset();
    if (guestName) uploaderNameInput.value = guestName;
    selectedFiles = [];
    if (previewGrid) previewGrid.innerHTML = '';
    previewContainer.classList.add('hidden');
    fileDropZone.classList.remove('hidden');
    uploadStatusMsg.classList.add('hidden');
    submitUploadBtn.innerText = 'Enviar Fotos';
  }

  // === 4. LIGHTBOX VISOR ===
  function openLightbox(photo, index) {
    currentLightboxIndex = index;
    const url = photo.url || '';

    // 1. Ocultar medios, pausar video y limpiar fuentes
    lightboxImg.classList.add('hidden');
    lightboxVideo.classList.add('hidden');
    lightboxIframe.classList.add('hidden');

    lightboxVideo.pause();
    lightboxVideo.src = '';
    lightboxIframe.src = '';

    // 2. Reproducir usando URL directa de Cloudinary
    const isVideo = photo.mimeType && photo.mimeType.startsWith('video/');
    const isImage = (photo.mimeType && photo.mimeType.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);

    if (isVideo) {
      lightboxVideo.src = url;
      lightboxVideo.load();
      lightboxVideo.classList.remove('hidden');
    } else if (isImage) {
      lightboxImg.src = url;
      lightboxImg.classList.remove('hidden');
    } else {
      lightboxIframe.src = url;
      lightboxIframe.classList.remove('hidden');
    }

    lightboxAuthor.innerText = `Subida por ${photo.name}`;
    lightboxComment.innerText = photo.comment || '';
    lightboxDownload.href = photo.url;

    // Añadir botón abrir en nueva pestaña
    const openNewBtnId = 'lightbox-open-new';
    let openNewBtn = document.getElementById(openNewBtnId);
    if (!openNewBtn) {
      openNewBtn = document.createElement('a');
      openNewBtn.id = openNewBtnId;
      openNewBtn.className = 'btn secondary-btn open-new-btn';
      openNewBtn.target = '_blank';
      openNewBtn.rel = 'noopener noreferrer';
      openNewBtn.innerText = '↗️ Abrir original';
      const bottomBar = document.querySelector('.lightbox-bottombar');
      bottomBar.appendChild(openNewBtn);
    }
    openNewBtn.href = photo.url;

    // Admin controls
    const adminKey = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
    if (adminKey && activeTab === 'pendiente') {
      if (photo._moderated) {
        lightboxAdminActions.classList.add('hidden');
        lightboxModeratedBadge.innerText = photo._moderated === 'approve' ? '✅ Aprobada' : '🗑️ Rechazada';
        lightboxModeratedBadge.classList.remove('hidden');
      } else {
        lightboxModeratedBadge.classList.add('hidden');
        lightboxAdminActions.classList.remove('hidden');
      }
    } else {
      lightboxAdminActions.classList.add('hidden');
      lightboxModeratedBadge.classList.add('hidden');
    }

    // Botón play/pause custom — no aplica cuando usamos iframe (Drive tiene sus propios controles)
    const playPauseBtn = document.getElementById('lightbox-play-pause');
    if (playPauseBtn) playPauseBtn.classList.add('hidden');

    openModal(lightboxModal);
  }

  if (lightboxApproveBtn) {
    lightboxApproveBtn.addEventListener('click', () => {
      const photo = currentFilteredPhotos[currentLightboxIndex];
      if (photo) {
        moderatePhoto(photo.row, 'approve', true);
        photo._moderated = 'approve';
        lightboxAdminActions.classList.add('hidden');
        lightboxModeratedBadge.innerText = '✅ Aprobada';
        lightboxModeratedBadge.classList.remove('hidden');
      }
    });
  }

  if (lightboxRejectBtn) {
    lightboxRejectBtn.addEventListener('click', () => {
      const photo = currentFilteredPhotos[currentLightboxIndex];
      if (photo) {
        moderatePhoto(photo.row, 'reject', true);
        photo._moderated = 'reject';
        lightboxAdminActions.classList.add('hidden');
        lightboxModeratedBadge.innerText = '🗑️ Rechazada';
        lightboxModeratedBadge.classList.remove('hidden');
      }
    });
  }

  window.addEventListener('popstate', (e) => {
    const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    openModals.forEach(modal => {
      modal.classList.add('hidden');
      if (modal.id === 'lightbox-modal') {
        lightboxVideo.pause();
      }
    });
  });

  function navigateLightbox(step) {
    if (currentLightboxIndex === -1) return;
    const newIndex = currentLightboxIndex + step;
    if (newIndex >= 0 && newIndex < currentFilteredPhotos.length) {
      lightboxVideo.pause(); // stop current if video
      openLightbox(currentFilteredPhotos[newIndex], newIndex);
    }
  }

  if (prevLightboxBtn) prevLightboxBtn.addEventListener('click', () => navigateLightbox(-1));
  if (nextLightboxBtn) nextLightboxBtn.addEventListener('click', () => navigateLightbox(1));

  document.addEventListener('keydown', (e) => {
    if (!lightboxModal.classList.contains('hidden')) {
      if (e.key === 'ArrowRight') navigateLightbox(1);
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'Escape') {
        closeModal(lightboxModal);
      }
    }
  });

  closeLightbox.addEventListener('click', () => {
    const videoEl = document.getElementById('lightbox-video');
    if (videoEl) videoEl.pause();
    closeModal(lightboxModal);
  });

  // === 5. MODERACIÓN Y PANEL ADMIN ===
  adminTriggerBtn.addEventListener('click', () => {
    const savedKey = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
    if (savedKey) {
      loadPhotos();
    } else {
      openModal(adminModal);
    }
  });

  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = adminKeyInput.value.trim();
    adminErrorMsg.classList.add('hidden');

    if (!key) {
      adminErrorMsg.classList.remove('hidden');
      return;
    }

    // Verificar la clave contra el backend antes de guardarla
    try {
      const testUrl = `${SCRIPT_URL}?key=${encodeURIComponent(key)}`;
      const response = await fetch(testUrl);
      const data = await response.json();

      console.log('[DEBUG] Verificación de clave admin:', data);

      if (data.success && data.isAdmin) {
        // Clave correcta: guardar y cargar
        localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, key);
        adminModal.classList.add('hidden');
        adminKeyInput.value = '';
        currentPhotos = data.photos || [];
        adminBanner.classList.remove('hidden');
        updatePendingBadge();
        activeTab = 'pendiente'; // Abrir directo en pestaña Pendientes
        tabPending.classList.add('active');
        tabApproved.classList.remove('active');
        renderGrid();
        loadingSpinner.classList.add('hidden');
      } else {
        // Clave incorrecta
        adminErrorMsg.innerText = 'Clave incorrecta';
        adminErrorMsg.classList.remove('hidden');
      }
    } catch (err) {
      console.error('[ERROR] al verificar clave admin:', err);
      adminErrorMsg.innerText = 'Error de conexión. Intenta de nuevo.';
      adminErrorMsg.classList.remove('hidden');
    }
  });

  logoutAdminBtn.addEventListener('click', () => {
    localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
    adminBanner.classList.add('hidden');
    activeTab = 'aprobada';
    loadPhotos();
  });

  tabApproved.addEventListener('click', () => {
    activeTab = 'aprobada';
    tabApproved.classList.add('active');
    tabPending.classList.remove('active');
    renderGrid();
  });

  tabPending.addEventListener('click', () => {
    activeTab = 'pendiente';
    tabPending.classList.add('active');
    tabApproved.classList.remove('active');
    renderGrid();
  });

  async function moderatePhoto(row, action, skipReload = false) {
    const key = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
    if (!key) return;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'moderate',
          key: key,
          row: row,
          moderateAction: action
        })
      });

      const result = await response.json();
      if (result.success) {
        if (!skipReload) {
          loadPhotos();
        } else {
          const targetPhoto = currentPhotos.find(p => p.row === row);
          if (targetPhoto) {
            targetPhoto.status = (action === 'approve') ? 'aprobada' : 'rechazada';
          }
        }
      } else {
        alert(result.error || 'Error al moderar la foto');
      }
    } catch (e) {
      console.error("Error al moderar:", e);
      // Actualizar localmente para pruebas rápidas
      const targetPhoto = currentPhotos.find(p => p.row === row);
      if (targetPhoto) {
        targetPhoto.status = (action === 'approve') ? 'aprobada' : 'rechazada';
        if (!skipReload) {
          updatePendingBadge();
          renderGrid();
        }
      }
    }
  }

  // === 6. MODALES Y UTILIDADES ===
  openUploadBtn.addEventListener('click', () => openModal(uploadModal));
  closeUploadModal.addEventListener('click', () => closeModal(uploadModal));
  closeAdminModal.addEventListener('click', () => closeModal(adminModal));

  if (reloadGalleryBtn) {
    reloadGalleryBtn.addEventListener('click', () => {
      reloadGalleryBtn.style.transform = 'rotate(360deg)';
      reloadGalleryBtn.style.transition = 'transform 0.5s ease';
      setTimeout(() => {
        reloadGalleryBtn.style.transform = 'none';
        reloadGalleryBtn.style.transition = 'none';
      }, 500);
      loadPhotos();
    });
  }

  function openModal(modal) {
    const wasHidden = modal.classList.contains('hidden');
    modal.classList.remove('hidden');
    if (wasHidden) {
      history.pushState({ modalOpen: true }, '');
    }
  }

  function closeModal(modal) {
    if (!modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
      if (modal.id === 'lightbox-modal') {
        if (typeof lightboxVideo !== 'undefined') lightboxVideo.pause();
        if (lightboxIframe) lightboxIframe.src = '';
        if (lightboxVideo) lightboxVideo.src = '';

        if (activeTab === 'pendiente') {
          // Remover moderados localmente
          currentPhotos = currentPhotos.filter(p => !p._moderated || p.status === 'pendiente');
          updatePendingBadge();
          renderGrid();
        }
      }

      if (history.state && history.state.modalOpen) {
        history.back();
      }
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // === 7. PREVENIR SALIDA ACCIDENTAL DE LA PÁGINA ===
  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = ''; // Requerido por la mayoría de los navegadores modernos para mostrar el cartel
  });

  // Inicializar carga de fotos
  loadPhotos();
});

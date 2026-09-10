// ====== COSTUMES & PROPS MODULE ======

let costumesList = [];
let filteredCategory = 'ALL';
let filteredSize = 'ALL';
let currentFormImages = []; // Danh sách tất cả các ảnh đã tải lên của sản phẩm hiện tại
let currentCoverImage = ''; // Đường dẫn ảnh đại diện được chọn hiển thị ngoài web

async function loadCostumes(searchQuery = '') {
  try {
    let url = `/api/costumes?search=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(url);
    costumesList = await res.json();

    applyCostumeFilters();
  } catch (err) {
    showToast('Lỗi khi tải danh sách trang phục: ' + err.message, 'error');
  }
}

function filterCostumesByCategory(catId, btnEl) {
  filteredCategory = catId;
  document.querySelectorAll('.filter-cat-btn').forEach(b => {
    b.classList.remove('active', 'btn-primary');
    b.classList.add('btn-secondary');
  });
  if (btnEl) {
    btnEl.classList.remove('btn-secondary');
    btnEl.classList.add('active', 'btn-primary');
  }
  applyCostumeFilters();
}

function filterCostumesBySize(size) {
  filteredSize = size;
  applyCostumeFilters();
}

function applyCostumeFilters() {
  let result = costumesList;

  if (filteredCategory !== 'ALL') {
    result = result.filter(item => String(item.category_id) === String(filteredCategory));
  }

  if (filteredSize !== 'ALL') {
    result = result.filter(item => String(item.size).toLowerCase() === String(filteredSize).toLowerCase());
  }

  renderCostumesGrid(result);
}

function renderCostumesGrid(items) {
  const container = document.getElementById('costumes-container');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Không tìm thấy trang phục/đạo cụ phù hợp.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    // Parse danh sách nhiều ảnh nếu có
    let imgList = [];
    if (Array.isArray(item.images)) imgList = item.images;
    else if (typeof item.images === 'string' && item.images) {
      try { imgList = JSON.parse(item.images); } catch(e) {}
    }
    if (imgList.length === 0 && item.image_url) imgList = [item.image_url];

    const mainCover = item.image_url || (imgList.length > 0 ? imgList[0] : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60');
    const isAdmin = Boolean(currentUser);

    return `
      <div class="costume-card glass-card" onclick="openCostumeDetail(${item.id})" style="cursor: pointer;">
        <div class="costume-img-wrapper">
          <img src="${mainCover}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60'">
          <span class="costume-badge-size">${item.size}</span>
          ${imgList.length > 1 ? `<span style="position: absolute; bottom: 8px; left: 8px; background: rgba(15,23,42,0.75); color: #fff; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;"><i class="fa-solid fa-images"></i> ${imgList.length} ảnh</span>` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <h4 class="costume-title">${item.name}</h4>
          <span class="badge ${item.status === 'AVAILABLE' ? 'badge-success' : 'badge-danger'}">
            ${item.status === 'AVAILABLE' ? 'Sẵn có' : 'Hết đồ'}
          </span>
        </div>
        <div class="costume-info-row">
          <span>Mã: <strong>${item.code}</strong></span>
          <span>Kho: <strong>${item.available_qty} / ${item.total_qty}</strong></span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;" onclick="event.stopPropagation();">
          <span class="costume-price">${formatVND(item.price_per_day)} <small style="font-size: 10px; color: var(--text-muted); font-weight: normal;">/ ngày</small></span>
          <div style="display: flex; gap: 6px;">
            ${isAdmin ? `
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editCostume(${item.id})">
                <i class="fa-solid fa-pen"></i> Sửa
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openCostumeDetail(${item.id})">
                <i class="fa-solid fa-eye"></i> Xem Chi Tiết
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Open Costume detail showcase modal for Guests & Admin
function openCostumeDetail(id) {
  const item = costumesList.find(c => c.id === id);
  if (!item) return;

  // Parse images
  let imgList = [];
  if (Array.isArray(item.images)) imgList = item.images;
  else if (typeof item.images === 'string' && item.images) {
    try { imgList = JSON.parse(item.images); } catch(e) {}
  }
  if (imgList.length === 0 && item.image_url) imgList = [item.image_url];
  const mainCover = item.image_url || (imgList.length > 0 ? imgList[0] : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=60');

  document.getElementById('detail-costume-name').innerText = item.name;
  document.getElementById('detail-title').innerText = item.name;
  document.getElementById('detail-code').innerText = `Mã sản phẩm: ${item.code}`;
  document.getElementById('detail-size-badge').innerText = item.size || 'FREE';
  document.getElementById('detail-price').innerHTML = `${formatVND(item.price_per_day)} <small style="font-size: 12px; color: var(--text-muted); font-weight: normal;">/ ngày</small>`;
  document.getElementById('detail-deposit').innerText = formatVND(item.deposit_fee || 0);
  document.getElementById('detail-qty').innerText = `${item.available_qty} / ${item.total_qty} bộ sẵn sàng`;
  document.getElementById('detail-desc').innerText = item.description || 'Sản phẩm phục vụ biểu diễn sân khấu, nghệ thuật, múa dân tộc và sự kiện.';

  const statusBadge = document.getElementById('detail-status');
  if (statusBadge) {
    statusBadge.className = `badge ${item.status === 'AVAILABLE' ? 'badge-success' : 'badge-danger'}`;
    statusBadge.innerText = item.status === 'AVAILABLE' ? 'Sẵn có' : 'Hết đồ';
  }

  // Set Main image & Thumbnails
  const mainImgEl = document.getElementById('detail-main-img');
  mainImgEl.src = mainCover;

  const thumbsContainer = document.getElementById('detail-gallery-thumbs');
  if (thumbsContainer) {
    if (imgList.length <= 1) {
      thumbsContainer.innerHTML = '';
    } else {
      thumbsContainer.innerHTML = imgList.map((url, idx) => `
        <img src="${url}" onclick="document.getElementById('detail-main-img').src='${url}'" 
          style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; border: 2px solid ${url === mainCover ? 'var(--primary)' : 'var(--border)'}; cursor: pointer; flex-shrink: 0;"
          onmouseover="this.style.borderColor='var(--primary)'">
      `).join('');
    }
  }

  openModal('modal-costume-detail');
}

function openCostumeModalForCreate() {
  resetCostumeForm();
  document.getElementById('modal-costume-title').innerText = 'Thêm Mẫu Trang Phục / Đạo Cụ Mới';
  openModal('modal-costume');
}


// Xử lý upload 1 hoặc nhiều ảnh cùng lúc từ camera / điện thoại
async function uploadMultipleCostumeImages(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const statusText = document.getElementById('upload-status-text');
  if (statusText) statusText.innerText = `Đang tải ${files.length} ảnh...`;

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }

  const token = localStorage.getItem('tpbd_token');

  try {
    const res = await fetch('/api/costumes/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Tải ảnh thất bại!');

    const uploadedUrls = data.image_urls || [data.image_url];
    currentFormImages = [...currentFormImages, ...uploadedUrls];

    // Nếu chưa có ảnh đại diện -> lấy ảnh đầu tiên làm đại diện
    if (!currentCoverImage && currentFormImages.length > 0) {
      currentCoverImage = currentFormImages[0];
    }

    renderGalleryThumbnails();

    if (statusText) statusText.innerText = `✅ Đã tải ${files.length} ảnh thành công!`;
    showToast(`Tải ${files.length} ảnh lên thành công!`);
  } catch (err) {
    if (statusText) statusText.innerText = '❌ Lỗi tải ảnh';
    showToast(err.message, 'error');
  }
}

// Hiển thị thư viện ảnh nhỏ xem trước & nút chọn ảnh đại diện
function renderGalleryThumbnails() {
  const container = document.getElementById('costume-gallery-grid');
  if (!container) return;

  if (currentFormImages.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; font-size: 12px; color: var(--text-muted);">Chưa có ảnh nào. Bấm nút phía trên để chụp hoặc tải ảnh.</div>`;
    return;
  }

  container.innerHTML = currentFormImages.map((url, idx) => {
    const isCover = (url === currentCoverImage);
    return `
      <div style="position: relative; border-radius: 8px; overflow: hidden; border: ${isCover ? '2px solid var(--primary)' : '1px solid var(--border)'}; background: #f8fafc;">
        <img src="${url}" style="width: 100%; height: 90px; object-fit: cover; display: block;">
        
        <!-- Nút Đặt ảnh đại diện -->
        <button type="button" onclick="setAsCoverImage('${url}')" 
          style="position: absolute; top: 4px; left: 4px; border: none; background: ${isCover ? 'var(--primary)' : 'rgba(15,23,42,0.65)'}; color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; cursor: pointer;">
          ${isCover ? '★ ĐẠI DIỆN' : '⭐ Chọn đại diện'}
        </button>

        <!-- Nút Xóa ảnh -->
        <button type="button" onclick="removeGalleryImage(${idx})" 
          style="position: absolute; top: 4px; right: 4px; border: none; background: rgba(239,68,68,0.85); color: #fff; border-radius: 4px; width: 20px; height: 20px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          &times;
        </button>
      </div>
    `;
  }).join('');
}

// Đặt 1 ảnh làm ảnh đại diện hiển thị chính ngoài web
function setAsCoverImage(url) {
  currentCoverImage = url;
  renderGalleryThumbnails();
  showToast('Đã chọn làm ảnh đại diện hiển thị chính ngoài web!');
}

// Xóa 1 ảnh khỏi thư viện
function removeGalleryImage(index) {
  const removedUrl = currentFormImages[index];
  currentFormImages.splice(index, 1);

  if (currentCoverImage === removedUrl) {
    currentCoverImage = currentFormImages.length > 0 ? currentFormImages[0] : '';
  }

  renderGalleryThumbnails();
}

async function saveCostume(e) {
  e.preventDefault();
  const token = localStorage.getItem('tpbd_token');

  const id = document.getElementById('costume-id').value;
  const costumeData = {
    name: document.getElementById('costume-name').value.trim(),
    code: document.getElementById('costume-code').value.trim(),
    category_id: parseInt(document.getElementById('costume-category').value, 10),
    type: document.getElementById('costume-type').value,
    size: document.getElementById('costume-size').value,
    total_qty: parseInt(document.getElementById('costume-qty').value, 10),
    price_per_day: parseFloat(document.getElementById('costume-price').value),
    deposit_fee: parseFloat(document.getElementById('costume-deposit').value || 0),
    image_url: currentCoverImage || (currentFormImages.length > 0 ? currentFormImages[0] : ''),
    images: currentFormImages,
    description: document.getElementById('costume-desc').value.trim()
  };

  try {
    const url = id ? `/api/costumes/${id}` : '/api/costumes';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(costumeData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lưu sản phẩm thất bại!');

    showToast(id ? 'Cập nhật trang phục thành công!' : 'Thêm trang phục mới thành công!');
    closeModal('modal-costume');
    resetCostumeForm();
    loadCostumes();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function resetCostumeForm() {
  document.getElementById('form-costume').reset();
  document.getElementById('costume-id').value = '';
  currentFormImages = [];
  currentCoverImage = '';
  renderGalleryThumbnails();
  const statusText = document.getElementById('upload-status-text');
  if (statusText) statusText.innerText = '';
  const delBtn = document.getElementById('btn-delete-costume');
  if (delBtn) delBtn.style.display = 'none';
}

function editCostume(id) {
  const item = costumesList.find(c => c.id === id);
  if (!item) return;

  document.getElementById('costume-id').value = item.id;
  document.getElementById('costume-name').value = item.name;
  document.getElementById('costume-code').value = item.code;
  document.getElementById('costume-category').value = item.category_id || 1;
  document.getElementById('costume-type').value = item.type || 'COSTUME';
  document.getElementById('costume-size').value = item.size || 'FREE';
  document.getElementById('costume-qty').value = item.total_qty;
  document.getElementById('costume-price').value = item.price_per_day;
  document.getElementById('costume-deposit').value = item.deposit_fee || 0;
  document.getElementById('costume-desc').value = item.description || '';

  // Parse images array
  let imgList = [];
  if (Array.isArray(item.images)) imgList = item.images;
  else if (typeof item.images === 'string' && item.images) {
    try { imgList = JSON.parse(item.images); } catch(e) {}
  }
  if (imgList.length === 0 && item.image_url) imgList = [item.image_url];

  currentFormImages = [...imgList];
  currentCoverImage = item.image_url || (currentFormImages.length > 0 ? currentFormImages[0] : '');

  renderGalleryThumbnails();

  document.getElementById('modal-costume-title').innerText = 'Chỉnh Sửa Trang Phục / Đạo Cụ';
  const delBtn = document.getElementById('btn-delete-costume');
  if (delBtn) delBtn.style.display = 'inline-flex';

  openModal('modal-costume');
}

// Hàm xóa sản phẩm từ danh sách card
async function deleteCostume(id) {
  const item = costumesList.find(c => c.id === id);
  const name = item ? item.name : 'sản phẩm này';

  if (!confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi danh sách không?`)) {
    return;
  }

  const token = localStorage.getItem('tpbd_token');
  try {
    const res = await fetch(`/api/costumes/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xóa sản phẩm thất bại!');

    showToast('Đã xóa sản phẩm thành công!');
    closeModal('modal-costume');
    resetCostumeForm();
    loadCostumes();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Hàm xóa sản phẩm trực tiếp từ trong Modal Sửa
async function deleteCostumeFromModal() {
  const id = document.getElementById('costume-id').value;
  if (id) {
    await deleteCostume(parseInt(id, 10));
  }
}

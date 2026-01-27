// fileRepository.js - FIXED VERSION
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("mainContent");
  let currentFolderId = null;
  let currentFilter = "all";
  let favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
  
  let selectedItems = new Set();
  let lastSelectedIndex = -1;
  let lastClickTime = 0;
  let lastClickedItem = null;
  const DOUBLE_CLICK_DELAY = 300;
  const API_BASE = "http://localhost:3000/api/files";

  window.folderMap = window.folderMap || {};

  function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify([...favorites]));
  }

  // ===== FILE PREVIEW MODAL =====
  function createPreviewModal() {
    const modal = document.createElement("div");
    modal.id = "filePreviewModal";
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 id="modalFileName">File Preview</h3>
            <button class="modal-close" onclick="window.closePreviewModal()">
              <i class="fa fa-times"></i>
            </button>
          </div>
          <div class="modal-body" id="modalBody">
            <div class="loading">Loading...</div>
          </div>
          <div class="modal-footer">
            <button class="modal-btn download-modal-btn" onclick="window.downloadCurrentFile()">
              <i class="fa fa-download"></i> Download
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('filePreviewModal')) {
        window.closePreviewModal();
      }
    });
    
    document.querySelector('.modal-overlay').addEventListener('click', function(e) {
      if (e.target === this) {
        window.closePreviewModal();
      }
    });
  }

  window.closePreviewModal = function() {
    const modal = document.getElementById("filePreviewModal");
    if (modal) modal.remove();
    window.currentPreviewFile = null;
  };

  window.downloadCurrentFile = function() {
    if (!window.currentPreviewFile) return;
    const link = document.createElement("a");
    link.href = window.currentPreviewFile.file_path;
    link.download = window.currentPreviewFile.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  async function openFilePreview(file) {
    window.currentPreviewFile = file;
    
    const existingModal = document.getElementById("filePreviewModal");
    if (existingModal) existingModal.remove();
    
    createPreviewModal();
    
    const modalBody = document.getElementById("modalBody");
    const modalFileName = document.getElementById("modalFileName");
    modalFileName.textContent = file.file_name;

    const fileExt = file.file_name.split('.').pop().toLowerCase();
    const fileType = file.file_type;

    try {
      if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv' || fileType.includes('spreadsheet') || fileType === 'text/csv') {
        modalBody.innerHTML = '<div class="loading">Loading spreadsheet data...</div>';
        
        try {
          const response = await fetch(file.file_path);
          const arrayBuffer = await response.arrayBuffer();
          
          let workbook;
          if (fileExt === 'csv' || fileType === 'text/csv') {
            const data = new Uint8Array(arrayBuffer);
            const text = new TextDecoder().decode(data);
            workbook = XLSX.read(text, { type: 'string' });
          } else {
            workbook = XLSX.read(arrayBuffer, { type: 'array' });
          }
          
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const htmlTable = XLSX.utils.sheet_to_html(firstSheet, { id: "preview-table" });
          
          modalBody.innerHTML = `
            <div style="width: 100%; height: 70vh; overflow: auto;">
              <style>
                #preview-table { 
                  border-collapse: collapse; 
                  width: 100%; 
                  font-size: 14px;
                  background: white;
                }
                #preview-table td, #preview-table th { 
                  border: 1px solid #ddd; 
                  padding: 8px 12px; 
                  text-align: left;
                }
                #preview-table th { 
                  background: #2797ec; 
                  color: white; 
                  font-weight: 600;
                  position: sticky;
                  top: 0;
                  z-index: 10;
                }
                #preview-table tr:nth-child(even) { 
                  background: #f9f9f9; 
                }
                #preview-table tr:hover { 
                  background: #f0f7ff; 
                }
              </style>
              ${htmlTable}
            </div>
          `;
        } catch (err) {
          console.error("Error parsing spreadsheet:", err);
          modalBody.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #d32f2f;">
              <i class="fa fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
              <p>Error loading spreadsheet data.</p>
              <button class="modal-btn" onclick="window.downloadCurrentFile()" style="margin-top: 15px;">
                <i class="fa fa-download"></i> Download File
              </button>
            </div>
          `;
        }
      } else if (fileExt === 'json' || fileType === 'application/json') {
        const response = await fetch(file.file_path);
        const jsonData = await response.json();
        const formatted = JSON.stringify(jsonData, null, 2);
        modalBody.innerHTML = `
          <pre style="white-space: pre-wrap; padding: 20px; max-height: 70vh; overflow: auto; background: #f5f5f5; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.5;">${escapeHtml(formatted)}</pre>
        `;
      } else {
        modalBody.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <i class="fa fa-file" style="font-size: 64px; color: #666; margin-bottom: 20px;"></i>
            <p>Preview not available for this file type.</p>
            <button class="modal-btn" onclick="window.downloadCurrentFile()" style="margin-top: 15px;">
              <i class="fa fa-download"></i> Download File
            </button>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading file preview:", error);
      modalBody.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #d32f2f;">
          <i class="fa fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
          <p>Error loading file preview.</p>
          <button class="modal-btn" onclick="window.downloadCurrentFile()" style="margin-top: 15px;">
            <i class="fa fa-download"></i> Download Instead
          </button>
        </div>
      `;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function clearSelection() {
    selectedItems.clear();
    updateBulkActionsUI();
    document.querySelectorAll(".repository-item.selected").forEach(item => {
      item.classList.remove("selected");
    });
  }

  function toggleItemSelection(id, type, itemElement, itemIndex) {
    const itemKey = `${type}-${id}`;
    
    if (selectedItems.has(itemKey)) {
      selectedItems.delete(itemKey);
      itemElement.classList.remove("selected");
    } else {
      selectedItems.add(itemKey);
      itemElement.classList.add("selected");
      lastSelectedIndex = itemIndex;
    }
    
    updateBulkActionsUI();
  }

  function handleShiftSelection(currentIndex, allItems) {
    if (lastSelectedIndex === -1 || lastSelectedIndex === currentIndex) return;

    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    for (let i = start; i <= end; i++) {
      const item = allItems[i];
      if (item) {
        const itemElement = item.element;
        const itemKey = `${item.type}-${item.id}`;
        
        if (!selectedItems.has(itemKey)) {
          selectedItems.add(itemKey);
          itemElement.classList.add("selected");
        }
      }
    }

    updateBulkActionsUI();
  }

  function updateBulkActionsUI() {
    const bulkActionsDiv = document.getElementById("bulkActions");
    const selectionCount = document.getElementById("selectionCount");
    
    if (!bulkActionsDiv) return;
    
    if (selectedItems.size > 0) {
      bulkActionsDiv.style.display = "flex";
      if (selectionCount) {
        selectionCount.textContent = `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`;
      }
    } else {
      bulkActionsDiv.style.display = "none";
    }
  }

  async function bulkDownload() {
    const fileItems = Array.from(selectedItems).filter(item => item.startsWith('file-'));
    
    if (fileItems.length === 0) {
      toast.warning("No files selected for download. Please select files only.");
      return;
    }

    for (const itemKey of fileItems) {
      try {
        const fileElement = document.querySelector(`[data-item-id="${itemKey}"]`);
        if (fileElement) {
          const filePath = fileElement.dataset.filePath;
          const fileName = fileElement.dataset.fileName;
          
          const link = document.createElement("a");
          link.href = filePath;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Error downloading file:`, error);
      }
    }
    
    toast.success(`${fileItems.length} file(s) downloaded successfully!`);
    clearSelection();
  }

  async function bulkMoveToTrash() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Move ${count} item(s) to trash?`)) return;
    
    const items = Array.from(selectedItems);
    let successCount = 0;
    
    for (const itemKey of items) {
      const [type, id] = itemKey.split('-');
      
      if (type === 'file') {
        try {
          const response = await fetch(`http://localhost:3000/api/trash/move/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          
          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error moving file ${id} to trash:`, error);
        }
      }
    }
    
    clearSelection();
    await fetchFoldersAndFiles();
    toast.success(`${successCount} of ${count} item(s) moved to trash.`);
  }

  async function bulkDeletePermanently() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Permanently delete ${count} item(s)? This action cannot be undone!`)) return;
    
    const items = Array.from(selectedItems);
    let successCount = 0;
    
    for (const itemKey of items) {
      const [type, id] = itemKey.split('-');
      
      try {
        if (type === 'file') {
          const success = await deleteFilePermanent(id);
          if (success) successCount++;
        } else if (type === 'folder') {
          const success = await deleteFolderPermanent(id);
          if (success) successCount++;
        }
      } catch (error) {
        console.error(`Error deleting ${itemKey}:`, error);
      }
    }
    
    clearSelection();
    await fetchFoldersAndFiles();
    toast.success(`${successCount} of ${count} item(s) deleted permanently.`);
  }

  async function deleteFilePermanent(id) {
    try {
      const response = await fetch(`http://localhost:3000/api/trash/permanent/${id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) throw new Error('failed');
      
      favorites.delete(`file-${id}`);
      saveFavorites();
      return true;
    } catch (err) {
      console.error(`Error permanently deleting file ${id}:`, err);
      return false;
    }
  }

  async function deleteFolderPermanent(folderId) {
    try {
      const response = await fetch(`${API_BASE}/folders/${folderId}`, { method: "DELETE" });
      if (!response.ok) throw new Error('failed');

      const idStr = String(folderId);

      if (window.folderMap && window.folderMap[folderId]) {
        delete window.folderMap[folderId];
      }
      favorites.delete(`folder-${folderId}`);

      if (window.folderMap) {
        const descendants = [];
        Object.values(window.folderMap).forEach(f => {
          let cursor = f;
          while (cursor) {
            if (!cursor.parent_id) break;
            if (String(cursor.parent_id) === idStr) {
              descendants.push(cursor.id);
              break;
            }
            cursor = cursor.parent_id ? window.folderMap[cursor.parent_id] : null;
          }
        });
        
        let removedAny = true;
        while (removedAny) {
          removedAny = false;
          Object.values(window.folderMap).forEach(f => {
            if (descendants.includes(f.id)) return;
            let c = f;
            while (c) {
              if (!c.parent_id) break;
              if (descendants.includes(c.parent_id) || String(c.parent_id) === idStr) {
                if (!descendants.includes(f.id)) {
                  descendants.push(f.id);
                  removedAny = true;
                }
                break;
              }
              c = c.parent_id ? window.folderMap[c.parent_id] : null;
            }
          });
        }
        descendants.forEach(did => {
          delete window.folderMap[did];
          favorites.delete(`folder-${did}`);
        });
      }

      saveFavorites();
      return true;
    } catch (err) {
      console.error(`Error permanently deleting folder ${folderId}:`, err);
      return false;
    }
  }

  async function emptyTrashAll() {
    // ✅ FIX: Added confirmation dialog
    if (!confirm('Permanently delete all items in trash? This action cannot be undone!')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/trash/empty', {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to empty trash');
      }

      const result = await response.json();
      toast.success(`Trash emptied: ${result.deletedCount} file(s) permanently deleted.`);
      await fetchFoldersAndFiles();
    } catch (error) {
      console.error('Error emptying trash:', error);
      toast.error(`Failed to empty trash: ${error.message}`);
    }
  }

  function toggleFavorite(id, type) {
    const favId = `${type}-${id}`;
    if (favorites.has(favId)) favorites.delete(favId);
    else favorites.add(favId);
    saveFavorites();
    fetchFoldersAndFiles();
  }

  function isFavorite(id, type) {
    return favorites.has(`${type}-${id}`);
  }

  async function toggleTrash(id, type, fileName) {
    try {
      const response = await fetch(`http://localhost:3000/api/trash/move/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error('Failed to move to trash');

      toast.info(`"${fileName}" moved to trash.`);
      await fetchFoldersAndFiles();
    } catch (error) {
      console.error('Error moving to trash:', error);
      toast.error('Failed to move to trash. Please try again.');
    }
  }

  async function restoreFromTrash(id, fileName) {
    try {
      const response = await fetch(`http://localhost:3000/api/trash/restore/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error('Failed to restore');

      toast.success(`"${fileName}" has been restored.`);
      await fetchFoldersAndFiles();
    } catch (error) {
      console.error('Error restoring:', error);
      toast.error('Failed to restore. Please try again.');
    }
  }

  async function fetchFoldersAndFiles() {
    try {
      let foldersRes, filesRes;

      const needAllFolders = ["favorites", "recent", "trash"].includes(currentFilter) || 
                             currentFolderId !== null && !window.folderMap[currentFolderId];

      if (["favorites", "recent", "trash"].includes(currentFilter) || needAllFolders) {
        [foldersRes, filesRes] = await Promise.all([
          fetch(`${API_BASE}/folders?all=true`),
          currentFilter === "trash" 
            ? fetch(`http://localhost:3000/api/trash`)
            : fetch(`${API_BASE}/files?all=true`)
        ]);
      } else {
        [foldersRes, filesRes] = await Promise.all([
          fetch(`${API_BASE}/folders${currentFolderId ? `?parent_id=${currentFolderId}` : ""}`),
          fetch(`${API_BASE}/files${currentFolderId ? `?folder_id=${currentFolderId}` : ""}`)
        ]);
      }

      const foldersData = await foldersRes.json();
      const filesData = await filesRes.json();

      let folders = foldersData.folders || [];
      let files = currentFilter === "trash" ? (filesData.files || []) : (filesData.files || []);

      folders.forEach(f => {
        if (f && f.id !== undefined) window.folderMap[f.id] = f;
      });

      const filtered = filterItems(folders, files);

      if (currentFilter === "all" && currentFolderId) {
        filtered.folders = filtered.folders.filter(f => f.parent_id === currentFolderId);
        filtered.files = filtered.files.filter(f => f.folder_id === currentFolderId);
      }

      render(filtered.folders, filtered.files);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }

  function filterItems(folders, files) {
    switch (currentFilter) {
      case "files":
        return {
          folders: [],
          files: files.filter(f => !f.is_trashed)
        };

      case "recent":
        const recentFiles = [...files]
          .filter(f => !f.is_trashed)
          .sort((a, b) => {
            const dateA = new Date(a.created_at || a.uploaded_at || 0);
            const dateB = new Date(b.created_at || b.uploaded_at || 0);
            return dateB - dateA;
          })
          .slice(0, 10);
        return { folders: [], files: recentFiles };

      case "favorites":
        const favFolders = folders.filter(f => isFavorite(f.id, "folder") && !f.is_trashed);
        const favFiles = files.filter(f => isFavorite(f.id, "file") && !f.is_trashed);
        return { folders: favFolders, files: favFiles };

      case "trash":
        // Files are already filtered by trash endpoint
        return { folders: [], files: files };

      default:
        return {
          folders: folders.filter(f => !f.is_trashed),
          files: files.filter(f => !f.is_trashed)
        };
    }
  }

  function buildBreadcrumbTrail() {
    if (["recent", "favorites", "trash"].includes(currentFilter)) {
      const labelMap = {
        recent: "Recent",
        favorites: "Favorites",
        trash: "Trash"
      };
      return [{ id: null, name: labelMap[currentFilter] }];
    }

    const trail = [{ id: null, name: "Repository" }];

    if (!currentFolderId) return trail;

    let cursor = window.folderMap[currentFolderId];
    if (!cursor) return trail;

    const parts = [];
    while (cursor) {
      parts.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parent_id ? window.folderMap[cursor.parent_id] : null;
    }

    return trail.concat(parts);
  }

  function render(folders, files) {
    container.innerHTML = "";
    clearSelection();

    const allItems = [];
    let itemIndex = 0;

    const headerWrapper = document.createElement("div");
    headerWrapper.className = "repository-header-wrapper";

    const header = document.createElement("div");
    header.className = "repository-header";

    const leftControls = document.createElement("div");
    leftControls.className = "header-left-controls";

    if (currentFilter === 'trash') {
      const emptyTrashBtn = document.createElement("button");
      emptyTrashBtn.textContent = "Empty Trash";
      emptyTrashBtn.className = "add-btn empty-trash-btn";
      emptyTrashBtn.type = "button";
      emptyTrashBtn.onclick = async (e) => {
        e.preventDefault();
        await emptyTrashAll();
      };
      leftControls.appendChild(emptyTrashBtn);
    }

    const bulkActionsDiv = document.createElement("div");
    bulkActionsDiv.id = "bulkActions";
    bulkActionsDiv.className = "bulk-actions";
    bulkActionsDiv.style.display = "none";
    
    // ✅ FIX: Show correct bulk actions based on current view
    if (currentFilter === 'trash') {
      bulkActionsDiv.innerHTML = `
        <span id="selectionCount" class="selection-count">0 items selected</span>
        <button class="bulk-btn delete-bulk-btn" onclick="window.bulkDeletePermanently()">
          <i class="fa fa-trash-alt"></i> Delete Permanently
        </button>
        <button class="bulk-btn cancel-bulk-btn" onclick="window.clearSelection()">
          <i class="fa fa-times"></i>
        </button>
      `;
    } else {
      bulkActionsDiv.innerHTML = `
        <span id="selectionCount" class="selection-count">0 items selected</span>
        <button class="bulk-btn download-bulk-btn" onclick="window.bulkDownload()">
          <i class="fa fa-download"></i> Download
        </button>
        <button class="bulk-btn trash-bulk-btn" onclick="window.bulkMoveToTrash()">
          <i class="fa fa-trash"></i> Move to Trash
        </button>
        <button class="bulk-btn cancel-bulk-btn" onclick="window.clearSelection()">
          <i class="fa fa-times"></i>
        </button>
      `;
    }
    
    leftControls.appendChild(bulkActionsDiv);

    const rightControls = document.createElement("div");
    rightControls.className = "header-right-controls";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search files or folders...";
    searchInput.className = "repository-search";
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const items = container.querySelectorAll(".repository-item");
      items.forEach((item) => {
        const name = item.querySelector(".item-label").textContent.toLowerCase();
        item.style.display = name.includes(query) ? "" : "none";
      });
    });
    rightControls.appendChild(searchInput);

    const filters = document.createElement("div");
    filters.className = "repository-filters";

    const filterButtons = [
      { icon: "fa-clock", title: "Recent", filter: "recent" },
      { icon: "fa-star", title: "Favorites", filter: "favorites" },
      { icon: "fa-trash", title: "Trash", filter: "trash" }
    ];

    filterButtons.forEach(({ icon, title, filter }) => {
      const filterIcon = document.createElement("i");
      filterIcon.className = `fa ${icon}`;
      filterIcon.title = title;
      filterIcon.style.cursor = "pointer";
      if (currentFilter === filter) {
        filterIcon.style.color = "#a91c1c";
      }
      filterIcon.addEventListener("click", () => {
        currentFilter = filter;
        if (["favorites", "recent", "trash"].includes(filter)) currentFolderId = null;
        fetchFoldersAndFiles();
      });
      filters.appendChild(filterIcon);
    });

    const allIcon = document.createElement("i");
    allIcon.className = "fa fa-th";
    allIcon.title = "All";
    allIcon.style.cursor = "pointer";
    if (currentFilter === "all") {
      allIcon.style.color = "#a91c1c";
    }
    allIcon.addEventListener("click", () => {
      currentFilter = "all";
      currentFolderId = null;
      fetchFoldersAndFiles();
    });
    filters.insertBefore(allIcon, filters.firstChild);

    rightControls.appendChild(filters);
    header.appendChild(leftControls);
    header.appendChild(rightControls);
    headerWrapper.appendChild(header);
    container.appendChild(headerWrapper);

    const breadcrumb = document.createElement("div");
    breadcrumb.className = "breadcrumb-trail";

    const trail = buildBreadcrumbTrail();

    trail.forEach((part, i) => {
      const crumb = document.createElement("span");
      crumb.className = "breadcrumb-part";
      crumb.textContent = part.name;
      if (i < trail.length - 1) {
        crumb.style.cursor = "pointer";
        crumb.addEventListener("click", () => {
          currentFolderId = part.id;
          currentFilter = "all";
          fetchFoldersAndFiles();
        });
      } else {
        crumb.classList.add("breadcrumb-current");
      }
      breadcrumb.appendChild(crumb);
      if (i < trail.length - 1) {
        const sep = document.createElement("span");
        sep.className = "breadcrumb-separator";
        sep.textContent = " | ";
        breadcrumb.appendChild(sep);
      }
    });

    container.appendChild(breadcrumb);

    const itemsDiv = document.createElement("div");
    itemsDiv.className = "repository-items";

    folders.forEach((folder) => {
      const itemDiv = createRepositoryItem(folder, "folder", itemIndex, allItems);
      allItems.push({ id: folder.id, type: "folder", element: itemDiv, index: itemIndex });
      itemIndex++;
      itemsDiv.appendChild(itemDiv);
    });

    files.forEach((file) => {
      const itemDiv = createRepositoryItem(file, "file", itemIndex, allItems);
      allItems.push({ id: file.id, type: "file", element: itemDiv, index: itemIndex });
      itemIndex++;
      itemsDiv.appendChild(itemDiv);
    });

    container.appendChild(itemsDiv);
  }

  function createRepositoryItem(item, type, itemIndex, allItemsList) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "repository-item";
    
    const itemKey = `${type}-${item.id}`;
    itemDiv.dataset.itemId = itemKey;
    itemDiv.dataset.itemIndex = itemIndex;
    
    if (type === "file") {
      itemDiv.dataset.filePath = item.file_path;
      // ✅ FIX: Use correct property name
      itemDiv.dataset.fileName = item.file_name || item.filename;
    }

    const icon = document.createElement("i");
    icon.className = type === "folder" ? "fa fa-folder" : "fa fa-file";
    itemDiv.appendChild(icon);

    // ✅ FIX: Use correct property name for file name
    const name = type === "folder" ? item.name : (item.file_name || item.filename);
    const nameSpan = document.createElement("span");
    nameSpan.className = "item-label";
    nameSpan.textContent = name;
    nameSpan.title = name;
    itemDiv.appendChild(nameSpan);

    if (selectedItems.has(itemKey)) {
      itemDiv.classList.add("selected");
    }

    if (isFavorite(item.id, type)) {
      itemDiv.style.backgroundColor = "rgba(255, 193, 7, 0.15)";
      itemDiv.style.border = "1px solid #ffc107";
    }

    itemDiv.addEventListener("click", (e) => {
      if (e.target.classList.contains("dot-menu") || e.target.closest(".dot-menu")) {
        return;
      }

      const currentTime = Date.now();
      const isDoubleClick = (currentTime - lastClickTime < DOUBLE_CLICK_DELAY) && 
                           (lastClickedItem === itemKey);

      lastClickTime = currentTime;
      lastClickedItem = itemKey;

      if (isDoubleClick) {
        if (type === "folder") {
          if (currentFilter === "favorites") {
            toast.warning("Please switch to 'All' view to navigate into folders");
            return;
          }
          currentFolderId = item.id;
          fetchFoldersAndFiles();
        } else {
          openFilePreview(item);
        }
        return;
      }

      if (e.shiftKey) {
        handleShiftSelection(itemIndex, allItemsList);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        toggleItemSelection(item.id, type, itemDiv, itemIndex);
        return;
      }

      if (!selectedItems.has(itemKey)) {
        document.querySelectorAll(".repository-item.selected").forEach(el => {
          el.classList.remove("selected");
        });
        selectedItems.clear();
      }
      
      toggleItemSelection(item.id, type, itemDiv, itemIndex);
    });

    const dots = document.createElement("div");
    dots.className = "dot-menu";
    dots.innerHTML = '<i class="fa fa-ellipsis-v"></i>';

    const menu = document.createElement("div");
    menu.className = "dropdown-menu hidden";

    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = "favorite-btn";
    favoriteBtn.type = "button";
    favoriteBtn.textContent = isFavorite(item.id, type) ? "Unfavorite" : "Add to Favorites";
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFavorite(item.id, type);
      menu.classList.add("hidden");
    });
    menu.appendChild(favoriteBtn);

    // ✅ FIX: Show correct actions based on trash status
    if (currentFilter === "trash" || item.is_trashed) {
      const restoreBtn = document.createElement("button");
      restoreBtn.className = "restore-btn";
      restoreBtn.type = "button";
      restoreBtn.textContent = "Restore";
      restoreBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await restoreFromTrash(item.id, name);
        menu.classList.add("hidden");
      });
      menu.appendChild(restoreBtn);

      const permDeleteBtn = document.createElement("button");
      permDeleteBtn.className = "delete-perm-btn";
      permDeleteBtn.type = "button";
      permDeleteBtn.textContent = "Delete Permanently";
      permDeleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;

        permDeleteBtn.disabled = true;
        permDeleteBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

        if (type === "file") {
          await deleteFilePermanent(item.id);
        } else {
          await deleteFolderPermanent(item.id);
        }
        
        menu.classList.add("hidden");
        await fetchFoldersAndFiles();
        
        toast.success(`"${name}" has been permanently deleted.`);
      });
      menu.appendChild(permDeleteBtn);
    } else {
      const moveTrashBtn = document.createElement("button");
      moveTrashBtn.className = "move-trash-btn";
      moveTrashBtn.type = "button";
      moveTrashBtn.textContent = "Move to Trash";
      moveTrashBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await toggleTrash(item.id, type, name);
        menu.classList.add("hidden");
      });
      menu.appendChild(moveTrashBtn);
    }

    if (type === "file") {
      const downloadBtn = document.createElement("button");
      downloadBtn.className = "download-btn";
      downloadBtn.type = "button";
      downloadBtn.textContent = "Download";
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();

        const link = document.createElement("a");
        link.href = item.file_path;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        menu.classList.add("hidden");
        
        toast.success(`"${name}" is being downloaded.`);
      });
      menu.appendChild(downloadBtn);
    }

    dots.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      document.querySelectorAll(".dropdown-menu").forEach(m => {
        if (m !== menu) m.classList.add("hidden");
      });
      menu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!dots.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add("hidden");
      }
    });

    itemDiv.appendChild(dots);
    itemDiv.appendChild(menu);
    return itemDiv;
  }

  window.bulkDownload = bulkDownload;
  window.bulkMoveToTrash = bulkMoveToTrash;
  window.bulkDeletePermanently = bulkDeletePermanently;
  window.clearSelection = clearSelection;

  fetchFoldersAndFiles();
});
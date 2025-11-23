// fileRepository.js
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("mainContent");
  let currentFolderId = null;
  let currentFilter = "all";
  let favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
  let trash = new Set(JSON.parse(localStorage.getItem("trash") || "[]"));
  let selectedItems = new Set(); // Track selected items: "type-id" format
  let lastSelectedIndex = -1; // Track last selected item for shift-click
  let lastClickTime = 0; // Track last click time for double-click detection
  let lastClickedItem = null; // Track last clicked item for double-click
  const DOUBLE_CLICK_DELAY = 300; // milliseconds
  const API_BASE = "http://localhost:3000/api/files";

  window.folderMap = window.folderMap || {};

  function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify([...favorites]));
  }
  function saveTrash() {
    localStorage.setItem("trash", JSON.stringify([...trash]));
  }

  // Clear selection
  function clearSelection() {
    selectedItems.clear();
    updateBulkActionsUI();
    // Remove visual selection from all items
    document.querySelectorAll(".repository-item.selected").forEach(item => {
      item.classList.remove("selected");
    });
  }

  // Toggle item selection
  function toggleItemSelection(id, type, itemElement, itemIndex) {
    const itemKey = `${type}-${id}`;
    
    if (selectedItems.has(itemKey)) {
      selectedItems.delete(itemKey);
      itemElement.classList.remove("selected");
    } else {
      selectedItems.add(itemKey);
      itemElement.classList.add("selected");
      lastSelectedIndex = itemIndex; // Update last selected index
    }
    
    updateBulkActionsUI();
  }

  // Handle shift-click range selection
  function handleShiftSelection(currentIndex, allItems) {
    if (lastSelectedIndex === -1 || lastSelectedIndex === currentIndex) {
      return; // No range to select
    }

    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    // Select all items in range
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

  // Update bulk actions UI based on selection
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

  // Bulk download selected files
  async function bulkDownload() {
    const fileItems = Array.from(selectedItems).filter(item => item.startsWith('file-'));
    
    if (fileItems.length === 0) {
      alert("No files selected for download. Please select files only.");
      return;
    }

    for (const itemKey of fileItems) {
      const fileId = itemKey.split('-')[1];
      
      try {
        // Find file data from DOM or fetch it
        const fileElement = document.querySelector(`[data-item-id="${itemKey}"]`);
        if (fileElement) {
          const filePath = fileElement.dataset.filePath;
          const fileName = fileElement.dataset.fileName;
          
          // Trigger download
          const link = document.createElement("a");
          link.href = filePath;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Error downloading file ${fileId}:`, error);
      }
    }
    
    alert(`${fileItems.length} file(s) downloaded successfully!`);
    clearSelection();
  }

  // Bulk move to trash
  function bulkMoveToTrash() {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    if (!confirm(`Move ${count} item(s) to trash?`)) return;
    
    selectedItems.forEach(itemKey => {
      trash.add(itemKey);
    });
    
    saveTrash();
    clearSelection();
    fetchFoldersAndFiles();
    alert(`${count} item(s) moved to trash.`);
  }

  // Bulk delete permanently
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
    alert(`${successCount} of ${count} item(s) deleted permanently.`);
  }

  // Permanently delete file by id
  async function deleteFilePermanent(id) {
    try {
      const response = await fetch(`${API_BASE}/files/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error('failed');
      trash.delete(`file-${id}`);
      favorites.delete(`file-${id}`);
      saveTrash();
      saveFavorites();
      return true;
    } catch (err) {
      console.error(`Error permanently deleting file ${id}:`, err);
      return false;
    }
  }

  // Permanently delete folder by id
  async function deleteFolderPermanent(folderId) {
    try {
      const response = await fetch(`${API_BASE}/folders/${folderId}`, { method: "DELETE" });
      if (!response.ok) throw new Error('failed');

      const idStr = String(folderId);

      if (window.folderMap && window.folderMap[folderId]) {
        delete window.folderMap[folderId];
      }
      trash.delete(`folder-${folderId}`);
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
          trash.delete(`folder-${did}`);
          favorites.delete(`folder-${did}`);
        });
      }

      saveTrash();
      saveFavorites();
      return true;
    } catch (err) {
      console.error(`Error permanently deleting folder ${folderId}:`, err);
      return false;
    }
  }

  // Empty trash
  async function emptyTrashAll() {
    if (trash.size === 0) {
      alert("Trash is already empty.");
      return;
    }

    if (!confirm("Permanently delete everything in Trash? This cannot be undone.")) return;

    const items = Array.from(trash);
    for (const entry of items) {
      const [type, id] = entry.split('-');
      if (type === 'file') {
        await deleteFilePermanent(id);
      } else if (type === 'folder') {
        await deleteFolderPermanent(id);
      }
      trash.delete(entry);
    }
    
    saveTrash();
    await fetchFoldersAndFiles();
    alert("Trash emptied.");
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

  function toggleTrash(id, type) {
    const trashId = `${type}-${id}`;
    if (trash.has(trashId)) trash.delete(trashId);
    else trash.add(trashId);
    saveTrash();
    fetchFoldersAndFiles();
  }

  function isTrashed(id, type) {
    return trash.has(`${type}-${id}`);
  }

  // Fetch folders & files
  async function fetchFoldersAndFiles() {
    try {
      let foldersRes, filesRes;

      const needAllFolders = ["favorites", "recent", "trash"].includes(currentFilter) || currentFolderId !== null && !window.folderMap[currentFolderId];

      if (["favorites", "recent", "trash"].includes(currentFilter) || needAllFolders) {
        [foldersRes, filesRes] = await Promise.all([
          fetch(`${API_BASE}/folders?all=true`),
          fetch(`${API_BASE}/files?all=true`)
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
      let files = filesData.files || [];

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
          files: files.filter(f => !isTrashed(f.id, "file"))
        };

      case "recent":
        const recentFiles = [...files]
          .filter(f => !isTrashed(f.id, "file"))
          .sort((a, b) => {
            const dateA = new Date(a.created_at || a.uploaded_at || 0);
            const dateB = new Date(b.created_at || b.uploaded_at || 0);
            return dateB - dateA;
          })
          .slice(0, 10);
        return { folders: [], files: recentFiles };

      case "favorites":
        const favFolders = folders.filter(f => isFavorite(f.id, "folder") && !isTrashed(f.id, "folder"));
        const favFiles = files.filter(f => isFavorite(f.id, "file") && !isTrashed(f.id, "file"));
        return { folders: favFolders, files: favFiles };

      case "trash":
        const trashedFolders = folders.filter(f => isTrashed(f.id, "folder"));
        const trashedFiles = files.filter(f => isTrashed(f.id, "file"));
        return { folders: trashedFolders, files: trashedFiles };

      default:
        return {
          folders: folders.filter(f => !isTrashed(f.id, "folder")),
          files: files.filter(f => !isTrashed(f.id, "file"))
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
    clearSelection(); // Clear selection when re-rendering

    // Create a flat list of all items for shift-click range selection
    const allItems = [];
    let itemIndex = 0;

    // ===== header start =====
    const headerWrapper = document.createElement("div");
    headerWrapper.className = "repository-header-wrapper";

    const header = document.createElement("div");
    header.className = "repository-header";

    const leftControls = document.createElement("div");
    leftControls.className = "header-left-controls";

    // Show "Empty Trash" or bulk actions
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

    // Bulk actions div (hidden by default)
    const bulkActionsDiv = document.createElement("div");
    bulkActionsDiv.id = "bulkActions";
    bulkActionsDiv.className = "bulk-actions";
    bulkActionsDiv.style.display = "none";
    
    bulkActionsDiv.innerHTML = `
      <span id="selectionCount" class="selection-count">0 items selected</span>
      <button class="bulk-btn download-bulk-btn" onclick="window.bulkDownload()">
        <i class="fa fa-download"></i> Download
      </button>
      <button class="bulk-btn trash-bulk-btn" onclick="window.bulkMoveToTrash()">
        <i class="fa fa-trash"></i> Move to Trash
      </button>
      <button class="bulk-btn delete-bulk-btn" onclick="window.bulkDeletePermanently()">
        <i class="fa fa-trash-alt"></i> Delete Permanently
      </button>
      <button class="bulk-btn cancel-bulk-btn" onclick="window.clearSelection()">
        <i class="fa fa-times"></i>
      </button>
    `;
    
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

    // ===== breadcrumb =====
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

    // Items grid
    const itemsDiv = document.createElement("div");
    itemsDiv.className = "repository-items";

    folders.forEach((folder) => {
      const itemDiv = createRepositoryItem(folder, "folder", folders, files, itemIndex, allItems);
      allItems.push({ id: folder.id, type: "folder", element: itemDiv, index: itemIndex });
      itemIndex++;
      itemsDiv.appendChild(itemDiv);
    });

    files.forEach((file) => {
      const itemDiv = createRepositoryItem(file, "file", folders, files, itemIndex, allItems);
      allItems.push({ id: file.id, type: "file", element: itemDiv, index: itemIndex });
      itemIndex++;
      itemsDiv.appendChild(itemDiv);
    });

    container.appendChild(itemsDiv);
  }

  function createRepositoryItem(item, type, allFolders, allFiles, itemIndex, allItemsList) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "repository-item";
    
    const itemKey = `${type}-${item.id}`;
    itemDiv.dataset.itemId = itemKey;
    itemDiv.dataset.itemIndex = itemIndex;
    
    // Store file data for downloads
    if (type === "file") {
      itemDiv.dataset.filePath = item.file_path;
      itemDiv.dataset.fileName = item.file_name;
    }

    const icon = document.createElement("i");
    icon.className = type === "folder" ? "fa fa-folder" : "fa fa-file";
    itemDiv.appendChild(icon);

    const name = type === "folder" ? item.name : item.file_name;
    const nameSpan = document.createElement("span");
    nameSpan.className = "item-label";
    nameSpan.textContent = name;
    nameSpan.title = name;
    itemDiv.appendChild(nameSpan);

    // Check if already selected
    if (selectedItems.has(itemKey)) {
      itemDiv.classList.add("selected");
    }

    // Favorite highlight
    if (isFavorite(item.id, type)) {
      itemDiv.style.backgroundColor = "rgba(255, 193, 7, 0.15)";
      itemDiv.style.border = "1px solid #ffc107";
    }

    // Click handler - NEW BEHAVIOR
    itemDiv.addEventListener("click", (e) => {
      if (e.target.classList.contains("dot-menu") || e.target.closest(".dot-menu")) {
        return; // Don't handle selection if clicking menu
      }

      const currentTime = Date.now();
      const isDoubleClick = (currentTime - lastClickTime < DOUBLE_CLICK_DELAY) && (lastClickedItem === itemKey);

      // Update last click tracking
      lastClickTime = currentTime;
      lastClickedItem = itemKey;

      // Handle double-click
      if (isDoubleClick) {
        if (type === "folder") {
          if (currentFilter === "favorites") {
            alert("Please switch to 'All' view to navigate into folders");
            return;
          }
          currentFolderId = item.id;
          fetchFoldersAndFiles();
        } else {
          // Open file in Google Sheets
          const fileUrl = `http://localhost:3000${item.file_path}`;
          const googleSheetsImportUrl =
            `https://docs.google.com/spreadsheets/u/0/create?usp=drive_web&authuser=0&hl=en&copy=true&url=${encodeURIComponent(fileUrl)}`;
          window.open(googleSheetsImportUrl, "_blank");
        }
        return;
      }

      // Handle shift-click for range selection
      if (e.shiftKey) {
        handleShiftSelection(itemIndex, allItemsList);
        return;
      }

      // Handle ctrl/cmd-click for multi-select (toggle)
      if (e.ctrlKey || e.metaKey) {
        toggleItemSelection(item.id, type, itemDiv, itemIndex);
        return;
      }

      // Single click - just select the item (NEW DEFAULT BEHAVIOR)
      // Clear previous selection if not using ctrl/shift
      if (!selectedItems.has(itemKey)) {
        // Clear all other selections
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

    // Favorite button
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

    // Trash view: Restore + Delete
    if (currentFilter === "trash") {
      const restoreBtn = document.createElement("button");
      restoreBtn.className = "restore-btn";
      restoreBtn.type = "button";
      restoreBtn.textContent = "Restore";
      restoreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        trash.delete(`${type}-${item.id}`);
        saveTrash();
        menu.classList.add("hidden");
        fetchFoldersAndFiles();
      });
      menu.appendChild(restoreBtn);

      const permDeleteBtn = document.createElement("button");
      permDeleteBtn.className = "delete-perm-btn";
      permDeleteBtn.type = "button";
      permDeleteBtn.textContent = "Delete";
      permDeleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;

        if (type === "file") {
          await deleteFilePermanent(item.id);
        } else {
          await deleteFolderPermanent(item.id);
        }
        
        menu.classList.add("hidden");
        await fetchFoldersAndFiles();
      });
      menu.appendChild(permDeleteBtn);
    } else {
      // Normal view: Move to Trash
      const moveTrashBtn = document.createElement("button");
      moveTrashBtn.className = "move-trash-btn";
      moveTrashBtn.type = "button";
      moveTrashBtn.textContent = "Move to Trash";
      moveTrashBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleTrash(item.id, type);
        menu.classList.add("hidden");
      });
      menu.appendChild(moveTrashBtn);
    }

    // Download button (files only)
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
        link.download = item.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        menu.classList.add("hidden");
      });

      menu.appendChild(downloadBtn);
    }

    // Menu toggle
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

  // Expose functions to window for onclick handlers
  window.bulkDownload = bulkDownload;
  window.bulkMoveToTrash = bulkMoveToTrash;
  window.bulkDeletePermanently = bulkDeletePermanently;
  window.clearSelection = clearSelection;

  // Initial load
  fetchFoldersAndFiles();
});
// fileRepository.js (complete — replace your current file with this)
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("mainContent");
  let currentFolderId = null;
  let currentFilter = "all"; // Track active filter
  let favorites = new Set(JSON.parse(localStorage.getItem("favorites") || "[]")); // Store favorites locally
  let trash = new Set(JSON.parse(localStorage.getItem("trash") || "[]")); // Store trashed items locally
  const API_BASE = "http://localhost:3000/api/files";

  // global folder map: id -> folder object { id, name, parent_id, ... }
  window.folderMap = window.folderMap || {};

  function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify([...favorites]));
  }
  function saveTrash() {
    localStorage.setItem("trash", JSON.stringify([...trash]));
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

  // Fetch folders & files; if we need global filters or breadcrumbs, ensure we have full folder list
  async function fetchFoldersAndFiles() {
    try {
      let foldersRes, filesRes;

      // If viewing global filters or we need breadcrumb ancestors,
      // request "all=true" to get every item from the server
      const needAllFolders = ["favorites", "recent", "trash"].includes(currentFilter) || currentFolderId !== null && !window.folderMap[currentFolderId];

      if (["favorites", "recent", "trash"].includes(currentFilter) || needAllFolders) {
        [foldersRes, filesRes] = await Promise.all([
          fetch(`${API_BASE}/folders?all=true`),
          fetch(`${API_BASE}/files?all=true`)
        ]);
      } else {
        // Folder-specific view (only children)
        [foldersRes, filesRes] = await Promise.all([
          fetch(`${API_BASE}/folders${currentFolderId ? `?parent_id=${currentFolderId}` : ""}`),
          fetch(`${API_BASE}/files${currentFolderId ? `?folder_id=${currentFolderId}` : ""}`)
        ]);
      }

      const foldersData = await foldersRes.json();
      const filesData = await filesRes.json();

      let folders = foldersData.folders || [];
      let files = filesData.files || [];

      // Update global folderMap with whatever we got (so we can build breadcrumbs)
      folders.forEach(f => {
        if (f && f.id !== undefined) window.folderMap[f.id] = f;
      });

      // Apply your existing in-memory filter logic (this returns filtered sets)
      const filtered = filterItems(folders, files);

      // If we requested all folders/files but the user is viewing a specific folder (All filter),
      // scope locally to only show children of currentFolderId (keeps navigation consistent)
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
        // show only files (non-trashed)
        return {
          folders: [],
          files: files.filter(f => !isTrashed(f.id, "file"))
        };

      case "recent":
        // Sort by most recent across all files and exclude trashed items
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
        // Favorites across entire dataset (exclude trashed)
        const favFolders = folders.filter(f => isFavorite(f.id, "folder") && !isTrashed(f.id, "folder"));
        const favFiles = files.filter(f => isFavorite(f.id, "file") && !isTrashed(f.id, "file"));
        return { folders: favFolders, files: favFiles };

      case "trash":
        // Show trashed items (both folders and files) — these come from local storage
        const trashedFolders = folders.filter(f => isTrashed(f.id, "folder"));
        const trashedFiles = files.filter(f => isTrashed(f.id, "file"));
        return { folders: trashedFolders, files: trashedFiles };

      default:
        // Default 'all' view: exclude trashed items from normal view
        return {
          folders: folders.filter(f => !isTrashed(f.id, "folder")),
          files: files.filter(f => !isTrashed(f.id, "file"))
        };
    }
  }

  // Build breadcrumb trail array from currentFolderId and window.folderMap
  function buildBreadcrumbTrail() {
    const trail = [{ id: null, name: "Repository" }];

    if (!currentFolderId) return trail;

    // walk up using folderMap; if a parent is missing, we fall back to a single link
    let cursor = window.folderMap[currentFolderId];
    if (!cursor) {
      // fallback: still show a direct clickable item to top-level
      return trail;
    }

    const parts = [];
    while (cursor) {
      parts.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parent_id ? window.folderMap[cursor.parent_id] : null;
    }

    return trail.concat(parts);
  }

  function render(folders, files) {
    container.innerHTML = "";

    // ===== header start =====
    const headerWrapper = document.createElement("div");
    headerWrapper.className = "repository-header-wrapper";

    const header = document.createElement("div");
    header.className = "repository-header";

    const leftControls = document.createElement("div");
    leftControls.className = "header-left-controls";

    // Note: we no longer use a simple "Back" button here; breadcrumbs below will handle navigation.
    // But to preserve previous UX we keep a Back when inside folder (optional)

    const addFolderBtn = document.createElement("button");
    addFolderBtn.textContent = "New Folder";
    addFolderBtn.className = "add-btn";
    addFolderBtn.type = "button";
    addFolderBtn.onclick = async (e) => {
      e.preventDefault();
      await addFolder();
    };
    leftControls.appendChild(addFolderBtn);

    const addFileBtn = document.createElement("button");
    addFileBtn.textContent = "Upload File";
    addFileBtn.className = "add-btn";
    addFileBtn.type = "button";
    addFileBtn.onclick = async (e) => {
      e.preventDefault();
      await addFile();
    };
    leftControls.appendChild(addFileBtn);

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
        // when switching to global filters, show root (clear folder scope)
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
      fetchFoldersAndFiles();
    });
    filters.insertBefore(allIcon, filters.firstChild);

    rightControls.appendChild(filters);
    header.appendChild(leftControls);
    header.appendChild(rightControls);

    // Put header inside wrapper card (so you have white card look)
    headerWrapper.appendChild(header);
    container.appendChild(headerWrapper);

    // ===== breadcrumb start =====
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "breadcrumb-trail";

    const trail = buildBreadcrumbTrail(); // returns array of {id, name}

    trail.forEach((part, i) => {
      const crumb = document.createElement("span");
      crumb.className = "breadcrumb-part";
      crumb.textContent = part.name;
      // Only make clickable if it's not current (last) element
      if (i < trail.length - 1) {
        crumb.style.cursor = "pointer";
        crumb.addEventListener("click", () => {
          currentFolderId = part.id;
          // When clicking crumbs, clear any global filter to return to normal folder view
          currentFilter = "all";
          fetchFoldersAndFiles();
        });
      } else {
        // last element, not clickable; emphasize it
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

    // insert breadcrumb just below header (but above items)
    container.appendChild(breadcrumb);
    // ===== breadcrumb end =====

    // Items grid
    const itemsDiv = document.createElement("div");
    itemsDiv.className = "repository-items";

    folders.forEach((folder) => {
      const itemDiv = createRepositoryItem(
        folder,
        "folder",
        () => {
          if (currentFilter === "favorites") {
            alert("Please switch to 'All' view to navigate into folders");
            return;
          }
          currentFolderId = folder.id;
          fetchFoldersAndFiles();
        },
        async () => {
          // permanent delete handler (used when in trash view)
          if (confirm(`Permanently delete folder "${folder.name}"? This cannot be undone.`)) {
            try {
              const response = await fetch(`${API_BASE}/folders/${folder.id}`, { method: "DELETE" });
              if (response.ok) {
                trash.delete(`folder-${folder.id}`);
                saveTrash();
                fetchFoldersAndFiles();
              } else {
                alert("Failed to delete folder permanently.");
              }
            } catch (err) {
              console.error("Permanent delete error:", err);
              alert("Error deleting folder permanently.");
            }
          }
        },
        () => toggleFavorite(folder.id, "folder")
      );
      itemsDiv.appendChild(itemDiv);
    });

    files.forEach((file) => {
      const itemDiv = createRepositoryItem(
        file,
        "file",
        () => window.open(file.file_path, "_blank"),
        async () => {
          if (confirm(`Permanently delete file "${file.file_name}"? This cannot be undone.`)) {
            try {
              const response = await fetch(`${API_BASE}/files/${file.id}`, { method: "DELETE" });
              if (response.ok) {
                trash.delete(`file-${file.id}`);
                saveTrash();
                fetchFoldersAndFiles();
              } else {
                alert("Failed to delete file permanently.");
              }
            } catch (err) {
              console.error("Permanent delete error:", err);
              alert("Error deleting file permanently.");
            }
          }
        },
        () => toggleFavorite(file.id, "file")
      );
      itemsDiv.appendChild(itemDiv);
    });

    container.appendChild(itemsDiv);
  }

  function createRepositoryItem(item, type, onClick, onDeletePermanent, onToggleFavorite) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "repository-item";

    const icon = document.createElement("i");
    icon.className = type === "folder" ? "fa fa-folder" : "fa fa-file";
    itemDiv.appendChild(icon);

    const name = type === "folder" ? item.name : item.file_name;
    const nameSpan = document.createElement("span");
    nameSpan.className = "item-label";
    nameSpan.textContent = name;
    nameSpan.title = name;
    itemDiv.appendChild(nameSpan);

    // localized favorite highlight: entire folder/file card turns yellow-ish
    if (isFavorite(item.id, type)) {
      itemDiv.style.backgroundColor = "rgba(255, 193, 7, 0.15)";
      itemDiv.style.border = "1px solid #ffc107";
    }

    itemDiv.addEventListener("click", (e) => {
      if (!e.target.classList.contains("dot-menu") && !e.target.closest(".dot-menu")) {
        onClick();
      }
    });

    const dots = document.createElement("div");
    dots.className = "dot-menu";
    dots.innerHTML = '<i class="fa fa-ellipsis-v"></i>';

    const menu = document.createElement("div");
    menu.className = "dropdown-menu hidden";

    // Favorite button (works everywhere)
    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = "favorite-btn";
    favoriteBtn.type = "button";
    favoriteBtn.textContent = isFavorite(item.id, type) ? "Unfavorite" : "Add to Favorites";
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onToggleFavorite();
      menu.classList.add("hidden");
    });
    menu.appendChild(favoriteBtn);

    // If current view is 'trash': show Restore + Delete Permanently
    if (currentFilter === "trash") {
      const restoreBtn = document.createElement("button");
      restoreBtn.className = "restore-btn";
      restoreBtn.type = "button";
      restoreBtn.textContent = "Restore";
      restoreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        // remove from trash
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
        // Call permanent delete handler provided by render (onDeletePermanent)
        await onDeletePermanent();
        menu.classList.add("hidden");
      });
      menu.appendChild(permDeleteBtn);
    } else {
      // Normal view: show Move to Trash (soft delete)
      const moveTrashBtn = document.createElement("button");
      moveTrashBtn.className = "move-trash-btn";
      moveTrashBtn.type = "button";
      moveTrashBtn.textContent = isTrashed(item.id, type) ? "Remove from Trash" : "Move to Trash";
      moveTrashBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleTrash(item.id, type); // soft delete toggle
        menu.classList.add("hidden");
      });
      menu.appendChild(moveTrashBtn);
    }

    // Close other menus when opening
    dots.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      document.querySelectorAll(".dropdown-menu").forEach(m => {
        if (m !== menu) m.classList.add("hidden");
      });
      menu.classList.toggle("hidden");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!dots.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add("hidden");
      }
    });

    itemDiv.appendChild(dots);
    itemDiv.appendChild(menu);
    return itemDiv;
  }

  async function addFolder() {
    const name = prompt("Enter folder name:");
    if (!name) return;

    await fetch(`${API_BASE}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id: currentFolderId, adminid: "adminEnierga" })
    });

    fetchFoldersAndFiles();
  }

  async function addFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      e.preventDefault();
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder_id", currentFolderId);
      formData.append("adminid", "adminEnierga");

      await fetch(`${API_BASE}/files`, { method: "POST", body: formData });
      fetchFoldersAndFiles();
    };
    input.click();
  }

  // Initial load
  fetchFoldersAndFiles();
});

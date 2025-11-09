// fileRepository.js
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

  // Permanently delete file by id and cleanup local sets
  async function deleteFilePermanent(id) {
    try {
      const response = await fetch(`${API_BASE}/files/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error('failed');
      // cleanup local sets
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

  // Permanently delete folder by id, cleanup local sets and folderMap + descendants
  async function deleteFolderPermanent(folderId) {
    try {
      const response = await fetch(`${API_BASE}/folders/${folderId}`, { method: "DELETE" });
      if (!response.ok) throw new Error('failed');

      // remove folder and its descendants from folderMap, favorites, trash
      const idStr = String(folderId);

      // remove the folder itself
      if (window.folderMap && window.folderMap[folderId]) {
        delete window.folderMap[folderId];
      }
      trash.delete(`folder-${folderId}`);
      favorites.delete(`folder-${folderId}`);

      // find descendants in folderMap (simple loop)
      if (window.folderMap) {
        const descendants = [];
        Object.values(window.folderMap).forEach(f => {
          // walk up parents, if we encounter deleted folderId => it's descendant
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
        // remove descendants found (note: this isn't fully recursive but will remove direct children; to be safer, iterate until no new descendants)
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

  // Empty trash: iterate through trash set and delete each permanently
  async function emptyTrashAll() {
    if (trash.size === 0) {
      alert("Trash is already empty.");
      return;
    }

    if (!confirm("Permanently delete everything in Trash? This cannot be undone.")) return;

    // copy items so we can modify trash during deletion
    const items = Array.from(trash);
    // iterate sequentially
    for (const entry of items) {
      // entry format: "<type>-<id>"
      const [type, id] = entry.split('-');
      if (type === 'file') {
        await deleteFilePermanent(id);
      } else if (type === 'folder') {
        await deleteFolderPermanent(id);
      }
      // also ensure we remove it from trash set (deleteFilePermanent/FolderPermanent already remove)
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
    // If a global filter is active, show it as the root breadcrumb
    if (["recent", "favorites", "trash"].includes(currentFilter)) {
      const labelMap = {
        recent: "Recent",
        favorites: "Favorites",
        trash: "Trash"
      };
      return [{ id: null, name: labelMap[currentFilter] }];
    }

    // Default view — "Repository" as root
    const trail = [{ id: null, name: "Repository" }];

    if (!currentFolderId) return trail;

    // Build folder hierarchy using folderMap
    let cursor = window.folderMap[currentFolderId];
    if (!cursor) return trail; // fallback if folder missing

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

    // show "Empty Trash" button when viewing trash filter
    if (currentFilter === 'trash') {
      const emptyTrashBtn = document.createElement("button");
      emptyTrashBtn.textContent = "Empty Trash";
      emptyTrashBtn.className = "add-btn empty-trash-btn";
      emptyTrashBtn.type = "button";
      emptyTrashBtn.onclick = async (e) => {
        e.preventDefault();
        // call helper to empty trash
        await emptyTrashAll();
      };
      leftControls.appendChild(emptyTrashBtn);
    }

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
      currentFolderId = null; // clear any folder scope
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
          if (!confirm(`Permanently delete folder "${folder.name}"? This cannot be undone.`)) return;

          try {
            const response = await fetch(`${API_BASE}/folders/${folder.id}`, { method: "DELETE" });

            if (!response.ok) {
              alert("Failed to delete folder permanently.");
              return;
            }

            // cleanup local state:
            const deletedIdStr = String(folder.id);

            // Remove from folderMap (so breadcrumb/build won't resurrect it)
            if (window.folderMap && window.folderMap[folder.id]) {
              delete window.folderMap[folder.id];
            }

            // Remove from local trash and favorites
            trash.delete(`folder-${folder.id}`);
            favorites.delete(`folder-${folder.id}`);
            saveTrash();
            saveFavorites();

            // If currentFolderId is the deleted folder or a descendant, reset to root.
            // Walk up from currentFolderId via folderMap parents to check ancestry.
            if (currentFolderId != null) {
              let cursor = window.folderMap[currentFolderId];
              // if folderMap doesn't have the currentFolderId (deleted or not loaded),
              // also compare direct equality (string-safe)
              if (!cursor && String(currentFolderId) === deletedIdStr) {
                currentFolderId = null;
              } else {
                while (cursor) {
                  if (String(cursor.id) === deletedIdStr) {
                    currentFolderId = null;
                    break;
                  }
                  cursor = cursor.parent_id ? window.folderMap[cursor.parent_id] : null;
                }
              }
            }

            // Ensure UI fetch happens after state updates
            await fetchFoldersAndFiles();
          } catch (err) {
            console.error("Permanent delete error:", err);
            alert("Error deleting folder permanently.");
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
        // permanent delete handler for file
        async () => {
          if (!confirm(`Permanently delete file "${file.file_name}"? This cannot be undone.`)) return;

          try {
            const response = await fetch(`${API_BASE}/files/${file.id}`, { method: "DELETE" });

            if (!response.ok) {
              alert("Failed to delete file permanently.");
              return;
            }

            // Cleanup local sets
            trash.delete(`file-${file.id}`);
            favorites.delete(`file-${file.id}`);
            saveTrash();
            saveFavorites();

            // If currentFolderId points to a folder that was inside a deleted file context (rare),
            // keep as-is. Otherwise just refresh UI after cleanup.
            await fetchFoldersAndFiles();
          } catch (err) {
            console.error("Permanent delete error:", err);
            alert("Error deleting file permanently.");
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

  // Initial load
  fetchFoldersAndFiles();
});
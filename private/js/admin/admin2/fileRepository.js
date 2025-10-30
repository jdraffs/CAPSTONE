document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("mainContent");
  let currentFolderId = null;
  const API_BASE = "http://localhost:3000/api/files"; // changed to files repository

  async function fetchFoldersAndFiles() {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        fetch(`${API_BASE}/folders${currentFolderId ? `?parent_id=${currentFolderId}` : ""}`),
        fetch(`${API_BASE}/files${currentFolderId ? `?folder_id=${currentFolderId}` : ""}`)
      ]);

      const foldersData = await foldersRes.json();
      const filesData = await filesRes.json();
      render(foldersData.folders || [], filesData.files || []);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }

  function render(folders, files) {
    container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "repository-header";

    if (currentFolderId) {
      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.className = "back-btn";
      backBtn.type = "button";
      backBtn.onclick = (e) => {
        e.preventDefault();
        currentFolderId = null;
        fetchFoldersAndFiles();
      };
      header.appendChild(backBtn);
    }

    const addFolderBtn = document.createElement("button");
    addFolderBtn.textContent = "New Folder";
    addFolderBtn.className = "add-btn";
    addFolderBtn.type = "button";
    addFolderBtn.onclick = async (e) => {
      e.preventDefault();
      await addFolder();
    };
    header.appendChild(addFolderBtn);

    const addFileBtn = document.createElement("button");
    addFileBtn.textContent = "Upload File";
    addFileBtn.className = "add-btn";
    addFileBtn.type = "button";
    addFileBtn.onclick = async (e) => {
      e.preventDefault();
      await addFile();
    };
    header.appendChild(addFileBtn);

    container.appendChild(header);

    const itemsDiv = document.createElement("div");
    itemsDiv.className = "repository-items";

    folders.forEach((folder) => {
      const itemDiv = createRepositoryItem(
        folder.name,
        "folder",
        () => {
          currentFolderId = folder.id;
          fetchFoldersAndFiles();
        },
        async () => {
          if (confirm(`Delete folder "${folder.name}"?`)) {
            await fetch(`${API_BASE}/folders/${folder.id}`, { method: "DELETE" });
            fetchFoldersAndFiles();
          }
        }
      );
      itemsDiv.appendChild(itemDiv);
    });

    files.forEach((file) => {
      const itemDiv = createRepositoryItem(
        file.file_name,
        "file",
        () => window.open(file.file_path, "_blank"),
        async () => {
          if (confirm(`Delete file "${file.file_name}"?`)) {
            await fetch(`${API_BASE}/files/${file.id}`, { method: "DELETE" });
            fetchFoldersAndFiles();
          }
        }
      );
      itemsDiv.appendChild(itemDiv);
    });

    container.appendChild(itemsDiv);
  }

  function createRepositoryItem(name, type, onClick, onDelete) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "repository-item";

    const icon = document.createElement("i");
    icon.className = type === "folder" ? "fa fa-folder" : "fa fa-file";
    itemDiv.appendChild(icon);

    const label = document.createElement("span");
    label.textContent = name;
    label.title = name;
    itemDiv.appendChild(label);

    itemDiv.addEventListener("click", (e) => {
      if (!e.target.classList.contains("dot-menu")) onClick();
    });

    const dots = document.createElement("div");
    dots.className = "dot-menu";
    dots.innerHTML = '<i class="fa fa-ellipsis-v"></i>';

    const menu = document.createElement("div");
    menu.className = "dropdown-menu hidden";
    menu.innerHTML = `<button class="delete-btn" type="button">Delete</button>`;

    dots.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      menu.classList.toggle("hidden");
    });

    menu.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete();
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

  fetchFoldersAndFiles();
});

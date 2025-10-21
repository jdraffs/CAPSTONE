document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("dashboardContent");
  let currentPath = [];
  const drive = {};

  function getCurrentFolder() {
    return currentPath.reduce((acc, key) => acc[key].children, drive);
  }

  function render() {
    container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "form-header";

    if (currentPath.length > 0) {
      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.className = "back-btn";
      backBtn.onclick = () => {
        currentPath.pop();
        render();
      };
      header.appendChild(backBtn);
    }

    const addFolderBtn = document.createElement("button");
    addFolderBtn.textContent = "New Folder";
    addFolderBtn.className = "add-btn";
    addFolderBtn.onclick = addFolder;
    header.appendChild(addFolderBtn);

    const addFileBtn = document.createElement("button");
    addFileBtn.textContent = "Upload File";
    addFileBtn.className = "add-btn";
    addFileBtn.onclick = addFile;
    header.appendChild(addFileBtn);

    container.appendChild(header);

    const itemsDiv = document.createElement("div");
    itemsDiv.className = "drive-items";

    const folder = currentPath.length ? getCurrentFolder() : drive;

    Object.keys(folder).forEach((name) => {
      const item = folder[name];
      const itemDiv = document.createElement("div");
      itemDiv.className = "drive-item";

      const icon = document.createElement("i");
      icon.className = item.type === "folder" ? "fa fa-folder" : "fa fa-file";
      itemDiv.appendChild(icon);

      const label = document.createElement("span");
      label.textContent = name;
      itemDiv.appendChild(label);

      // Open folder on click
      if (item.type === "folder") {
        itemDiv.addEventListener("click", (e) => {
          if (!e.target.classList.contains("dot-menu")) {
            currentPath.push(name);
            render();
          }
        });
      }

      // 3-dot menu
      const dots = document.createElement("div");
      dots.className = "dot-menu";
      dots.innerHTML = '<i class="fa fa-ellipsis-v"></i>';

      const menu = document.createElement("div");
      menu.className = "dropdown-menu hidden";
      menu.innerHTML = `
        <button class="rename-btn">Rename</button>
        <button class="delete-btn">Delete</button>
      `;

      dots.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("hidden");
      });

      menu.querySelector(".rename-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const newName = prompt("Rename to:", name);
        if (newName && newName !== name) {
          folder[newName] = folder[name];
          delete folder[name];
          render();
        }
      });

      menu.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        delete folder[name];
        render();
      });

      itemDiv.appendChild(dots);
      itemDiv.appendChild(menu);
      itemsDiv.appendChild(itemDiv);
    });

    container.appendChild(itemsDiv);
  }

  function addFolder() {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    const folder = currentPath.length ? getCurrentFolder() : drive;
    if (folder[folderName]) return alert("Folder already exists!");

    folder[folderName] = { type: "folder", children: {} };
    render();
  }

  function addFile() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const folder = currentPath.length ? getCurrentFolder() : drive;
      folder[file.name] = { type: "file", file: file };
      render();
    };
    fileInput.click();
  }

  render();
});

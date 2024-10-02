console.log("内容脚本开始加载");

let cardsVisible = false;
let bookmarkData = null;
let currentFolder = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("内容脚本收到消息:", request);
  if (request.action === "toggleCards") {
    console.log("准备切换卡片显示");
    if (request.bookmarks) {
      bookmarkData = request.bookmarks;
      console.log("收到的书签数据:", bookmarkData);
    } else {
      console.error("消息中没有包含书签数据");
    }
    toggleCards();
    sendResponse({status: "成功"});
  }
  return true;  // 保持消息通道开放
});

// ... 中间的代码保持不变 ...

function toggleCards() {
  const container = document.getElementById('bookmark-cards-container');
  if (cardsVisible) {
    container.style.display = 'none';
    cardsVisible = false;
  } else {
    if (!container) {
      createCardsContainer();
    }
    document.getElementById('bookmark-cards-container').style.display = 'block';
    if (bookmarkData && bookmarkData.length > 0) {
      console.log("显示书签数据");
      displayFolder(bookmarkData[0]);
    } else {
      console.error("未收到书签数据或数据为空");
      const errorMsg = document.createElement('div');
      errorMsg.textContent = "无法加载书签。请稍后重试。";
      document.getElementById('bookmark-cards-content').appendChild(errorMsg);
    }
    cardsVisible = true;
  }
}
function createBookmarkCard(bookmark) {
  const card = document.createElement('div');
  card.className = 'bookmark-card';
  
  const img = document.createElement('img');
  img.className = 'bookmark-icon';
  card.appendChild(img);
  
  const title = document.createElement('h3');
  title.textContent = bookmark.title;
  card.appendChild(title);
  
  if (bookmark.url) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      console.log("尝试打开URL:", bookmark.url);
      window.open(bookmark.url, '_blank');
    });
    card.style.cursor = 'pointer';
    
    // 使用 Google 的 favicon 服务，请求 128x128 的图标
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(bookmark.url).hostname)}&sz=128`;
    img.src = faviconUrl;
    img.onerror = function() {
      // 如果加载失败，使用随机图片作为后备
      img.src = `https://picsum.photos/128?random=${Math.random()}`;
    };
  } else {
    // 对于文件夹，使用更大的文件夹图标
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" fill="%234CAF50"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
    card.addEventListener('click', function(e) {
      e.preventDefault();
      displayFolder(bookmark);
    });
  }
  
  return card;
}



function findFolder(root, id) {
  if (root.id === id) return root;
  if (root.children) {
    for (let child of root.children) {
      const found = findFolder(child, id);
      if (found) return found;
    }
  }
  return null;
}


function createCardsContainer() {
  const container = document.createElement('div');
  container.id = 'bookmark-cards-container';
  
  // 增加容器的大小以容纳3×3的卡片
  container.style.width = '600px';  // 假设每个卡片宽度为200px
  container.style.height = '600px'; // 假设每个卡片高度为200px
  
  const content = document.createElement('div');
  content.id = 'bookmark-cards-content';
  content.style.display = 'grid';
  content.style.gridTemplateColumns = 'repeat(3, 1fr)'; // 创建3列
  content.style.gridGap = '10px'; // 设置卡片之间的间隔
  container.appendChild(content);
  
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'bookmark-cards-resize-handle';
  container.appendChild(resizeHandle);
  
  document.body.appendChild(container);
  
  const toggleButton = document.createElement('button');
  toggleButton.id = 'bookmark-cards-toggle';
  toggleButton.innerHTML = '卡片<br>书签';
  toggleButton.addEventListener('click', toggleCards);
  document.body.appendChild(toggleButton);

  // 添加拖动功能
  let isDragging = false;
  let startX, startY;

  toggleButton.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX - toggleButton.offsetLeft;
    startY = e.clientY - toggleButton.offsetTop;
    e.preventDefault(); // 防止文本被选中
  });

  document.addEventListener('mousemove', function(e) {
    if (isDragging) {
      let left = e.clientX - startX;
      let top = e.clientY - startY;
      
      // 确保按钮不会被拖出视口
      left = Math.max(0, Math.min(left, window.innerWidth - toggleButton.offsetWidth));
      top = Math.max(0, Math.min(top, window.innerHeight - toggleButton.offsetHeight));

      toggleButton.style.left = left + 'px';
      toggleButton.style.top = top + 'px';

      // 更新卡片容器的位置
      updateContainerPosition();
    }
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
  });

  // 添加调整大小的功能
  // ... 保持调整大小的代码不变 ...
}

function updateContainerPosition() {
  const toggleButton = document.getElementById('bookmark-cards-toggle');
  const container = document.getElementById('bookmark-cards-container');
  if (toggleButton && container) {
    const buttonRect = toggleButton.getBoundingClientRect();
    container.style.right = (window.innerWidth - buttonRect.right) + 'px';
    container.style.bottom = (window.innerHeight - buttonRect.top) + 'px';
  }
}


function displayFolder(folder) {
  const content = document.getElementById('bookmark-cards-content');
  content.innerHTML = '';
  
  // 创建返回按钮（如果需要）
  if (folder.id !== '0' && folder.parentId !== '0') {
    const backButton = document.createElement('div');
    backButton.className = 'bookmark-card back-button';
    backButton.innerHTML = '<h3>返回上一层</h3>';
    backButton.addEventListener('click', function() {
      if (folder.parentId === '0') {
        displayRootFolders();
      } else {
        const parentFolder = findFolder(bookmarkData[0], folder.parentId);
        displayFolder(parentFolder);
      }
    });
    content.appendChild(backButton);
  }
  
  // 将文件夹和书签分开
  const folders = [];
  const bookmarks = [];
  
  folder.children.forEach(child => {
    if (child.children) {
      folders.push(child);
    } else if (child.url) {
      bookmarks.push(child);
    }
  });
  
  // 先添加所有文件夹
  folders.forEach(childFolder => {
    content.appendChild(createBookmarkCard(childFolder));
  });
  
  // 再添加所有书签
  bookmarks.forEach(bookmark => {
    content.appendChild(createBookmarkCard(bookmark));
  });
  
  currentFolder = folder;
}

function displayRootFolders() {
  const content = document.getElementById('bookmark-cards-content');
  content.innerHTML = '';
  
  const folders = [];
  const bookmarks = [];
  
  function addSecondLevelItems(folder) {
    folder.children.forEach(child => {
      if (child.children) {  // 这是一个文件夹
        child.children.forEach(grandchild => {
          if (grandchild.children) {
            folders.push(grandchild);
          } else if (grandchild.url) {
            bookmarks.push(grandchild);
          }
        });
      }
    });
  }
  
  addSecondLevelItems(bookmarkData[0]);
  
  // 先添加所有文件夹
  folders.forEach(folder => {
    content.appendChild(createBookmarkCard(folder));
  });
  
  // 再添加所有书签
  bookmarks.forEach(bookmark => {
    content.appendChild(createBookmarkCard(bookmark));
  });
  
  currentFolder = null;
}

function toggleCards() {
  const container = document.getElementById('bookmark-cards-container');
  if (cardsVisible) {
    container.style.display = 'none';
    cardsVisible = false;
  } else {
    if (!container) {
      createCardsContainer();
    }
    updateContainerPosition();
    container.style.display = 'block';
    if (bookmarkData && bookmarkData.length > 0) {
      console.log("显示书签数据");
      displayRootFolders();  // 直接显示二级文件夹
    } else {
      console.error("未收到书签数据或数据为空");
      const errorMsg = document.createElement('div');
      errorMsg.textContent = "无法加载书签。请稍后重试。";
      document.getElementById('bookmark-cards-content').appendChild(errorMsg);
    }
    cardsVisible = true;
  }
}
// ... 现有代码 ...

// 假设这是获取书签数据的函数
function fetchBookmarks() {
  return fetch('/api/bookmarks')
    .then(response => {
      if (!response.ok) {
        throw new Error('网络响应不正常');
      }
      return response.json();
    })
    .then(data => {
      if (!data || data.length === 0) {
        console.error('收到的书签数据为空');
        throw new Error('书签数据为空');
      }
      return data;
    })
    .catch(error => {
      console.error('获取书签时出错:', error);
      throw error;
    });
}

// 使用该函数
fetchBookmarks()
  .then(bookmarks => {
    // 处理书签数据
    console.log('成功获取书签:', bookmarks);
  })
  .catch(error => {
    console.error('处理书签时出错:', error);
    // 在这里显示用户友好的错误消息
    showErrorMessage('无法加载书签。请稍后重试。');
  });

// ... 现有代码 ...

function findFolder(root, id) {
  if (root.id === id) return root;
  if (root.children) {
    for (let child of root.children) {
      const found = findFolder(child, id);
      if (found) return found;
    }
  }
  return null;
}

// ... 其他代码保持不变 ...


console.log("内容脚本加载完毕");

// 初始创建容器和按钮
createCardsContainer();
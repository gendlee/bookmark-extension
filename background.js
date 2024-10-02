console.log('Service Worker 已启动');

chrome.action.onClicked.addListener(function(tab) {
  console.log("扩展图标被点击，当前标签页ID:", tab.id);

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getFavicon") {
      chrome.tabs.query({url: request.url}, function(tabs) {
        if (tabs.length > 0 && tabs[0].favIconUrl) {
          sendResponse({favicon: tabs[0].favIconUrl});
        } else {
          sendResponse({favicon: null});
        }
      });
      return true;  // 保持消息通道开放
    }
  });
  
  
  chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
    console.log("获取到书签数据:", bookmarkTreeNodes);
    
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleCards",
      bookmarks: bookmarkTreeNodes
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("发送消息时出错:", chrome.runtime.lastError.message);
      } else {
        console.log("消息发送成功，响应:", response);
      }
    });
  });
});
document.addEventListener('DOMContentLoaded', function() {
    // DOM要素の取得
    const addItemForm = document.getElementById('addItemForm');
    const newItemInput = document.getElementById('newItemInput');
    const shoppingList = document.getElementById('shoppingList');
    const editModal = document.getElementById('editModal');
    const editItemInput = document.getElementById('editItemInput');
    const saveEditBtn = document.getElementById('saveEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const lastUpdatedElement = document.getElementById('lastUpdated');

    let currentEditItem = null;

    // 最終更新日時の更新関数
    function updateLastModified(timestamp) {
        const date = timestamp ? new Date(timestamp) : new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        lastUpdatedElement.textContent = date.toLocaleString('ja-JP', options);
    }

    // アイテムのHTML要素を生成する関数
    function createItemElement(item) {
        const listItem = document.createElement('div');
        listItem.className = 'list-item' + (item.is_completed ? ' completed' : '');
        listItem.dataset.id = item.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.is_completed;
        checkbox.addEventListener('change', toggleComplete);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '編集';
        editBtn.addEventListener('click', showEditModal);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '削除';
        deleteBtn.addEventListener('click', deleteItem);

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        listItem.appendChild(checkbox);
        listItem.appendChild(nameSpan);
        listItem.appendChild(actionsDiv);

        return listItem;
    }

    // アイテム一覧を取得して表示
    async function loadItems() {
        try {
            const response = await fetch('/api/items');
            const items = await response.json();
            
            shoppingList.innerHTML = '';
            items.forEach(item => {
                shoppingList.appendChild(createItemElement(item));
            });

            if (items.length > 0) {
                // 最も新しい更新日時を取得
                const latestUpdate = items.reduce((latest, item) => {
                    const itemDate = new Date(item.updated_at);
                    return itemDate > latest ? itemDate : latest;
                }, new Date(0));
                updateLastModified(latestUpdate);
            }
        } catch (error) {
            console.error('アイテムの取得に失敗しました:', error);
        }
    }

    // 商品名のバリデーション
    function validateItemName(name) {
        if (name.length > 100) {
            return {
                isValid: false,
                error: '商品名は100文字以内にしてください'
            };
        }

        // 許可する文字：日本語、英数字、スペース、カンマ、ピリオド、ハイフン
        const validCharsPattern = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\w\s,.-]*$/;
        if (!validCharsPattern.test(name)) {
            return {
                isValid: false,
                error: '商品名に使用できない文字が含まれています'
            };
        }

        return {
            isValid: true,
            error: ''
        };
    }

    // 新規アイテムの追加
    addItemForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const itemName = newItemInput.value.trim();
        if (itemName) {
            // フロントエンドでのバリデーション
            const validation = validateItemName(itemName);
            if (!validation.isValid) {
                alert(validation.error);
                return;
            }
            try {
                const response = await fetch('/api/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: itemName })
                });

                if (response.ok) {
                    const newItem = await response.json();
                    shoppingList.appendChild(createItemElement(newItem));
                    newItemInput.value = '';
                    updateLastModified(newItem.updated_at);
                } else {
                    const error = await response.json();
                    alert(error.error || 'アイテムの追加に失敗しました');
                }
            } catch (error) {
                console.error('アイテムの追加に失敗しました:', error);
                alert('アイテムの追加に失敗しました');
            }
        }
    });

    // 完了状態の切り替え
    async function toggleComplete(e) {
        const listItem = e.target.closest('.list-item');
        const itemId = listItem.dataset.id;

        try {
            const response = await fetch(`/api/items/${itemId}/toggle`, {
                method: 'PUT'
            });

            if (response.ok) {
                const updatedItem = await response.json();
                if (updatedItem.is_completed) {
                    listItem.classList.add('completed');
                } else {
                    listItem.classList.remove('completed');
                }
                updateLastModified(updatedItem.updated_at);
            } else {
                e.target.checked = !e.target.checked; // 状態を元に戻す
                alert('状態の更新に失敗しました');
            }
        } catch (error) {
            console.error('状態の更新に失敗しました:', error);
            e.target.checked = !e.target.checked; // 状態を元に戻す
            alert('状態の更新に失敗しました');
        }
    }

    // 編集モーダルの表示
    function showEditModal(e) {
        const listItem = e.target.closest('.list-item');
        const itemName = listItem.querySelector('.item-name').textContent;
        currentEditItem = listItem;
        editItemInput.value = itemName;
        editModal.style.display = 'block';
    }

    // 編集の保存
    saveEditBtn.addEventListener('click', async function() {
        const newName = editItemInput.value.trim();
        if (newName && currentEditItem) {
            // フロントエンドでのバリデーション
            const validation = validateItemName(newName);
            if (!validation.isValid) {
                alert(validation.error);
                return;
            }
            const itemId = currentEditItem.dataset.id;
            try {
                const response = await fetch(`/api/items/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: newName })
                });

                if (response.ok) {
                    const updatedItem = await response.json();
                    currentEditItem.querySelector('.item-name').textContent = updatedItem.name;
                    editModal.style.display = 'none';
                    currentEditItem = null;
                    updateLastModified(updatedItem.updated_at);
                } else {
                    const error = await response.json();
                    alert(error.error || '商品名の更新に失敗しました');
                }
            } catch (error) {
                console.error('商品名の更新に失敗しました:', error);
                alert('商品名の更新に失敗しました');
            }
        }
    });

    // 編集のキャンセル
    cancelEditBtn.addEventListener('click', function() {
        editModal.style.display = 'none';
        currentEditItem = null;
    });

    // アイテムの削除
    async function deleteItem(e) {
        if (confirm('本当にこの商品を削除しますか？')) {
            const listItem = e.target.closest('.list-item');
            const itemId = listItem.dataset.id;

            try {
                const response = await fetch(`/api/items/${itemId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    listItem.remove();
                    // 残りのアイテムから最新の更新日時を取得
                    loadItems(); // リストを再読み込みして最新の状態を反映
                } else {
                    alert('商品の削除に失敗しました');
                }
            } catch (error) {
                console.error('商品の削除に失敗しました:', error);
                alert('商品の削除に失敗しました');
            }
        }
    }

    // モーダルの外側をクリックして閉じる
    window.addEventListener('click', function(e) {
        if (e.target === editModal) {
            editModal.style.display = 'none';
            currentEditItem = null;
        }
    });

    // 初期表示時にアイテム一覧を読み込む
    loadItems();
});


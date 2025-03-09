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

    // 最終更新日時の更新関数
    function updateLastModified() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        lastUpdatedElement.textContent = now.toLocaleString('ja-JP', options);
    }

    // 初期表示時に最終更新日時を設定
    updateLastModified();
    
    let currentEditItem = null;

    // 新規アイテムの追加
    addItemForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const itemName = newItemInput.value.trim();
        if (itemName) {
            addNewItem(itemName);
            newItemInput.value = '';
            updateLastModified();
        }
    });

    // 新規アイテムをリストに追加する関数
    function addNewItem(itemName) {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', toggleComplete);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = itemName;

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

        shoppingList.appendChild(listItem);
    }

    // 完了状態の切り替え
    function toggleComplete(e) {
        const listItem = e.target.closest('.list-item');
        if (e.target.checked) {
            listItem.classList.add('completed');
        } else {
            listItem.classList.remove('completed');
        }
        updateLastModified();
    }

    // 既存のチェックボックスにイベントリスナーを追加
    document.querySelectorAll('.list-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', toggleComplete);
    });

    // 編集モーダルの表示
    function showEditModal(e) {
        const listItem = e.target.closest('.list-item');
        const itemName = listItem.querySelector('.item-name').textContent;
        currentEditItem = listItem;
        editItemInput.value = itemName;
        editModal.style.display = 'block';
    }

    // 既存の編集ボタンにイベントリスナーを追加
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', showEditModal);
    });

    // 編集の保存
    saveEditBtn.addEventListener('click', function() {
        const newName = editItemInput.value.trim();
        if (newName && currentEditItem) {
            currentEditItem.querySelector('.item-name').textContent = newName;
            editModal.style.display = 'none';
            currentEditItem = null;
            updateLastModified();
        }
    });

    // 編集のキャンセル
    cancelEditBtn.addEventListener('click', function() {
        editModal.style.display = 'none';
        currentEditItem = null;
    });

    // アイテムの削除
    function deleteItem(e) {
        if (confirm('本当にこの商品を削除しますか？')) {
            const listItem = e.target.closest('.list-item');
            listItem.remove();
            updateLastModified();
        }
    }

    // 既存の削除ボタンにイベントリスナーを追加
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteItem);
    });

    // モーダルの外側をクリックして閉じる
    window.addEventListener('click', function(e) {
        if (e.target === editModal) {
            editModal.style.display = 'none';
            currentEditItem = null;
        }
    });
});

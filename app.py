from flask import Flask, render_template, request, jsonify
from datetime import datetime
import sqlite3
import os
import logging

app = Flask(__name__)
app.logger.setLevel(logging.DEBUG)

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

# データベースの初期化
def init_db():
    try:
        app.logger.debug('Initializing database...')
        db_path = os.path.join(os.path.dirname(__file__), 'shopping_list.db')
        with sqlite3.connect(db_path) as conn:
            c = conn.cursor()
            c.execute('''
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    is_completed INTEGER DEFAULT 0,
                    display_order INTEGER,
                    created_at TIMESTAMP DEFAULT (DATETIME('now', 'localtime')),
                    updated_at TIMESTAMP DEFAULT (DATETIME('now', 'localtime'))
                )
            ''')
            conn.commit()
        app.logger.debug('Database initialized successfully')
        return db_path
    except Exception as e:
        app.logger.error(f'Error initializing database: {str(e)}')
        raise

# データベース接続のヘルパー関数
def get_db():
    db_path = os.path.join(os.path.dirname(__file__), 'shopping_list.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = dict_factory
    return conn

def query_db(query, args=(), one=False):
    try:
        db = get_db()
        cur = db.execute(query, args)
        rv = cur.fetchall()
        db.commit()
        return (dict(rv[0]) if rv else None) if one else [dict(x) for x in rv]
    finally:
        if db is not None:
            db.close()

# メインページ
@app.route('/')
def index():
    return render_template('index.html')

# 商品一覧取得API
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        items = query_db('SELECT * FROM items ORDER BY display_order, created_at DESC')
        app.logger.debug(f'Retrieved items: {items}')
        return jsonify(items)
    except Exception as e:
        app.logger.error(f'Error getting items: {str(e)}')
        return jsonify({'error': str(e)}), 500

import re

def validate_item_name(name):
    """商品名のバリデーション"""
    if len(name) > 100:
        return False, '商品名は100文字以内にしてください'
    
    # 許可する文字：日本語、英数字、スペース、カンマ、ピリオド、ハイフン
    if not re.match(r'^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\w\s,.-]*$', name):
        return False, '商品名に使用できない文字が含まれています'
    
    return True, ''

# 商品登録API
@app.route('/api/items', methods=['POST'])
def add_item():
    try:
        app.logger.debug(f'Received request data: {request.json}')
        if not request.json or 'name' not in request.json:
            return jsonify({'error': '商品名は必須です'}), 400
        
        name = request.json['name'].strip()
        if not name:
            return jsonify({'error': '商品名は空にできません'}), 400
            
        # 商品名のバリデーション
        is_valid, error_message = validate_item_name(name)
        if not is_valid:
            return jsonify({'error': error_message}), 400

        # 新しいdisplay_orderを取得
        next_order = query_db('SELECT COALESCE(MAX(display_order) + 1, 0) FROM items', one=True)['COALESCE(MAX(display_order) + 1, 0)']
        
        # アイテムを追加
        db = get_db()
        try:
            cursor = db.execute(
                'INSERT INTO items (name, display_order, created_at, updated_at) VALUES (?, ?, DATETIME("now", "localtime"), DATETIME("now", "localtime"))',
                (name, next_order)
            )
            db.commit()
            
            # 新しく追加したアイテムを取得
            new_item = query_db('SELECT * FROM items WHERE id = ?', [cursor.lastrowid], one=True)
            app.logger.debug(f'Created new item: {new_item}')
            
            return jsonify(new_item), 201
        finally:
            db.close()
    except Exception as e:
        app.logger.error(f'Error adding item: {str(e)}')
        return jsonify({'error': str(e)}), 500

# 商品更新API
@app.route('/api/items/<int:id>', methods=['PUT'])
def update_item(id):
    if not request.json:
        return jsonify({'error': '更新データが必要です'}), 400

    db = get_db()
    if 'name' in request.json:
        name = request.json['name'].strip()
        if not name:
            return jsonify({'error': '商品名は空にできません'}), 400
            
        # 商品名のバリデーション
        is_valid, error_message = validate_item_name(name)
        if not is_valid:
            return jsonify({'error': error_message}), 400
            
        db.execute('UPDATE items SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, id])
    
    db.commit()
    item = dict(db.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone())
    db.close()
    
    return jsonify(item)

# 商品削除API
@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    db = get_db()
    db.execute('DELETE FROM items WHERE id = ?', [id])
    db.commit()
    db.close()
    return '', 204

# 購入状態切り替えAPI
@app.route('/api/items/<int:id>/toggle', methods=['PUT'])
def toggle_item(id):
    db = get_db()
    db.execute('''
        UPDATE items 
        SET is_completed = CASE WHEN is_completed = 0 THEN 1 ELSE 0 END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', [id])
    db.commit()
    item = dict(db.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone())
    db.close()
    return jsonify(item)

if __name__ == '__main__':
    try:
        # データベースの初期化
        db_path = init_db()
        app.logger.debug(f'Using database at: {db_path}')
        
        # アプリケーションの起動
        app.run(debug=True, port=8000)
    except Exception as e:
        app.logger.error(f'Application startup failed: {str(e)}')

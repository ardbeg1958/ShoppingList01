# 買い物リストアプリケーション プログラムガイド

## 1. プログラム構成概要

このアプリケーションは、FlaskフレームワークとSQLiteデータベースを使用したRESTful APIサーバーです。
主な技術スタックは以下の通りです：

- バックエンド: Flask (Python)
- データベース: SQLite3
- フロントエンド: HTML/CSS/JavaScript

## 2. Flaskアプリケーションの基本構造

### 2.1 アプリケーションの初期化
```python
from flask import Flask
app = Flask(__name__)
```
- `Flask`クラスのインスタンスを作成し、これがアプリケーションの中心となります
- `__name__`は現在のPythonモジュール名を表す特殊変数です

### 2.2 ルーティング
Flaskではデコレータを使用してURLルートを定義します：
```python
@app.route('/api/items', methods=['GET'])
def get_items():
    # 処理内容
```
- `@app.route`デコレータで、URLパスとHTTPメソッドを指定します
- その下の関数が、そのエンドポイントのハンドラとなります

## 3. データベース操作

### 3.1 データベース接続
```python
def get_db():
    db_path = os.path.join(os.path.dirname(__file__), 'shopping_list.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = dict_factory
    return conn
```
- SQLiteデータベースへの接続を確立します
- `dict_factory`を使用して、クエリ結果を辞書形式で取得できるようにしています

### 3.2 クエリ実行ヘルパー
```python
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
```
- SQL実行を簡略化するヘルパー関数です
- データベース接続の自動クローズを保証します
- `one=True`の場合、単一の結果を返します

## 4. APIエンドポイント

### 4.1 商品一覧取得 (GET /api/items)
```python
@app.route('/api/items', methods=['GET'])
def get_items():
    items = query_db('SELECT * FROM items ORDER BY display_order, created_at DESC')
    return jsonify(items)
```
- 登録されている全商品を取得します
- `display_order`と`created_at`でソートします

### 4.2 商品登録 (POST /api/items)
```python
@app.route('/api/items', methods=['POST'])
def add_item():
    name = request.json['name'].strip()
    # バリデーション
    is_valid, error_message = validate_item_name(name)
    if not is_valid:
        return jsonify({'error': error_message}), 400
    # データベースに保存
    ...
```
- リクエストボディから商品名を取得します
- バリデーションを実行し、問題があれば400エラーを返します
- 正常な場合、データベースに保存して201レスポンスを返します

### 4.3 商品更新 (PUT /api/items/<id>)
```python
@app.route('/api/items/<int:id>', methods=['PUT'])
def update_item(id):
    # 商品名の更新処理
```
- URLパラメータから商品IDを取得します
- 商品名のバリデーションを実行します
- データベースの商品情報を更新します

### 4.4 購入状態切り替え (PUT /api/items/<id>/toggle)
```python
@app.route('/api/items/<int:id>/toggle', methods=['PUT'])
def toggle_item(id):
    # 購入状態の切り替え処理
```
- 商品の購入状態（is_completed）を切り替えます
- 更新日時も自動的に更新されます

## 5. バリデーション

### 5.1 商品名のバリデーション
```python
def validate_item_name(name):
    if len(name) > 100:
        return False, '商品名は100文字以内にしてください'
    
    if not re.match(r'^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\w\s,.-]*$', name):
        return False, '商品名に使用できない文字が含まれています'
    
    return True, ''
```
- 文字数制限（100文字以内）
- 使用可能文字のチェック（日本語、英数字、特定の記号）

## 6. エラーハンドリング

各APIエンドポイントでは、try-except文を使用して適切なエラーハンドリングを実装しています：
```python
try:
    # 処理内容
except Exception as e:
    app.logger.error(f'Error: {str(e)}')
    return jsonify({'error': str(e)}), 500
```
- エラー発生時は500エラーとエラーメッセージを返します
- ログにエラー内容を記録します

## 7. アプリケーションの起動

```python
if __name__ == '__main__':
    db_path = init_db()  # データベースの初期化
    app.run(debug=True, port=8000)  # 開発サーバーの起動
```
- macOSではAirPlayとの競合を避けるため、ポート8000を使用します
- デバッグモードが有効な状態で起動します

## 8. 開発のヒント

1. **ルートの追加**
   - 新しいエンドポイントを追加する場合は、`@app.route`デコレータで定義します
   - HTTPメソッドを適切に指定します

2. **データベース操作**
   - `query_db`関数を使用してSQLを実行します
   - パラメータはタプルまたはリストで渡します

3. **エラーハンドリング**
   - 適切なHTTPステータスコードを返します
   - エラーメッセージは具体的に記述します

4. **バリデーション**
   - 入力値は必ずバリデーションを行います
   - フロントエンドとバックエンドの両方でチェックします

## 9. デバッグとトラブルシューティング

### 9.1 ログの確認
```python
app.logger.debug('デバッグメッセージ')
app.logger.error('エラーメッセージ')
```
- アプリケーションの動作状況はログで確認できます
- エラー発生時はログを確認することで原因特定が容易になります

### 9.2 一般的なエラーと対処法
1. データベース接続エラー
   - データベースファイルの存在確認
   - アクセス権限の確認

2. バリデーションエラー
   - リクエストデータの形式確認
   - 文字列の長さや使用文字のチェック

3. 500エラー
   - サーバーログの確認
   - デバッグモードでの実行

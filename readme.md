# tracking-annotation
深層学習などを用いたトラッキングによって，動画から取得できる画像へのアノテーションを補助する．

## setup
### SiamMaskのsetup
- backends/に行き．[こちら](https://github.com/foolwood/SiamMask#environment-setup)に従う

### tracking-annotationのsetup
```
pip install -r requirements.txt
```
アプリケーションの起動
```
python app.py
```

## 対応しているトラッキング方法
- [SiamMask](https://github.com/foolwood/SiamMask)

## 使い方
<img src="https://dl.dropboxusercontent.com/s/kpzubae18doglle/simple_use.gif">

- 使い方は[こちら](https://github.com/deepgreenAN/tracking_annotation/wiki)
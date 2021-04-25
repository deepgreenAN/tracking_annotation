# tracking-annotation
深層学習などを用いたトラッキングによって，動画から取得できる画像へのアノテーションを補助する．
GPU環境がおすすめ
## setup

```
pipenv install
```
あるいは
```
pip install -r requirements.txt
```

### SiamMaskのsetup
visualstudioが必要
```
cd backends/SiamMask
cd utils/pyvotkit
python setup.py build_ext --inplace
cd ../../
cd utils/pysot/utils/
python setup.py build_ext --inplace
```

## アプリケーションの起動
```
python app.py
```

## 対応しているトラッキング方法
- [SiamMask](https://github.com/foolwood/SiamMask)

## 使い方
<img src="https://dl.dropboxusercontent.com/s/kpzubae18doglle/simple_use.gif">

- 使い方は[こちら](https://github.com/deepgreenAN/tracking_annotation/wiki)
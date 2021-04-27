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
cd backends
git clone https://github.com/foolwood/SiamMask.git
cd SiamMask
cd utils/pyvotkit
python setup.py build_ext --inplace
cd ../../
cd utils/pysot/utils/
python setup.py build_ext --inplace
```

### SiamMaskの重みファイルのダウンロード
- `backends/SiamMask/experiments/siammask_sharp`にこの[リンク](http://www.robots.ox.ac.uk/~qwang/SiamMask_DAVIS.pth)の重みファイルをダウンロード
### pysotのsetup
visualstudioが必要
```
cd backends
git clone https://github.com/STVIR/pysot.git
cd pysot
python setup.py build_ext --inplace
```
### pysotの重みファイルのダウンロード
- `backends/pysot/experiments/siamrpn_alex_dwxcorr`にこの[リンク](https://drive.google.com/file/d/1e51IL1UZ-5seum2yUYpf98l2lJGUTnhs/view?usp=sharing)の重みファイルをダウンロード
- `backends/pysot/experiments/siamrpn_mobilev2_l234_dwxcorr`にこの[リンク](https://drive.google.com/file/d/1lPiRjFvajwrhOHVuXrygAj2cRb2BFFfz/view?usp=sharing)の重みファイルをダウンロード
- `backends/pysot/experiments/siammask_r50_l3`にこの[リンク](https://drive.google.com/file/d/1dQoI2o5Bzfn_IhNJNgcX4OE79BIHwr8s/view?usp=sharing)の重みファイルをダウンロード
## アプリケーションの起動
```
python app.py
```

## 対応しているトラッキング方法
- [SiamMask](https://github.com/foolwood/SiamMask)
- SiamRPN([pysot](https://github.com/STVIR/pysot))
- SiamMask([pysot](https://github.com/STVIR/pysot))
- KCF(opencv)
- CSRT(opencv)

## 使い方
<img src="https://dl.dropboxusercontent.com/s/kpzubae18doglle/simple_use.gif">

- 使い方は[こちら](https://github.com/deepgreenAN/tracking_annotation/wiki)
- カスタムトラッカーは[こちら](https://github.com/deepgreenAN/tracking_annotation/wiki/CustomTracker)
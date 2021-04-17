from pathlib import Path
import cv2
import numpy as np
import shutil

import h5py


class MovieImageArray:
    """
    動画をhdf5に保存することで，メモリを節約しつつ画像のリストとしてアクセス可能とした．
    ストレージを利用するので注意．
    """
    def __init__(self, movie_path, is_temp=False, temp_dir=Path("")):
        """
        movie_path: pathlib.Path or str
            読み込みたい動画のパス
        is_temp:　bool
            保存データをcloseと同時に破棄するかどうか
        temp_dir:　pathlib.Path or str
            保存データを置くディレクトリ
        """
        if movie_path is not None:
            self.movie_path = Path(movie_path)
            movie_name = self.movie_path.stem
        else:
            self.movie_path = None
            movie_name = ""
        self.is_temp = is_temp
        
        
        self.hdf5_path = Path(temp_dir)/Path("hdf5_" + movie_name+ ".hdf5")
        
    def read_movie(self, is_update=False):
        """
        動画データの読み込み
        is_update: bool
            すでに保存データが存在する場合にデータを更新するかとうか．
        """
        if self.movie_path is None:
            raise Exception("movie path is not setted")
            
        if self.hdf5_path.exists() and not is_update:  # ファイルが存在しており，アップデートしない場合
            self.f = h5py.File(self.hdf5_path, "r")
            self.dataset = self.f["/movie/movie_dataset"]
            return None
            
        cap = cv2.VideoCapture(str(self.movie_path))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_num = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))        
        
        self.f = h5py.File(self.hdf5_path, "w")
        group = self.f.create_group("/movie")
        self.dataset = group.create_dataset(name="movie_dataset",
                                            shape=(frame_num, h, w, 3),
                                            dtype=np.uint8
                                           )
        self.dataset.attrs["length"] = frame_num
        
        for i in range(frame_num):
            ret, frame = cap.read()
            if frame is not None:
                self.dataset[i] = frame

        cap.release()
    
    @classmethod
    def from_file(cls, hdf5_path, is_temp=False):
        """
        hdf5_path: pathlib.Path or str
            保存データのパス
        is_temp:
            保存データをcloseと同時に破棄するかどうか
        """
        instance = cls(None, is_temp)
        instance.hdf5_path = hdf5_path
        instance.f = h5py.File(instance.hdf5_path, "r")
        instance.dataset = instance.f["/movie/movie_dataset"]
        return instance
    
    def close(self):
        if hasattr(self, "f"):
            self.f.close()
        if self.is_temp:
            if self.hdf5_path.exists():
                self.hdf5_path.unlink()
                    
    def __del__(self):
        self.close()
            
    def __len__(self):
        return self.dataset.attrs["length"]
    
    def __getitem__(self, i):
        if i >= len(self):
            raise IndexError("index out of range")
        
        return self.dataset[i]
    
    def __iter__(self):
        def inner_gen():
            for i in range(len(self)):
                yield self[i]
        yield from inner_gen()
        
    @property
    def saved_path(self):
        return self.hdf5_path


class MovieImageArrayFile:
    """
    MovieImageArrayと同じインターフェースで，生画像を保存する．
    ストレージを利用するので注意．
    """
    def __init__(self, movie_path, is_temp=False, temp_dir=Path("")):
        """
        movie_path: pathlib.Path or str
            読み込みたい動画のパス
        is_temp:　bool
            保存データをcloseと同時に破棄するかどうか
        temp_dir:　pathlib.Path or str
            保存データを置くディレクトリ
        """
        if movie_path is not None:
            self.movie_path = Path(movie_path)
            movie_name = self.movie_path.stem
        else:
            self.movie_path = None
            movie_name = ""
            
        self.is_temp = is_temp
        self.dir_path = Path(temp_dir)/Path("images_"+movie_name)
        self.image_name_base = "image"
        self.image_paths = []
        
    def read_movie(self, is_update=False):
        """
        動画データの読み込み
        is_update: bool
            すでに保存データが存在する場合にデータを更新するかとうか．
        """
        if self.movie_path is None:
            raise Exception("movie path is not setted")
            
        if self.dir_path.exists() and not is_update:  # ディレクトリが存在しており，アップデートしない場合
            self._read_from_dir()
            return None
        elif self.dir_path.exists() and is_update:  # ディレクトリが存在しており，アップデートする場合
            shutil.rmtree(self.dir_path)
            self.dir_path.mkdir()
        elif not self.dir_path.exists():  # ディレクトリが存在しない場合
            self.dir_path.mkdir()

        cap = cv2.VideoCapture(str(self.movie_path))
        frame_num = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        counter = 0
        for i in range(frame_num):
            ret, frame = cap.read()
            if frame is not None:
                image_path = self.dir_path / Path(self.image_name_base+"_{}.png".format(counter))
                cv2.imwrite(str(image_path), frame)
                counter += 1        
        
        cap.release()
        self._read_from_dir()
    
    def _read_from_dir(self):
        """
        ディレクトリの読み込み
        """
        image_paths = []
        for one_image_path in self.dir_path.glob("*.png"):
            image_paths.append(one_image_path)
        self.image_paths = image_paths
    
    @classmethod
    def from_file(cls, dir_path, is_temp=False):
        """
        dir_path: pathlib.Path or str
            保存データのパス
        is_temp:
            保存データをcloseと同時に破棄するかどうか
        """
        instance = cls(None, is_temp)
        instance.dir_path = dir_path
        instance._read_from_dir()
        return instance
    
    def close(self):
        if self.is_temp:
            if self.dir_path.exists():
                shutil.rmtree(self.dir_path)
                    
    def __del__(self):
        self.close()
            
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, i):
        image_path = self.image_paths[i]
        image = cv2.imread(str(image_path))
        return image
        
    def __iter__(self):
        def inner_gen():
            for i in range(len(self)):
                yield self[i]
        yield from inner_gen()
        
    @property
    def saved_path(self):
        return self.dir_path
        

class MovieImageArrayRaw:
    """
    MovieImageArrayと同じインターフェースでメモリに展開．
    速度は早い．
    """
    def __init__(self, movie_path, *args, **kwargs):
        """
        movie_path: pathlib.Path or str
            読み込みたい動画のパス
        """
        if movie_path is not None:
            self.movie_path = Path(movie_path)
        else:
            self.movie_path = None
        self.images = []
        
    def read_movie(self, *args, **kwargs):
        """
        動画データの読み込み
        """
        if self.movie_path is None:
            raise Exception("movie path is not setted")
            
        cap = cv2.VideoCapture(str(self.movie_path))
        frame_num = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        images_list = []
        for i in range(frame_num):
            ret, frame = cap.read()
            if frame is not None:
                images_list.append(frame)
        
        cap.release()
        self.images = images_list
    
    def close(self):
        pass
    
    def __del__(self):
        self.close()
            
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, i):
        image = self.images[i]
        return image
        
    def __iter__(self):
        def inner_gen():
            for i in range(len(self)):
                yield self[i]
        yield from inner_gen()


if __name__ == "__main__":
    pass
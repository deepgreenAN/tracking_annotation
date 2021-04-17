import unittest
from pathlib import Path
import time

from image_array import MovieImageArray, MovieImageArrayFile, MovieImageArrayRaw


class TestMovieImageArray(unittest.TestCase):
    def setUp(self):
        self.test_path = Path("tests")
        self.test_path_contensts = set(list(self.test_path.iterdir()))
        
    def tearDown(self):
        # ファイルの構造が変わってないか確認．
        end_test_path_contents = set(list(self.test_path.iterdir()))
        self.assertEqual(end_test_path_contents, self.test_path_contensts)
        
    def test_movie_image_array(self):
        image_array1 = MovieImageArray("tests/mini_movie.mp4", is_temp=False, temp_dir=Path("tests"))  # 保存データは破棄されない
        image_array1.read_movie(is_update=True)
        
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array1:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)
        
        image_array1.close()
        
        image_array2 = MovieImageArray.from_file(image_array1.saved_path, is_temp=True)  # 保存データが破棄される
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array2:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)

        image_array2.close()
        time.sleep(3)  # ファイル削除のラグを考慮
        
    def test_movie_image_array_temp(self):
        image_array1 = MovieImageArray("tests/mini_movie.mp4", is_temp=True, temp_dir=Path("tests"))  # 保存データは破棄される
        image_array1.read_movie(is_update=True)
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array1:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)
        
        image_array1.close()
        time.sleep(3)  # ファイル削除のラグを考慮
        
    def test_movie_image_array_file(self):
        image_array1 = MovieImageArrayFile("tests/mini_movie.mp4", is_temp=False, temp_dir=Path("tests"))  # 保存データは破棄されない
        image_array1.read_movie(is_update=True)
        
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array1:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)
        
        image_array1.close()
        
        image_array2 = MovieImageArrayFile.from_file(image_array1.saved_path, is_temp=True)  # 保存データが破棄される
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array2:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)

        image_array2.close()
        time.sleep(3)  # ファイル削除のラグを考慮
        
    def test_movie_image_array_file_temp(self):
        image_array1 = MovieImageArrayFile("tests/mini_movie.mp4", is_temp=True, temp_dir=Path("tests"))  # 保存データは破棄される
        image_array1.read_movie(is_update=True)
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array1:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)
        
        image_array1.close()
        time.sleep(3)  # ファイル削除のラグを考慮
        
    def test_movie_image_array_raw(self):
        image_array1 = MovieImageArrayRaw("tests/mini_movie.mp4", is_temp=True, temp_dir=Path("tests"))  # 保存データは破棄される
        image_array1.read_movie()
        #image_arrayから所得できるものか3階テンソルであり，最後の次数が3
        for image in image_array1:
            self.assertEqual(len(image.shape), 3)
            self.assertEqual(image.shape[-1], 3)
        
        image_array1.close()     


if __name__ == "__main__":
    unittest.main()  
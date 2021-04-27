from pathlib import Path
import cv2
import numpy as np
from tqdm import tqdm

from image_array import MovieImageArrayFile
from tracker_factory import tracker_symbols, factory

movie_path = Path("sample_movie/sample_movie_1.mp4")
temp_path = Path("temp")
image_array = MovieImageArrayFile(movie_path, is_temp=False, temp_dir=temp_path)

image_array.read_movie(is_update=False)

for tracker_symbol in tracker_symbols:
    tracker = factory(tracker_symbol)
    # 初期矩形をset
    x1 = 300
    y1 = 200
    x2 = 500
    y2 = 360

    xyxy_dict = {"x1":x1, "y1":y1, "x2":x2, "y2":y2}
    tracker.set_bbox(image_array[0], xyxy_dict)
    
    # 書き出す動画の設定
    width = image_array[0].shape[1]
    height = image_array[0].shape[0]
    video_path = Path("temp") / Path(tracker_symbol+".mp4")
    fourcc = cv2.VideoWriter_fourcc('m', 'p', '4', 'v')
    out = cv2.VideoWriter(str(video_path), fourcc, 30, (width, height))
    
    # 動画の書き出し
    for i, image in enumerate(tqdm(image_array)):
        if i > 0:
            out_dict = tracker.get_bbox(image)
            
            #矩形の描画
            if out_dict["bbox_dict"] is not None:
                x1,y1 = out_dict["bbox_dict"]["x1"], out_dict["bbox_dict"]["y1"]
                x2,y2 = out_dict["bbox_dict"]["x2"], out_dict["bbox_dict"]["y2"]
                image = cv2.rectangle(image, (x1,y1), (x2,y2), color=(0,0,0))
                
            #ポリゴンの描画
            if out_dict["polygon"] is not None:
                polygon_array = [[one_point["x"], one_point["y"]] for one_point in out_dict["polygon"]]
                image = cv2.fillConvexPoly(image, points=np.array(polygon_array), color=(0,0,0))
                
        out.write(image)
    out.release()
    print("finished",tracker_symbol)
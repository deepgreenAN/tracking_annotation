from flask import Flask, render_template, make_response, request, redirect, url_for, send_from_directory
from flask import Response, jsonify
from pathlib import Path
import shutil
import json
import cv2
from image_array import MovieImageArrayFile
from trackers import SiameseMaskTracker


app = Flask(__name__)

class Config:
    def __init__(self):
        self.image_array = []
        self.tracker = SiameseMaskTracker()
        self.output_images_dir_path = None
        self.output_json_path = None
        self.static_images_path = None
        self.movie_name = None
        self.movie_height = None
        self.movie_width = None
        self.image_name_list = []
        self.path_read_success = False

config = Config()

@app.route('/')
def index():
    app.logger.debug("this is root")
    return render_template('index.html')

@app.route('/pathsubmit', methods=['POST'])
def upload_movie():
    app.logger.debug(request.json["input_movie_path"])
    app.logger.debug(request.json["input_json_path"])
    app.logger.debug(request.json["output_images_path"])
    app.logger.debug(request.json["output_json_path"])

    is_success = True

    input_movie_path = Path(request.json["input_movie_path"])
    config.movie_name = input_movie_path.stem
    input_json_path = Path(request.json["input_json_path"])
    output_images_dir_parent_path = Path(request.json["output_images_path"])
    config.output_images_dir_path = output_images_dir_parent_path / Path("images_"+config.movie_name)
    config.output_json_path = Path(request.json["output_json_path"])

    if input_movie_path.suffix in [".mp4"] and input_movie_path.exists():
        cap = cv2.VideoCapture(str(input_movie_path))
        config.movie_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        config.movie_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        config.image_array = MovieImageArrayFile(input_movie_path, is_temp=True, temp_dir=Path("static"))
        config.image_array.read_movie(is_update=False)
    else:
        app.logger.debug("1"+str(input_movie_path.suffix in [".mp4"] ))
        app.logger.debug("2"+str(input_movie_path.exists()))
        is_success = False
    
    if not output_images_dir_parent_path.exists() or not config.output_json_path.parent.exists() or config.output_json_path.suffix != ".json":
        app.logger.debug("3"+str(not output_images_dir_parent_path.exists()))
        app.logger.debug("4"+str(not config.output_json_path.parent.exists()))
        app.logger.debug("5"+str(config.output_json_path.suffix != ".json"))
        is_success = False

    image_path_list = []
    image_name_list = []
    config.static_images_path = Path("static") / Path("images_"+config.movie_name)
    for image_path in config.static_images_path.iterdir():
        image_path_list.append(str(image_path))
        image_name_list.append(str(image_path.name))
    
    config.image_name_list = image_name_list
    if is_success:
        config.path_read_success = True

    return jsonify({"image_path_list":image_path_list, "is_success":is_success})


@app.route("/postbbox", methods=["POST"])
def send_bbox():
    bbox_xyxy = request.json["bbox_xyxy"]
    app.logger.debug("bbox_xyxy:"+str(bbox_xyxy))
    is_continue = request.json["is_continue"]
    app.logger.debug("is_continue:"+str(is_continue))
    frame_number = int(request.json["frame"])
    app.logger.debug("frame_number:"+str(frame_number))

    if config.path_read_success:  # ファイルの読み込みに成功している場合
        if not is_continue:
            config.tracker.set_bbox(config.image_array[frame_number], bbox_xyxy)
            out_dict = config.tracker.get_bbox(config.image_array[frame_number+1], with_polygon=True)
        else:
            out_dict = config.tracker.get_bbox(config.image_array[frame_number+1], with_polygon=True)
    else:
        next_bbox_xyxy = [0,0,0,0]
        next_polygon_list = [[0,0]]


    next_bbox_xyxy = out_dict["bbox_xyxy"]
    next_polygon_list = out_dict["polygon"].tolist()  # ndarrayなので

    next_json = jsonify({"bbox_xyxy":next_bbox_xyxy, "polygon":next_polygon_list})
    return next_json
    

@app.route("/savealldata", methods=["POST"])
def save_all_dict():
    if not config.path_read_success:
        return jsonify({"is_success":False})

    if not config.output_images_dir_path.exists():
        shutil.copytree(config.static_images_path, config.output_images_dir_path)
    
    all_data_json = request.json
    # jsonの成形
    out_json_dict = []
    for frame_key in all_data_json:
        one_frame_dict = {}
        frame_number = int(frame_key.split("_")[1])
        image_id = config.movie_name + str(frame_number)
        image_path = config.output_images_dir_path / config.image_name_list[frame_number]

        one_frame_dict["file_name"] = str(image_path)
        one_frame_dict["height"] = config.movie_height
        one_frame_dict["width"] = config.movie_width
        one_frame_dict["image_id"] = image_id
        annotations_list = []
        for object_key in all_data_json[frame_key]:
            one_object_dict = {}
            one_object_dict["bbox"] = [
                all_data_json[frame_key][object_key]["pos"]["x1"],
                all_data_json[frame_key][object_key]["pos"]["y1"],
                all_data_json[frame_key][object_key]["pos"]["x2"],
                all_data_json[frame_key][object_key]["pos"]["y2"],
            ]
            one_object_dict["bbox_mode"] = 0  # xyxy_abs
            one_object_dict["category_id"] = all_data_json[frame_key][object_key]["label"]
            one_object_dict["state_id"] = all_data_json[frame_key][object_key]["state"]
            annotations_list.append(one_object_dict)
        
        one_frame_dict["annotations"] = annotations_list
        
        out_json_dict.append(one_frame_dict)

    with open(config.output_json_path, "w") as f:
        json.dump(out_json_dict, f, indent=4)
    
    return jsonify({"is_success":True})

@app.route("/removecash", methods=["POST"])
def remove_cash():
    config.image_array.close()
    config.path_read_success = False
    #return jsonify({})
    return Response()

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(Path(app.root_path) /Path('static'), 'favicon.png')


if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=5000)